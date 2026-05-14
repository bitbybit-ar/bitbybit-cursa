import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { offerings, users } from "@/lib/db/schema";
import { convertPrice, getSatsPerArs } from "@/lib/exchange-rate";
import {
  findMockOfferingByUserAndSlug,
  findMockStorefront,
  highlightedCourses,
} from "@/lib/mock/highlighted-courses";
import type { OfferingTypeFilter, SortKey } from "@/lib/explore-params";

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
    banner_url: string | null;
    bio: string | null;
  };
}

/**
 * Discovery home with search/filter/sort/pagination. The page reads
 * `searchParams` and hands them here normalized; this function applies
 * them, returning the slice for the requested page plus the total row
 * count so the caller can render a pager.
 *
 * In demo mode (no `DATABASE_URL` or empty catalog), the mock
 * `highlightedCourses` set is filtered and sorted in-memory.
 */
export interface DiscoveryQuery {
  q?: string;
  type?: OfferingTypeFilter;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export async function listDiscoveryOfferingsPaged(
  opts: DiscoveryQuery = {}
): Promise<{ rows: OfferingWithSeller[]; total: number }> {
  const sort: SortKey = opts.sort ?? "newest";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 12);
  const offset = (page - 1) * pageSize;
  const q = opts.q?.trim();

  try {
    const db = getDb();
    const conditions: SQL[] = [
      eq(users.active, true),
      isNull(offerings.archived_at),
    ];
    if (opts.type) conditions.push(eq(offerings.type, opts.type));
    if (q) {
      // Escape LIKE metacharacters so a `%` in user input matches
      // literally instead of acting as a wildcard.
      const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      const search = or(
        ilike(offerings.title, pattern),
        ilike(offerings.description, pattern),
        ilike(users.display_name, pattern)
      );
      if (search) conditions.push(search);
    }
    const whereClause = and(...conditions);

    // Normalise to ARS in SQL so price sorts behave the same whether
    // the seller chose ARS or sats. The rate is locked at query time
    // — a rate move mid-page won't reshuffle pagination.
    const rate = await getSatsPerArs();
    const priceArsEquiv = sql<number>`CASE WHEN ${offerings.price_currency} = 'ars' THEN ${offerings.price_amount} ELSE (${offerings.price_amount}::float / ${rate})::int END`;

    const orderBy =
      sort === "oldest"
        ? asc(offerings.created_at)
        : sort === "price_asc"
          ? asc(priceArsEquiv)
          : sort === "price_desc"
            ? desc(priceArsEquiv)
            : desc(offerings.created_at);

    const [rowsRaw, totalRaw] = await Promise.all([
      db
        .select({ offering: offerings, seller: users })
        .from(offerings)
        .innerJoin(users, eq(offerings.user_id, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(offerings)
        .innerJoin(users, eq(offerings.user_id, users.id))
        .where(whereClause),
    ]);

    if (rowsRaw.length === 0 && totalRaw[0].value === 0) {
      return filterMocks(highlightedCourses, opts);
    }

    return {
      rows: rowsRaw.map((r) => ({
        offering: r.offering,
        seller: {
          id: r.seller.id,
          slug: r.seller.slug,
          display_name: r.seller.display_name,
          avatar_url: r.seller.avatar_url,
          banner_url: r.seller.banner_url,
          bio: r.seller.bio,
        },
      })),
      total: totalRaw[0].value,
    };
  } catch {
    return filterMocks(highlightedCourses, opts);
  }
}

async function filterMocks(
  mocks: OfferingWithSeller[],
  opts: DiscoveryQuery
): Promise<{ rows: OfferingWithSeller[]; total: number }> {
  const sort: SortKey = opts.sort ?? "newest";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 12);
  const q = opts.q?.trim().toLowerCase();

  let filtered = mocks.filter((row) => {
    if (opts.type && row.offering.type !== opts.type) return false;
    if (q) {
      const haystack = [
        row.offering.title,
        row.offering.description,
        row.seller.display_name,
      ]
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Same ARS-normalisation as the SQL path so mock and live results
  // sort consistently when DATABASE_URL is missing.
  const arsEquivCache = new Map<string, number>();
  await Promise.all(
    filtered.map(async (row) => {
      const ars =
        row.offering.price_currency === "ars"
          ? row.offering.price_amount
          : await convertPrice(row.offering.price_amount, "sats", "ars");
      arsEquivCache.set(row.offering.id, ars);
    }),
  );

  filtered = [...filtered].sort((a, b) => {
    if (sort === "price_asc")
      return (arsEquivCache.get(a.offering.id) ?? 0) - (arsEquivCache.get(b.offering.id) ?? 0);
    if (sort === "price_desc")
      return (arsEquivCache.get(b.offering.id) ?? 0) - (arsEquivCache.get(a.offering.id) ?? 0);
    const aTime = new Date(a.offering.created_at).getTime();
    const bTime = new Date(b.offering.created_at).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  return { rows: filtered.slice(offset, offset + pageSize), total };
}

/**
 * Single user's public storefront listing — active rows in
 * insertion order so the seller's first listing stays at the top
 * until they archive it. Returns the narrow seller card shape used
 * by buyer-facing pages (matches `OfferingWithSeller.seller`) so
 * the mock fallback can satisfy the same type.
 */
export async function listOfferingsForUserSlug(
  userSlug: string
): Promise<{
  seller: OfferingWithSeller["seller"];
  offerings: Offering[];
} | null> {
  try {
    const db = getDb();
    const [seller] = await db
      .select()
      .from(users)
      .where(and(eq(users.slug, userSlug), eq(users.active, true)))
      .limit(1);
    if (!seller) return findMockStorefront(userSlug);

    const rows = await db
      .select()
      .from(offerings)
      .where(
        and(eq(offerings.user_id, seller.id), isNull(offerings.archived_at))
      )
      .orderBy(asc(offerings.created_at));

    return {
      seller: {
        id: seller.id,
        slug: seller.slug,
        display_name: seller.display_name,
        avatar_url: seller.avatar_url,
        banner_url: seller.banner_url,
        bio: seller.bio,
      },
      offerings: rows,
    };
  } catch {
    return findMockStorefront(userSlug);
  }
}

/**
 * Detail read for `/[locale]/[userSlug]/c/[offeringSlug]`.
 * Returns null when either the user or offering is missing,
 * archived, or deactivated, so the route can 404 without a separate
 * active/archived check.
 */
export async function getOfferingByUserAndSlug(
  userSlug: string,
  offeringSlug: string
): Promise<OfferingWithSeller | null> {
  try {
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
    if (!row) {
      return findMockOfferingByUserAndSlug(userSlug, offeringSlug);
    }
    return {
      offering: row.offering,
      seller: {
        id: row.seller.id,
        slug: row.seller.slug,
        display_name: row.seller.display_name,
        avatar_url: row.seller.avatar_url,
        banner_url: row.seller.banner_url,
        bio: row.seller.bio,
      },
    };
  } catch {
    return findMockOfferingByUserAndSlug(userSlug, offeringSlug);
  }
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
