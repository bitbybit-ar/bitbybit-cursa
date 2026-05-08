import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import {
  AliasSchema,
  CbuSchema,
  MerchantSlugSchema,
  classifyPayoutDestination,
} from "@/lib/admin/ar-bank-id";
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
    route: "/api/onboarding",
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
    route: "/api/admin/merchant-profile",
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
