"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { LogoBlocks } from "@/components/common/logo-blocks";
import { LocaleThemeToggle } from "@/components/layout/locale-theme-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import {
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { useSignerContext } from "@/lib/contexts/signer-context";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import styles from "./navbar.module.scss";

// Navbar entries are a hybrid: `anchor` jumps to a section that lives
// on the landing page (only works while viewing `/`); `link` is a
// locale-aware route that works from anywhere. Keep this list in sync
// with the matching one in MobileMenu.
const SECTIONS = [
  { id: "explore", kind: "anchor", target: "#cursos-destacados" },
  { id: "howItWorks", kind: "link", target: "/como-funciona" },
  { id: "features", kind: "link", target: "/caracteristicas" },
] as const;
const SCROLLED_THRESHOLD = 16;

export function Navbar() {
  const t = useTranslations("landing.nav");
  const { session, signOut } = useSignerContext();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > SCROLLED_THRESHOLD);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (y / docHeight) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeAccountMenu = useCallback(() => setAccountMenuOpen(false), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useClickOutside(accountMenuRef, closeAccountMenu, accountMenuOpen);

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await signOut();
    router.push("/");
  };

  const isMerchant = !!session?.merchant;
  const isAdmin = !!session?.platform_admin;
  const showPanel = isMerchant || isAdmin;

  return (
    <>
      <nav className={cn(styles.navbar, scrolled && styles.scrolled)}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Cursá">
            <LogoBlocks />
            <span className={styles.logoText}>Cursá</span>
          </Link>

          <div className={styles.links}>
            {SECTIONS.map((section) =>
              section.kind === "link" ? (
                <Link
                  key={section.id}
                  href={section.target}
                  className={styles.link}
                >
                  {t(section.id)}
                </Link>
              ) : (
                <a
                  key={section.id}
                  href={section.target}
                  className={styles.link}
                >
                  {t(section.id)}
                </a>
              ),
            )}
          </div>

          <div className={styles.right}>
            {/* Hidden on mobile — the toggle is duplicated inside the
                burger menu so the navbar right-cluster stays compact
                on small viewports. */}
            <LocaleThemeToggle className={styles.desktopOnly} />

            {/* Desktop CTA — hidden on mobile, where the burger menu owns the auth surface. */}
            {session ? (
              <div
                className={cn(styles.avatarWrapper, styles.desktopOnly)}
                ref={accountMenuRef}
              >
                <button
                  type="button"
                  className={styles.avatar}
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  aria-label={
                    session.merchant?.display_name ?? t("accountMenu")
                  }
                >
                  <UserIcon size={18} />
                </button>
                {accountMenuOpen ? (
                  <div className={styles.avatarMenu} role="menu">
                    <Link
                      href="/mis-compras"
                      className={styles.menuItem}
                      onClick={closeAccountMenu}
                    >
                      <UserIcon size={14} />
                      {t("myPurchases")}
                    </Link>
                    {showPanel ? (
                      <Link
                        href="/panel"
                        className={styles.menuItem}
                        onClick={closeAccountMenu}
                      >
                        <SettingsIcon size={14} />
                        {t("panel")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={handleSignOut}
                    >
                      <LogoutIcon size={14} />
                      {t("signOut")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {/* Mobile-only icon CTA — same destination as the
                    desktop button below, but compressed to an icon
                    so it sits comfortably next to the burger. */}
                <Link
                  href="/iniciar-sesion"
                  className={styles.iconCta}
                  aria-label={t("signIn")}
                >
                  <UserIcon size={18} />
                </Link>
                <Button
                  href="/iniciar-sesion"
                  variant="primary"
                  size="sm"
                  className={styles.desktopOnly}
                >
                  {t("signIn")}
                </Button>
              </>
            )}

            {/* Burger — mobile only. Toggles the slide-in MobileMenu. */}
            <button
              type="button"
              className={styles.burger}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
            >
              {mobileMenuOpen ? (
                <CloseIcon size={22} />
              ) : (
                <MenuIcon size={22} />
              )}
            </button>
          </div>
        </div>

        <div
          className={styles.scrollProgress}
          style={{ width: `${scrollProgress}%` }}
          aria-hidden="true"
        />
      </nav>

      <MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}

export default Navbar;
