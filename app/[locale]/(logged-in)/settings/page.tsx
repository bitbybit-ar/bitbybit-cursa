import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePanelUser } from "@/lib/admin/panel-context";
import { fetchKind0Profile } from "@/lib/nostr/profile";
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

  // Best-effort kind:0 read. If the user has never set a Lightning
  // Address on the cursats row, fall back to whatever their Nostr
  // profile advertises as `lud16`. The fetch is best-effort with a
  // 3s relay timeout — a slow relay set returns an empty profile
  // and the form starts with empty fields, exactly as before. The
  // user can always override what we pre-fill.
  const profile = await fetchKind0Profile(user.pubkey);
  const initialLightningAddress =
    user.lightning_address ?? profile.lud16 ?? "";

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <SettingsForm
        initialDisplayName={user.display_name}
        initialBio={user.bio ?? ""}
        initialAvatarUrl={user.avatar_url ?? ""}
        initialBannerUrl={user.banner_url ?? ""}
        initialCbu={user.cbu ?? ""}
        initialAlias={user.alias ?? ""}
        initialLightningAddress={initialLightningAddress}
        initialPayoutMethod={user.payout_method}
        lightningAddressFromNostr={
          !user.lightning_address && Boolean(profile.lud16)
        }
      />
    </>
  );
}
