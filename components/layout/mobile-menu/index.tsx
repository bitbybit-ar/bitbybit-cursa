"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  CloseIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { LocaleThemeToggle } from "@/components/layout/locale-theme-toggle";
import { useSignerContext } from "@/lib/contexts/signer-context";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import styles from "./mobile-menu.module.scss";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

// Mirror of the same list in Navbar — keep them in sync. `anchor`
// jumps to a section on the landing page; `link` is a locale-aware
// route that works from anywhere.
const SECTIONS = [
  { id: "explore", kind: "anchor", target: "#cursos-destacados" },
  { id: "howItWorks", kind: "link", target: "/como-funciona" },
  { id: "features", kind: "link", target: "/caracteristicas" },
] as const;

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const t = useTranslations("landing.nav");
  const { session, signOut } = useSignerContext();
  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);

  useClickOutside(drawerRef, onClose, open);

  // Lock body scroll while the drawer is open and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.push("/");
  };

  const isMerchant = !!session?.merchant;
  const isAdmin = !!session?.platform_admin;
  const showPanel = isMerchant || isAdmin;
  const merchantName = session?.merchant?.display_name;

  return (
    <>
      <div
        className={cn(styles.backdrop, open && styles.backdropOpen)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={cn(styles.drawer, open && styles.drawerOpen)}
        aria-label={t("accountMenu")}
        aria-hidden={!open}
        aria-modal={open ? "true" : undefined}
        role="dialog"
      >
        <header className={styles.header}>
          {session ? (
            <div className={styles.userBadge}>
              <span className={styles.userAvatar} aria-hidden="true">
                <UserIcon size={16} />
              </span>
              <span className={styles.userName}>
                {merchantName ?? t("accountMenu")}
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("closeMenu")}
          >
            <CloseIcon size={20} />
          </button>
        </header>

        <nav className={styles.nav} aria-label={t("accountMenu")}>
          {SECTIONS.map((section) =>
            section.kind === "link" ? (
              <Link
                key={section.id}
                href={section.target}
                className={styles.link}
                onClick={onClose}
              >
                {t(section.id)}
              </Link>
            ) : (
              <a
                key={section.id}
                href={section.target}
                className={styles.link}
                onClick={onClose}
              >
                {t(section.id)}
              </a>
            ),
          )}
        </nav>

        <div className={styles.divider} role="presentation" />

        <div className={styles.actions}>
          {session ? (
            <>
              <Link
                href="/mis-compras"
                className={styles.action}
                onClick={onClose}
              >
                <UserIcon size={16} />
                {t("myPurchases")}
              </Link>
              {showPanel ? (
                <Link
                  href="/panel"
                  className={styles.action}
                  onClick={onClose}
                >
                  <SettingsIcon size={16} />
                  {t("panel")}
                </Link>
              ) : null}
              <button
                type="button"
                className={styles.action}
                onClick={handleSignOut}
              >
                <LogoutIcon size={16} />
                {t("signOut")}
              </button>
            </>
          ) : (
            <Button
              href="/iniciar-sesion"
              variant="primary"
              fullWidth
              onClick={onClose}
            >
              {t("signIn")}
            </Button>
          )}
        </div>

        {/* Theme + locale toggles live at the foot of the drawer on
            mobile (they're hidden in the navbar on small viewports
            to keep the right-cluster compact). `margin-block-start:
            auto` pins this row to the bottom of the column. */}
        <div className={styles.preferences}>
          <LocaleThemeToggle />
        </div>
      </aside>
    </>
  );
}

export default MobileMenu;
