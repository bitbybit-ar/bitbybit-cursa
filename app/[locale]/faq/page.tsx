import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-static";

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing.faq");

  return (
    <Section>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>
      <p className={styles.comingSoon}>{t("comingSoon")}</p>
    </Section>
  );
}
