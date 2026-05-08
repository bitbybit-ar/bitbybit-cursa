import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/routing";
import { getSession } from "@/lib/auth";
import { getMerchantByPubkey } from "@/lib/admin/merchants";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PanelNavLink } from "@/components/admin/panel-nav-link";
import {
  TrophyIcon,
  BadgeIcon,
  UserIcon,
  SettingsIcon,
} from "@/components/icons";
import styles from "./layout.module.scss";

export const dynamic = "force-dynamic";

/**
 * Merchant panel layout (ADR 0012).
 *
 * The edge middleware (`proxy.ts`) bounces anonymous visitors to
 * sign-in. This layout finishes the gate:
 *
 *   - no session                   → bounce to /iniciar-sesion
 *     (defence in depth — middleware already catches this)
 *   - session, no merchant claimed → redirect to /onboarding
 *   - session, deactivated merchant → 404
 *   - signed-in active merchant     → render
 *
 * The merchant row is also exposed to children pages via the
 * panel pages reading `getMerchantByPubkey` themselves; this
 * layout intentionally does not propagate it through props or a
 * context to keep the data path uniform with the API routes
 * (which read it via `requireMerchant` on each call).
 */
export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) {
    redirect({ href: "/iniciar-sesion?next=/panel", locale });
    return null;
  }

  const merchant = await getMerchantByPubkey(session.pubkey);
  if (!merchant) {
    redirect({ href: "/onboarding", locale });
    return null;
  }
  if (!merchant.active) {
    notFound();
  }

  const t = await getTranslations("panel");

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>{merchant.display_name}</span>
          <span className={styles.brandSubtitle}>
            {t("brandSubtitle")}
          </span>
        </div>

        <nav className={styles.nav} aria-label={t("nav.label")}>
          <PanelNavLink href="/panel" icon={<TrophyIcon size={18} />}>
            {t("nav.overview")}
          </PanelNavLink>
          <PanelNavLink
            href="/panel/ofertas"
            icon={<BadgeIcon size={18} />}
          >
            {t("nav.offerings")}
          </PanelNavLink>
          <PanelNavLink
            href="/panel/pedidos"
            icon={<TrophyIcon size={18} />}
          >
            {t("nav.orders")}
          </PanelNavLink>
          <PanelNavLink
            href="/panel/estudiantes"
            icon={<UserIcon size={18} />}
          >
            {t("nav.students")}
          </PanelNavLink>
          <PanelNavLink
            href="/panel/configuracion"
            icon={<SettingsIcon size={18} />}
          >
            {t("nav.settings")}
          </PanelNavLink>
        </nav>

        <div className={styles.footer}>
          <Link href={`/m/${merchant.slug}`} className={styles.exitLink}>
            {t("nav.viewStore")}
          </Link>
          <SignOutButton label={t("signOut")} />
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
