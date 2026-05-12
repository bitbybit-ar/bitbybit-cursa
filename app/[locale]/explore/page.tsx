import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { OfferingCard } from "@/components/catalog/offering-card";
import { listDiscoveryOfferings } from "@/lib/offerings";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

// Marketplace discovery (ADR 0012). Renders every active user's
// offerings in newest-first order so the platform reads as a feed,
// not a single store. Per-seller landing pages live at
// /[locale]/m/[slug].
export const dynamic = "force-dynamic";

export default async function ExplorePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const rows = await listDiscoveryOfferings();

  return (
    <>
      <Section>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
          <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
        </header>
      </Section>

      <Section alternate>
        <h2 className={styles.listHeading}>{t("list.heading")}</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>{t("list.empty")}</p>
        ) : (
          <div className={styles.grid}>
            {rows.map(({ offering, seller }) => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                seller={seller}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
