import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { offerings, merchants } from "@/lib/db/schema";

export type Offering = typeof offerings.$inferSelect;

/**
 * The shape used by buyer-flow renders that need the merchant
 * card alongside the offering (discovery home, merchant
 * storefront, offering detail header). Keeps the join centralised
 * so consumers do not duplicate the active-merchant filter.
 */
export interface OfferingWithMerchant {
  offering: Offering;
  merchant: {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Discovery home — every active merchant's active offerings,
 * newest first. Consumers (ADR 0012's `/[locale]` and
 * `/[locale]/m/[slug]`) render the merchant card alongside each
 * offering so the buyer knows whose store they are looking at.
 */
export async function listDiscoveryOfferings(): Promise<
  OfferingWithMerchant[]
> {
  const db = getDb();
  const rows = await db
    .select({ offering: offerings, merchant: merchants })
    .from(offerings)
    .innerJoin(merchants, eq(offerings.merchant_id, merchants.id))
    .where(
      and(eq(merchants.active, true), isNull(offerings.archived_at))
    )
    .orderBy(desc(offerings.created_at));
  return rows.map((r) => ({
    offering: r.offering,
    merchant: {
      id: r.merchant.id,
      slug: r.merchant.slug,
      display_name: r.merchant.display_name,
      avatar_url: r.merchant.avatar_url,
    },
  }));
}

/**
 * Single merchant's public storefront listing — active rows in
 * insertion order so the merchant's first listing stays at the
 * top until they archive it.
 */
export async function listOfferingsForMerchantSlug(
  merchantSlug: string
): Promise<{
  merchant: typeof merchants.$inferSelect;
  offerings: Offering[];
} | null> {
  const db = getDb();
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(
      and(eq(merchants.slug, merchantSlug), eq(merchants.active, true))
    )
    .limit(1);
  if (!merchant) return null;

  const rows = await db
    .select()
    .from(offerings)
    .where(
      and(
        eq(offerings.merchant_id, merchant.id),
        isNull(offerings.archived_at)
      )
    )
    .orderBy(asc(offerings.created_at));

  return { merchant, offerings: rows };
}

/**
 * Detail read for `/[locale]/m/[merchantSlug]/c/[offeringSlug]`.
 * Returns null when either the merchant or offering is missing,
 * archived, or deactivated, so the route can 404 without a
 * separate active/archived check.
 */
export async function getOfferingByMerchantAndSlug(
  merchantSlug: string,
  offeringSlug: string
): Promise<OfferingWithMerchant | null> {
  const db = getDb();
  const [row] = await db
    .select({ offering: offerings, merchant: merchants })
    .from(offerings)
    .innerJoin(merchants, eq(offerings.merchant_id, merchants.id))
    .where(
      and(
        eq(merchants.slug, merchantSlug),
        eq(offerings.slug, offeringSlug),
        eq(merchants.active, true),
        isNull(offerings.archived_at)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    offering: row.offering,
    merchant: {
      id: row.merchant.id,
      slug: row.merchant.slug,
      display_name: row.merchant.display_name,
      avatar_url: row.merchant.avatar_url,
    },
  };
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
