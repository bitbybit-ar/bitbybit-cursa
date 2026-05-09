import { eq, isNull, desc, isNotNull, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { offerings } from "@/lib/db/schema";
import { writeAuditLog } from "./audit";

/**
 * Admin-side reads + mutations for the offerings catalog.
 * Public reads live in `lib/offerings.ts`; this module owns the
 * shapes the panel needs (including archived rows) plus the
 * write paths, which always pair the DB change with an audit-log
 * row.
 *
 * Every helper takes a `merchantId` (ADR 0012). Slug uniqueness
 * is per-merchant, so two merchants can both have an offering at
 * `/m/<their-slug>/c/intro-bitcoin`.
 */

export type Offering = typeof offerings.$inferSelect;

/** Slug constraint — kebab-case, lowercase, ASCII. Matches ADR 0009. */
const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case ASCII");

export const CreateOfferingSchema = z.object({
  slug: SlugSchema,
  type: z.enum(["code", "download"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  price_ars: z.number().int().positive(),
  price_sats: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  code_pool: z.array(z.string().min(1)).optional(),
  download_url: z.string().url().nullable().optional(),
});

export const UpdateOfferingSchema = CreateOfferingSchema.partial();

export type CreateOfferingInput = z.infer<typeof CreateOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof UpdateOfferingSchema>;

export async function listAllOfferings(
  merchantId: string
): Promise<Offering[]> {
  const db = getDb();
  return db
    .select()
    .from(offerings)
    .where(
      and(
        eq(offerings.merchant_id, merchantId),
        isNull(offerings.archived_at)
      )
    )
    .orderBy(desc(offerings.created_at));
}

export async function listArchivedOfferings(
  merchantId: string
): Promise<Offering[]> {
  const db = getDb();
  return db
    .select()
    .from(offerings)
    .where(
      and(
        eq(offerings.merchant_id, merchantId),
        isNotNull(offerings.archived_at)
      )
    )
    .orderBy(desc(offerings.archived_at));
}

export async function getOfferingForAdmin(
  merchantId: string,
  slug: string
): Promise<Offering | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(offerings)
    .where(
      and(
        eq(offerings.merchant_id, merchantId),
        eq(offerings.slug, slug)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Verify an offering exists AND belongs to the named merchant.
 * Used by API routes that take a path id and must reject if the
 * caller's session is not the offering's owner.
 */
export async function getOfferingForAdminById(
  merchantId: string,
  id: string
): Promise<Offering | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(offerings)
    .where(
      and(eq(offerings.merchant_id, merchantId), eq(offerings.id, id))
    )
    .limit(1);
  return row ?? null;
}

export type CreateOfferingResult =
  | { ok: true; offering: Offering }
  | { ok: false; reason: "slug_taken" };

export async function createOfferingForAdmin(
  merchantId: string,
  input: CreateOfferingInput,
  actorPubkey: string
): Promise<CreateOfferingResult> {
  const db = getDb();

  // Slug-uniqueness guard before INSERT — per-merchant scope, ADR
  // 0012. A different merchant can hold the same slug. Race-
  // windowed but cheap; the DB unique index on (merchant_id, slug)
  // catches a simultaneous insert.
  const [existing] = await db
    .select({ id: offerings.id })
    .from(offerings)
    .where(
      and(
        eq(offerings.merchant_id, merchantId),
        eq(offerings.slug, input.slug)
      )
    )
    .limit(1);
  if (existing) return { ok: false, reason: "slug_taken" };

  const [row] = await db
    .insert(offerings)
    .values({
      merchant_id: merchantId,
      slug: input.slug,
      type: input.type,
      title: input.title,
      description: input.description,
      price_ars: input.price_ars,
      price_sats: input.price_sats ?? null,
      image_url: input.image_url ?? null,
      code_pool: input.code_pool ?? [],
      download_url: input.download_url ?? null,
    })
    .returning();

  await writeAuditLog({
    merchant_id: merchantId,
    actor_pubkey: actorPubkey,
    route: "/api/my-courses",
    action: "create",
    payload_diff: {
      offering_id: row.id,
      slug: row.slug,
      type: row.type,
      title: row.title,
      price_ars: row.price_ars,
    },
  });

  return { ok: true, offering: row };
}

export type UpdateOfferingResult =
  | { ok: true; offering: Offering }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "slug_taken" };

export async function updateOfferingForAdmin(
  merchantId: string,
  id: string,
  patch: UpdateOfferingInput,
  actorPubkey: string
): Promise<UpdateOfferingResult> {
  const db = getDb();

  const existing = await getOfferingForAdminById(merchantId, id);
  if (!existing) return { ok: false, reason: "not_found" };

  if (patch.slug && patch.slug !== existing.slug) {
    const [conflict] = await db
      .select({ id: offerings.id })
      .from(offerings)
      .where(
        and(
          eq(offerings.merchant_id, merchantId),
          eq(offerings.slug, patch.slug)
        )
      )
      .limit(1);
    if (conflict && conflict.id !== id) {
      return { ok: false, reason: "slug_taken" };
    }
  }

  const [row] = await db
    .update(offerings)
    .set({
      slug: patch.slug ?? existing.slug,
      type: patch.type ?? existing.type,
      title: patch.title ?? existing.title,
      description: patch.description ?? existing.description,
      price_ars: patch.price_ars ?? existing.price_ars,
      price_sats:
        patch.price_sats === undefined
          ? existing.price_sats
          : patch.price_sats,
      image_url:
        patch.image_url === undefined
          ? existing.image_url
          : patch.image_url,
      code_pool: patch.code_pool ?? existing.code_pool,
      download_url:
        patch.download_url === undefined
          ? existing.download_url
          : patch.download_url,
      updated_at: new Date(),
    })
    .where(
      and(eq(offerings.merchant_id, merchantId), eq(offerings.id, id))
    )
    .returning();

  // Compute a small diff summary for the audit row. We DO NOT
  // record full description text or the entire code pool in the
  // audit log — those are large and the row is recoverable from
  // the offerings table anyway. We do record which fields
  // changed, so a future "what did they edit?" reviewer can scan.
  const changedKeys = (Object.keys(patch) as Array<keyof UpdateOfferingInput>)
    .filter(
      (k) =>
        patch[k] !== undefined &&
        JSON.stringify(patch[k]) !== JSON.stringify(existing[k as keyof Offering])
    );
  await writeAuditLog({
    merchant_id: merchantId,
    actor_pubkey: actorPubkey,
    route: "/api/my-courses/[id]",
    action: "update",
    payload_diff: {
      offering_id: id,
      changed: changedKeys,
    },
  });

  return { ok: true, offering: row };
}

export type ArchiveOfferingResult =
  | { ok: true; offering: Offering }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_archived" };

export async function archiveOfferingForAdmin(
  merchantId: string,
  id: string,
  actorPubkey: string
): Promise<ArchiveOfferingResult> {
  const db = getDb();

  const existing = await getOfferingForAdminById(merchantId, id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.archived_at !== null) {
    return { ok: false, reason: "already_archived" };
  }

  const [row] = await db
    .update(offerings)
    .set({ archived_at: new Date(), updated_at: new Date() })
    .where(
      and(eq(offerings.merchant_id, merchantId), eq(offerings.id, id))
    )
    .returning();

  await writeAuditLog({
    merchant_id: merchantId,
    actor_pubkey: actorPubkey,
    route: "/api/my-courses/[id]",
    action: "archive",
    payload_diff: {
      offering_id: id,
      slug: existing.slug,
    },
  });

  return { ok: true, offering: row };
}
