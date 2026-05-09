import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-static";

const QUESTION_KEYS = [
  "lightning",
  "wallet",
  "wapu",
  "argentina",
  "anonymous",
  "delivery",
  "lostReceipt",
  "merchantPayout",
  "nostrPanel",
  "fees",
] as const;

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: alternatesFor(locale, "/faq"),
  };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");

  return (
    <Section>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
        <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
      </header>

      <ul className={styles.list}>
        {QUESTION_KEYS.map((key) => (
          <li key={key} className={styles.item}>
            <details className={styles.details}>
              <summary className={styles.summary}>
                <span className={styles.question}>
                  {t(`questions.${key}Q`)}
                </span>
                <span className={styles.chevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <p className={styles.answer}>{t(`questions.${key}A`)}</p>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}
