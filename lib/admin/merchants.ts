import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import {
  AliasSchema,
  CbuSchema,
  MerchantSlugSchema,
  RESERVED_SLUGS,
  classifyPayoutDestination,
} from "@/lib/admin/ar-bank-id";
import { LightningAddressSchema } from "@/lib/schemas/primitives";
import { writeAuditLog } from "./audit";

/**
 * Merchant row helpers (ADR 0012). One row per professor on the
 * marketplace, keyed by their Nostr pubkey.
 *
 * Conventions:
 *
 *   - Reads accept either a pubkey or a slug; writes always go
 *     through the row id so the caller has already proven they
 *     are talking about a specific row.
 *   - The CBU/alias re-sign machinery from ADR 0008 lives at
 *     `lib/admin/sign-settings-payload.ts` and stays in place;
 *     the route consumers wire it through with the merchant id
 *     instead of the singleton settings row.
 *   - Audit-log writes carry `merchant_id` from this layer up so
 *     the platform-admin moderation surface can filter the log
 *     by merchant.
 */

export type Merchant = typeof merchants.$inferSelect;

export const ClaimMerchantSchema = z.object({
  slug: MerchantSlugSchema,
  display_name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).nullable().optional(),
  // Payout fields are optional at claim time — the merchant fills
  // them in from the profile page before their first sale. The
  // application layer rejects checkouts on offerings whose merchant
  // has neither.
  alias: AliasSchema.nullable().optional(),
  cbu: CbuSchema.nullable().optional(),
});

export type ClaimMerchantInput = z.infer<typeof ClaimMerchantSchema>;

export const UpdateMerchantProfileSchema = z
  .object({
    display_name: z.string().trim().min(2).max(80),
    bio: z.string().trim().max(500).nullable(),
    avatar_url: z.string().trim().url().nullable(),
    alias: AliasSchema.nullable(),
    cbu: CbuSchema.nullable(),
    lightning_address: LightningAddressSchema.nullable(),
    payout_method: z.enum(["cbu_alias", "lightning_address"]),
    features_autorenewal: z.boolean(),
  })
  .partial();

export type UpdateMerchantProfileInput = z.infer<
  typeof UpdateMerchantProfileSchema
>;

export async function getMerchantByPubkey(
  pubkey: string
): Promise<Merchant | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.pubkey, pubkey))
    .limit(1);
  return row ?? null;
}

export async function getMerchantBySlug(
  slug: string
): Promise<Merchant | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getMerchantById(id: string): Promise<Merchant | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, id))
    .limit(1);
  return row ?? null;
}

export async function listActiveMerchants(): Promise<Merchant[]> {
  const db = getDb();
  return db.select().from(merchants).where(eq(merchants.active, true));
}

/**
 * Slugify a free-form display name into something matching
 * MERCHANT_SLUG_REGEX. Lowercase, ASCII-only, hyphens between word
 * boundaries, max 40 chars, no leading/trailing hyphens. Returns
 * null when the input does not produce at least 3 valid characters
 * or matches a reserved route slug — caller falls back to the
 * pubkey-derived placeholder.
 */
