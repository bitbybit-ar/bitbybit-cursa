import { Polaroid } from "@/components/ui/polaroid";
import { Link } from "@/i18n/routing";
import { CheckIcon } from "@/components/icons";
import { MissingRoute } from "./missing-route";
import styles from "./attendance-polaroid.module.scss";

export interface AttendancePolaroidProps {
  title: string;
  sheetTitle: string;
  code: string;
  /** Decorative "students" that did show up (already translated). */
  roster: string[];
  presentLabel: string;
  absentLabel: string;
  absentTag: string;
  missingAria: string;
  excuseLabel: string;
  /** The (already-picked) page's excuse line. */
  excuse: string;
  ctaExplore: string;
}

/**
 * The 404 as a Polaroid. The photo frame is a wood-framed green
 * chalkboard (CSS, no asset) holding the attendance roster; the
 * route the visitor asked for is the student stamped AUSENTE
 * (`MissingRoute`, the one client child — a server `not-found`
 * can't read the attempted path). Presentational and
 * locale-agnostic: every string is passed by `not-found.tsx`, so
 * the i18n lookup lives in one place.
 */
export function AttendancePolaroid(props: AttendancePolaroidProps) {
  const {
    title,
    sheetTitle,
    code,
    roster,
    presentLabel,
    absentLabel,
    absentTag,
    missingAria,
    excuseLabel,
    excuse,
    ctaExplore,
  } = props;

  const chalkboard = (
    <div className={styles.wall}>
      <div className={styles.board}>
        <div className={styles.boardInner}>
          <div className={styles.boardHead}>
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
                    <CheckIcon size={12} />
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
        </div>
        <span className={styles.chalkStick} aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <Polaroid rotation="none" frame={chalkboard} className={styles.polaroid}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>
        <span className={styles.noteLabel}>{excuseLabel}: </span>
        {excuse}
      </p>
      <Link href="/explore" className={styles.cta}>
        {ctaExplore}
      </Link>
    </Polaroid>
  );
}

export default AttendancePolaroid;
