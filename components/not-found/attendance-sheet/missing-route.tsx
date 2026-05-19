"use client";

import { usePathname } from "@/i18n/routing";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./attendance-sheet.module.scss";

interface MissingRouteProps {
  /** Status word stamped on the absent row, e.g. "AUSENTE". */
  absentLabel: string;
  /** Sub-line under the route, e.g. "Ausente con aviso". */
  absentTag: string;
  /** Screen-reader description of this row. */
  ariaLabel: string;
}

/**
 * The one roster row that isn't static: the route the visitor
 * actually asked for, read from the client so it's always accurate
 * (a `not-found.tsx` server component can't see the attempted path).
 * `usePathname` from next-intl returns the locale-stripped path,
 * which is exactly what we want to show the visitor.
 */
export function MissingRoute({
  absentLabel,
  absentTag,
  ariaLabel,
}: MissingRouteProps) {
  const pathname = usePathname();

  return (
    <li
      className={cn(styles.row, styles.absentRow)}
      aria-label={`${ariaLabel}: ${pathname}`}
    >
      <span className={styles.name}>
        <code>{pathname}</code>
        <span className={styles.tag}>{absentTag}</span>
      </span>
      <span className={styles.leader} aria-hidden="true" />
      <span className={styles.status}>
        <span className={styles.icon} aria-hidden="true">
          <CloseIcon size={16} />
        </span>
        {absentLabel}
      </span>
    </li>
  );
}

export default MissingRoute;
