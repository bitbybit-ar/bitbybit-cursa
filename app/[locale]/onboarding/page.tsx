import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { OnboardingForm } from "./onboarding-form";
import { getSession } from "@/lib/auth";
import { getMerchantByPubkey } from "@/lib/admin/merchants";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The middleware bounces anonymous visitors to /iniciar-sesion.
  // Per ADR 0014 the merchant row is auto-created on first creator
  // surface visit, so this page is now only useful for the explicit
  // "claim a custom slug" flow. If the user already has a merchant
  // row (placeholder or otherwise), send them on to /mis-cursos.
  const session = await getSession();
  if (!session) notFound();
  const existing = await getMerchantByPubkey(session.pubkey);
  if (existing) {
    redirect({ href: "/mis-cursos", locale });
    return null;
  }

  const t = await getTranslations("onboarding");

  return (
    <Section>
      <Container column>
        <header className={styles.hero}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>
        <OnboardingForm />
      </Container>
    </Section>
  );
}
