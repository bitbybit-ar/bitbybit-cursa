import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePanelUser } from "@/lib/admin/panel-context";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { user } = await requirePanelUser();

  const t = await getTranslations("settings");

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <Card variant="default" className={styles.warning}>
        <strong>{t("warningTitle")}</strong>
        <p>{t("warningBody")}</p>
      </Card>

      <SettingsForm
        initialCbu={user.cbu ?? ""}
        initialAlias={user.alias ?? ""}
        initialLightningAddress={user.lightning_address ?? ""}
        initialPayoutMethod={user.payout_method}
        initialAutorenewal={user.features_autorenewal}
      />
    </>
  );
}
