import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Polaroid } from "@/components/ui/polaroid";
import { Button } from "@/components/ui/button";
import { BoltIcon, CoinIcon, HeartIcon } from "@/components/icons";
import { alternatesFor } from "@/lib/seo";
import { HowItWorksBubbles } from "./bubbles";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howItWorks" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: alternatesFor(locale, "/como-funciona"),
  };
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howItWorks");

  const buyerSteps = [
    { title: t("buyers.step1Title"), body: t("buyers.step1Body") },
    { title: t("buyers.step2Title"), body: t("buyers.step2Body") },
    { title: t("buyers.step3Title"), body: t("buyers.step3Body") },
  ];

  const creatorSteps = [
    { title: t("creators.step1Title"), body: t("creators.step1Body") },
    { title: t("creators.step2Title"), body: t("creators.step2Body") },
    { title: t("creators.step3Title"), body: t("creators.step3Body") },
  ];

  // Glossary cards. Each gets an icon themed to its concept and a
  // staggered rotation so they read as three Polaroids pinned to a
  // board rather than a uniform grid.
  const glossary = [
    {
      title: t("glossary.lightningTitle"),
      body: t("glossary.lightningBody"),
      icon: <BoltIcon size={64} />,
      rotation: "left" as const,
      tone: styles.glossaryToneLightning,
    },
    {
      title: t("glossary.wapuTitle"),
      body: t("glossary.wapuBody"),
      icon: <CoinIcon size={64} />,
      rotation: "right" as const,
      tone: styles.glossaryToneWapu,
    },
    {
      title: t("glossary.nostrTitle"),
      body: t("glossary.nostrBody"),
      icon: <HeartIcon size={64} />,
      rotation: "left" as const,
      tone: styles.glossaryToneNostr,
    },
  ];

  return (
    <>
      <section className={styles.heroSection}>
        <HowItWorksBubbles />
        <div className={styles.heroInner}>
          <header className={styles.hero}>
            <h1 className={styles.heroTitle}>
              {t.rich("hero.title", {
                gradient: (chunks) => (
                  <span className={styles.gradientWord}>{chunks}</span>
                ),
              })}
            </h1>
            <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
          </header>
        </div>
      </section>

      <Section>
        <h2 className={styles.sectionTitle}>{t("buyers.title")}</h2>
        <ol className={styles.steps}>
          {buyerSteps.map((step, i) => (
            <li key={step.title}>
              <Card variant="hover" className={styles.stepCard}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <h2 className={styles.sectionTitle}>{t("creators.title")}</h2>
        <ol className={styles.steps}>
          {creatorSteps.map((step, i) => (
            <li key={step.title}>
              <Card variant="hover" className={styles.stepCard}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <h2 className={styles.sectionTitle}>{t("glossary.title")}</h2>
        <ul className={styles.glossary} aria-label={t("glossary.title")}>
          {glossary.map((item) => (
            <li key={item.title} className={styles.glossaryItem}>
              <Polaroid
                rotation={item.rotation}
                frame={
                  <span className={`${styles.glossaryIcon} ${item.tone}`}>
                    {item.icon}
                  </span>
                }
              >
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Polaroid>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <Card variant="highlight" className={styles.custodyCard}>
          <h2 className={styles.custodyTitle}>{t("custody.title")}</h2>
          <p className={styles.custodyBody}>{t("custody.body")}</p>
        </Card>
      </Section>

      <Section>
        <div className={styles.ctaBlock}>
          <h2 className={styles.sectionTitle}>{t("cta.title")}</h2>
          <div className={styles.ctaButtons}>
            <Button
              href="/explore"
              variant="primary"
              size="lg"
              className={styles.cta}
            >
              {t("cta.explore")}
            </Button>
            <Button
              href="/sign-in?next=/create-course"
              variant="primary"
              size="lg"
              className={`${styles.cta} ${styles.ctaSoft}`}
            >
              {t("cta.publish")}
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
