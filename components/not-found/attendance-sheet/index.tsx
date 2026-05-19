import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/common/back-link";
import { CheckIcon } from "@/components/icons";
import { MissingRoute } from "./missing-route";
import styles from "./attendance-sheet.module.scss";

export interface AttendanceSheetProps {
  title: string;
  subtitle: string;
  sheetTitle: string;
  code: string;
  /** Decorative "students" that did show up (already translated). */
  roster: string[];
  presentLabel: string;
  absentLabel: string;
  absentTag: string;
  missingAria: string;
  noteLabel: string;
  /** The (already-picked) teacher's excuse line. */
  excuse: string;
  ctaExplore: string;
  ctaBack: string;
  backAria: string;
}

/**
 * The 404, framed as a class attendance roster. Presentational and
 * locale-agnostic — every string is passed in by the
 * `not-found.tsx` server component so this stays trivially
 * reviewable and the i18n lookup happens in exactly one place. The
 * single dynamic row (the route the visitor asked for) is the
 * client `MissingRoute` child.
 */
export function AttendanceSheet(props: AttendanceSheetProps) {
  const {
    title,
    subtitle,
    sheetTitle,
    code,
    roster,
    presentLabel,
    absentLabel,
    absentTag,
    missingAria,
    noteLabel,
    excuse,
    ctaExplore,
    ctaBack,
    backAria,
  } = props;

  return (
    <article className={styles.sheet}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.sheetHead}>
        <span className={styles.sheetTitle}>{sheetTitle}</span>
        <span className={styles.code}>{code}</span>
      </div>

      <ul className={styles.roster}>
        {roster.map((name) => (
          <li key={name} className={`${styles.row} ${styles.present}`}>
            <span className={styles.name}>{name}</span>
            <span className={styles.leader} aria-hidden="true" />
            <span className={styles.status}>
              <span className={styles.icon} aria-hidden="true">
                <CheckIcon size={16} />
              </span>
              {presentLabel}
            </span>
          </li>
        ))}

        <MissingRoute
          absentLabel={absentLabel}
          absentTag={absentTag}
          ariaLabel={missingAria}
        />
      </ul>

      <p className={styles.note}>
        <span className={styles.noteLabel}>{noteLabel}: </span>
        {excuse}
      </p>

      <div className={styles.actions}>
        <Button href="/explore" variant="primary">
          {ctaExplore}
        </Button>
        <BackLink fallbackHref="/" ariaLabel={backAria}>
          {ctaBack}
        </BackLink>
      </div>
    </article>
  );
}

export default AttendanceSheet;
