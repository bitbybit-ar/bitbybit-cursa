import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { offerings } from "@/lib/db/schema";

export type Offering = typeof offerings.$inferSelect;

/**
 * Catalog read for the public storefront. Excludes archived rows;
 * order is "oldest first" so the merchant's first listing stays at
 * the top until they archive it. Decision in ADR 0009.
 */
export async function listActiveOfferings(): Promise<Offering[]> {
  const db = getDb();
  return db
    .select()
    .from(offerings)
    .where(isNull(offerings.archived_at))
    .orderBy(asc(offerings.created_at));
}

/**
 * Detail read for `/[locale]/c/[slug]`. Returns archived rows as
 * null so the page can 404 without a separate archived check —
 * the buyer should not see archived listings even if they have
 * the URL.
 */
export async function getOfferingBySlug(
  slug: string
): Promise<Offering | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.slug, slug), isNull(offerings.archived_at)))
    .limit(1);
  return row ?? null;
}

export async function getOfferingById(
  id: string
): Promise<Offering | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(offerings)
    .where(eq(offerings.id, id))
    .limit(1);
  return row ?? null;
}
