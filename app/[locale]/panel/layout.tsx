import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/routing";
import { getSession, sessionIsAdmin } from "@/lib/auth";
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
 * Admin panel layout.
 *
 * The edge middleware (`proxy.ts`) already gates access to
 * `/[locale]/panel/*` and 404s non-admins. This layout repeats the
 * session check on the server so a server-side render that
 * somehow bypassed the middleware (e.g. a misconfigured matcher)
 * still fails closed. Redundancy is the goal.
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
  if (!sessionIsAdmin(session)) {
    // Belt-and-braces: middleware should have caught this, but if
    // a request slipped through we still refuse to render the
    // panel. notFound() would surface the 404 page in the active
    // locale.
    redirect({ href: "/", locale });
    return null;
  }

  const t = await getTranslations("panel");

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>{t("brand")}</span>
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
          <Link href="/" className={styles.exitLink}>
            {t("nav.exit")}
          </Link>
          <SignOutButton label={t("signOut")} />
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
