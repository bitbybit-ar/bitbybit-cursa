"use client";

import type { ReactNode } from "react";
import { useRouter } from "@/i18n/routing";
import { ArrowLeftIcon } from "@/components/icons";
import styles from "./back-link.module.scss";

interface BackLinkProps {
  /** Where to go when there is no prior in-app history (cold land). */
  fallbackHref: string;
  /**
   * Accessible label. Required because the visual treatment is often
   * icon-only — screen readers need the destination context.
   */
  ariaLabel: string;
  /** Extra class on the rendered button, e.g. a page-local override. */
  className?: string;
  /** Optional visible text after the icon. Omit for icon-only. */
  children?: ReactNode;
}

/**
 * Browser-back affordance. Pops the history stack when there is one,
 * otherwise routes to `fallbackHref` (typically the catalog) so a
 * buyer who landed cold from an external link still has somewhere to
 * go. Rendered as a button — not an anchor — because the destination
 * is "wherever you came from", not a fixed URL.
 */
export function BackLink({
  fallbackHref,
  ariaLabel,
  className,
  children,
}: BackLinkProps) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[styles.back, className].filter(Boolean).join(" ")}
    >
      <ArrowLeftIcon size={16} />
      {children}
    </button>
  );
}

export default BackLink;
