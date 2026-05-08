import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { OfferingCard } from "@/components/catalog/offering-card";
import { listActiveOfferings } from "@/lib/offerings";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

// Catalog rows live in Postgres (ADR 0009) — render per request so a
// merchant's panel edits are visible without a deploy. Move to ISR
// (`export const revalidate`) once write traffic is high enough that
// the read amplification matters.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const offerings = await listActiveOfferings();

  return (
    <>
      <Section>
        <Container column>
          <header className={styles.hero}>
            <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
            <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
          </header>
        </Container>
      </Section>

      <Section alternate>
        <Container column>
          <h2 className={styles.listHeading}>{t("list.heading")}</h2>
          {offerings.length === 0 ? (
            <p className={styles.empty}>{t("list.empty")}</p>
          ) : (
            <div className={styles.grid}>
              {offerings.map((offering) => (
                <OfferingCard key={offering.id} offering={offering} />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
