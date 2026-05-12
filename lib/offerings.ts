import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { offerings, users } from "@/lib/db/schema";

export type Offering = typeof offerings.$inferSelect;

/**
 * The shape used by buyer-flow renders that need the seller card
 * alongside the offering (discovery home, seller storefront,
 * offering detail header). Keeps the join centralised so consumers
 * do not duplicate the active-user filter.
 */
export interface OfferingWithSeller {
  offering: Offering;
  seller: {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Discovery home — every active user's active offerings, newest
 * first. Consumers (ADR 0012's `/[locale]` and `/[locale]/m/[slug]`)
 * render the seller card alongside each offering so the buyer
 * knows whose store they are looking at.
 */
export async function listDiscoveryOfferings(): Promise<
  OfferingWithSeller[]
> {
  const db = getDb();
  const rows = await db
    .select({ offering: offerings, seller: users })
    .from(offerings)
    .innerJoin(users, eq(offerings.user_id, users.id))
    .where(and(eq(users.active, true), isNull(offerings.archived_at)))
    .orderBy(desc(offerings.created_at));
  return rows.map((r) => ({
    offering: r.offering,
    seller: {
      id: r.seller.id,
      slug: r.seller.slug,
      display_name: r.seller.display_name,
      avatar_url: r.seller.avatar_url,
    },
  }));
}

/**
 * Single user's public storefront listing — active rows in
 * insertion order so the seller's first listing stays at the top
 * until they archive it.
 */
export async function listOfferingsForUserSlug(
  userSlug: string
): Promise<{
  seller: typeof users.$inferSelect;
  offerings: Offering[];
} | null> {
  const db = getDb();
  const [seller] = await db
    .select()
    .from(users)
    .where(and(eq(users.slug, userSlug), eq(users.active, true)))
    .limit(1);
  if (!seller) return null;

  const rows = await db
    .select()
    .from(offerings)
    .where(
      and(eq(offerings.user_id, seller.id), isNull(offerings.archived_at))
    )
    .orderBy(asc(offerings.created_at));

  return { seller, offerings: rows };
}

/**
 * Detail read for `/[locale]/m/[userSlug]/c/[offeringSlug]`.
 * Returns null when either the user or offering is missing,
 * archived, or deactivated, so the route can 404 without a separate
 * active/archived check.
 */
export async function getOfferingByUserAndSlug(
  userSlug: string,
  offeringSlug: string
): Promise<OfferingWithSeller | null> {
  const db = getDb();
  const [row] = await db
    .select({ offering: offerings, seller: users })
    .from(offerings)
    .innerJoin(users, eq(offerings.user_id, users.id))
    .where(
      and(
        eq(users.slug, userSlug),
        eq(offerings.slug, offeringSlug),
        eq(users.active, true),
        isNull(offerings.archived_at)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    offering: row.offering,
    seller: {
      id: row.seller.id,
      slug: row.seller.slug,
      display_name: row.seller.display_name,
      avatar_url: row.seller.avatar_url,
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