export function slugifyDisplayName(name: string): string | null {
  const slug = name
    .normalize("NFKD")
    // Strip combining diacritical marks (U+0300–U+036F) so accented
    // chars decompose to their base letter (`é` → `e`, `ñ` → `n`).
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  if (slug.length < 3) return null;
  if (RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

export interface InitialMerchantProfile {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

/**
 * Return the merchant row keyed to `pubkey`, creating it lazily if
 * it does not exist (ADR 0014). Per ADR 0015, the row is seeded
 * from the user's Nostr kind:0 metadata at sign-in time when
 * available; subsequent calls without `initial` are pure reads + a
 * placeholder fallback for legacy or relay-failed cases.
 *
 * Cursá's marketplace model is "any signed-in Nostr user can sell".
 * The merchant row is data, not a gate — any surface that needs it
 * (the user's courses, settings, orders) can call this and trust
 * that a row will be there.
 */
export async function ensureMerchantForPubkey(
  pubkey: string,
  initial?: InitialMerchantProfile
): Promise<Merchant> {
  const existing = await getMerchantByPubkey(pubkey);
  if (existing) return existing;

  const db = getDb();
  const placeholderSlug = `user-${pubkey.slice(0, 8).toLowerCase()}`;
  const namedSlug =
    initial?.display_name && slugifyDisplayName(initial.display_name);
  // Try the named slug first; fall back to the pubkey-derived
  // placeholder if it's missing/reserved/already taken.
  const candidates = [namedSlug, placeholderSlug].filter(
    (s): s is string => typeof s === "string"
  );
  const displayName =
    initial?.display_name?.trim() || placeholderSlug;

  // Retry on slug collision. The pubkey-prefixed candidate is
  // astronomically unlikely to collide; the named slug can if two
  // users share a display name. Final fallback uses a short random
  // suffix.
  const attempts = [
    ...candidates,
    `${placeholderSlug}-${Math.random().toString(36).slice(2, 6)}`,
    `${placeholderSlug}-${Math.random().toString(36).slice(2, 6)}`,
    `${placeholderSlug}-${Math.random().toString(36).slice(2, 6)}`,
  ];

  for (const slug of attempts) {
    try {
      const [row] = await db
        .insert(merchants)
        .values({
          pubkey,
          slug,
          display_name: displayName,
          avatar_url: initial?.avatar_url ?? null,
          bio: initial?.bio ?? null,
        })
        .returning();
      return row;
    } catch (err) {
      // A concurrent request claimed the pubkey first; re-read.
      const winner = await getMerchantByPubkey(pubkey);
      if (winner) return winner;
      // Slug collision — try the next candidate. Anything else,
      // bubble up.
      const message = err instanceof Error ? err.message : String(err);
      if (!/slug/i.test(message)) throw err;
    }
  }
  throw new Error("ensure_merchant_failed: slug retries exhausted");
}

/**
 * Insert a new merchant row keyed by `pubkey`. Throws on slug
 * collision so the API route can map the error code to a
 * user-facing toast.
 */
export async function claimMerchant(
  pubkey: string,
  input: ClaimMerchantInput
): Promise<Merchant> {
  const db = getDb();
  const [row] = await db
    .insert(merchants)
    .values({
      pubkey,
      slug: input.slug,
      display_name: input.display_name,
      bio: input.bio ?? null,
      alias: input.alias ?? null,
      cbu: input.cbu ?? null,
    })
    .returning();
  await writeAuditLog({
    merchant_id: row.id,
    actor_pubkey: pubkey,
    route: "/api/sign-in",
    action: "claim",
    payload_diff: { slug: row.slug, display_name: row.display_name },
  });
  return row;
}

export async function updateMerchantProfile(
  id: string,
  patch: UpdateMerchantProfileInput,
  actorPubkey: string,
  meta: { signedEventId?: string } = {}
): Promise<Merchant> {
  const db = getDb();
  const before = await getMerchantById(id);
  if (!before) {
    throw new Error(`merchant_not_found: ${id}`);
  }

  const next: Partial<Merchant> = { updated_at: new Date() };
  if (patch.display_name !== undefined) next.display_name = patch.display_name;
  if (patch.bio !== undefined) next.bio = patch.bio;
  if (patch.avatar_url !== undefined) next.avatar_url = patch.avatar_url;
  if (patch.alias !== undefined) next.alias = patch.alias;
  if (patch.cbu !== undefined) next.cbu = patch.cbu;
  if (patch.lightning_address !== undefined) {
    next.lightning_address = patch.lightning_address;
  }
  if (patch.payout_method !== undefined) {
    next.payout_method = patch.payout_method;
  }
  if (patch.features_autorenewal !== undefined) {
    next.features_autorenewal = patch.features_autorenewal;
  }

  const [row] = await db
    .update(merchants)
    .set(next)
    .where(eq(merchants.id, id))
    .returning();

  // Diff intentionally redacts CBU + alias values — payment-
  // destination secrets-adjacent. Record only WHICH fields
  // changed; the new values live in the row itself.
  const changedKeys = (
    Object.keys(patch) as Array<keyof UpdateMerchantProfileInput>
  ).filter(
    (k) =>
      patch[k] !== undefined &&
      JSON.stringify(patch[k]) !==
        JSON.stringify(before[k as keyof Merchant])
  );
  const payload_diff: Record<string, unknown> = { changed: changedKeys };
  if (meta.signedEventId) {
    payload_diff.signed = { event_id: meta.signedEventId, kind: 27235 };
  }
  await writeAuditLog({
    merchant_id: row.id,
    actor_pubkey: actorPubkey,
    route: "/api/settings",
    action: "update",
    payload_diff,
  });

  return row;
}

/**
 * The Wapu direct-payment `alias` parameter accepts either an
 * Argentine bank alias (6–20 chars `[A-Za-z0-9.-]`) or a 22-digit
 * CBU. Pick whichever the merchant has on file, preferring alias
 * (shorter, the merchant typed it on purpose). Returns null when
 * the merchant has neither — the checkout layer rejects the order.
 */
export function pickPayoutAlias(merchant: Merchant): string | null {
  if (merchant.alias) {
    const c = classifyPayoutDestination(merchant.alias);
    if (c) return c.value;
  }
  if (merchant.cbu) {
    const c = classifyPayoutDestination(merchant.cbu);
    if (c) return c.value;
  }
  return null;
}
