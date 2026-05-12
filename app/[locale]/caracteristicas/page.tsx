import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { Polaroid } from "@/components/ui/polaroid";
import {
  BadgeIcon,
  BellIcon,
  BookIcon,
  CoinIcon,
  EyeOffIcon,
  KeyIcon,
  PaletteIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-static";

// One polaroid per feature. Each gets:
// - A meaningful icon (key for "no custody", eye-off for "anonymous"…).
// - A colored frame tone — cycled across the brand + accent palette
//   so the 9 polaroids read as a cheerful pinboard, not a uniform grid.
// - A rotation that alternates so the row reads as pinned tiles.
const FEATURES = [
  { key: "twoRails", icon: CoinIcon, tone: "blue", rotation: "left" },
  { key: "noCustody", icon: KeyIcon, tone: "gold", rotation: "right" },
  { key: "anonymousByDefault", icon: EyeOffIcon, tone: "pink", rotation: "left" },
  { key: "optionalNostrLogin", icon: UserIcon, tone: "nostr", rotation: "right" },
  { key: "deliveryInApp", icon: BellIcon, tone: "cyan", rotation: "left" },
  { key: "autorenewalOptIn", icon: BadgeIcon, tone: "orange", rotation: "right" },
  { key: "creatorAccount", icon: SettingsIcon, tone: "blue", rotation: "left" },
  { key: "codesOrDownloads", icon: BookIcon, tone: "lime", rotation: "right" },
  { key: "multiTenantSelfHost", icon: PaletteIcon, tone: "gold", rotation: "left" },
] as const;

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "features" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: alternatesFor(locale, "/caracteristicas"),
  };
}

export default async function FeaturesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("features");

  return (
    <>
      <Section>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
          <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
        </header>
      </Section>

      <Section>
        <ul className={styles.board} aria-label={t("hero.title")}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.key} className={styles.boardItem}>
                <Polaroid
                  rotation={feature.rotation}
                  frame={
                    <span
                      className={`${styles.featureIcon} ${styles[`tone-${feature.tone}`]}`}
                    >
                      <Icon size={64} />
                    </span>
                  }
                >
                  <h2>{t(`items.${feature.key}Title`)}</h2>
                  <p>{t(`items.${feature.key}Body`)}</p>
                </Polaroid>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
