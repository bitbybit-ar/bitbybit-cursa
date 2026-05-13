import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { OfferingCard } from "@/components/catalog/offering-card";
import { listDiscoveryOfferingsPaged } from "@/lib/offerings";
import {
  PAGE_SIZE,
  buildExploreHref,
  hasActiveFilters,
  parseExploreParams,
} from "@/lib/explore-params";
import { Controls } from "@/components/catalog/explore-controls";
import { Pager } from "@/components/catalog/explore-pager";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Marketplace discovery (ADR 0012). Renders every active user's
// offerings, with search, filters, sort, and pagination driven by
// the querystring so the page stays a server component and links
// stay shareable. Per-seller landing pages live at /[locale]/[slug]
// (ADR 0017).
export const dynamic = "force-dynamic";

export default async function ExplorePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const parsed = parseExploreParams(sp);
  const t = await getTranslations("catalog");

  const { rows, total } = await listDiscoveryOfferingsPaged({
    q: parsed.q || undefined,
    type: parsed.type ?? undefined,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = hasActiveFilters(parsed);
  const emptyKey = isFiltered ? "list.noMatches" : "list.empty";

  return (
    <Container>
      <h1 className={styles.heading}>{t("list.heading")}</h1>
      <Controls current={parsed} />
      <p className={styles.results}>{t("list.results", { count: total })}</p>
      {rows.length === 0 ? (
        <p className={styles.empty}>{t(emptyKey)}</p>
      ) : (
        <>
          <div className={styles.grid}>
            {rows.map(({ offering, seller }) => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                seller={seller}
              />
            ))}
          </div>
          {total > PAGE_SIZE && (
            <Pager
              page={parsed.page}
              totalPages={totalPages}
              prevHref={
                parsed.page > 1
                  ? buildExploreHref(parsed, { page: parsed.page - 1 })
                  : null
              }
              nextHref={
                parsed.page < totalPages
                  ? buildExploreHref(parsed, { page: parsed.page + 1 })
                  : null
              }
            />
          )}
        </>
      )}
    </Container>
  );
}
