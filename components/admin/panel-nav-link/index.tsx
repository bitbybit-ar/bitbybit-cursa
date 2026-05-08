"use client";

import { type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import styles from "./panel-nav-link.module.scss";

interface PanelNavLinkProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}

/**
 * Sidebar nav link for the admin panel. Marks itself as
 * "current" via `aria-current="page"` and a styles flag when the
 * pathname starts with the link's href — works both for `/panel`
 * (exact match) and for nested children like `/panel/ofertas/...`.
 */
export function PanelNavLink({ href, icon, children }: PanelNavLinkProps) {
  const pathname = usePathname();

  const isExactRoot = href === "/panel";
  const isActive = isExactRoot
    ? pathname === "/panel"
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(styles.link, isActive && styles.active)}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

export default PanelNavLink;
