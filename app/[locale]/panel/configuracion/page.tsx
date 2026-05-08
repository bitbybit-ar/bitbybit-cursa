import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { getOrInitSettings } from "@/lib/admin/settings";
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

  const current = await getOrInitSettings();
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
        initialCbu={current.cbu ?? ""}
        initialAlias={current.alias ?? ""}
        initialAutorenewal={current.features_autorenewal}
      />
    </Container>
  );
}
