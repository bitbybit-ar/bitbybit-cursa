import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSession } from "@/lib/auth";
import { getMerchantByPubkey } from "@/lib/admin/merchants";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "panel.settings" });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PanelSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) notFound();
  const merchant = await getMerchantByPubkey(session.pubkey);
  // The panel layout already redirected if no merchant; this is a
  // redundant guard so the type-narrowing reads cleanly.
  if (!merchant) notFound();

  const t = await getTranslations("panel.settings");

  return (
    <Container column>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <Card variant="default" className={styles.warning}>
        <strong>{t("warningTitle")}</strong>
        <p>{t("warningBody")}</p>
      </Card>

      <SettingsForm
        initialCbu={merchant.cbu ?? ""}
        initialAlias={merchant.alias ?? ""}
        initialAutorenewal={merchant.features_autorenewal}
      />
    </Container>
  );
}
