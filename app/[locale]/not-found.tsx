import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { AttendanceSheet } from "@/components/not-found/attendance-sheet";
import styles from "@/components/not-found/attendance-sheet/attendance-sheet.module.scss";

// Re-render per request so the teacher's excuse rotates and the
// roster isn't frozen at build time. Matches the `force-dynamic`
// posture of other interactive pages (e.g. /sign-in).
export const dynamic = "force-dynamic";

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : fallback;
}

/**
 * In-app 404. Rendered inside `app/[locale]/layout.tsx`, so it gets
 * the navbar, footer, theme, and the request locale already set by
 * the layout — `getTranslations` resolves without an explicit
 * locale. Triggered by `notFound()` (e.g. an unknown `[userSlug]`)
 * and by unmatched paths under a locale.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  const roster = asStringArray(t.raw("roster"), []);
  const excuses = asStringArray(t.raw("excuses"), [""]);
  const excuse = excuses[Math.floor(Math.random() * excuses.length)];

  return (
    <Container center column className={styles.page}>
      <AttendanceSheet
        title={t("title")}
        subtitle={t("subtitle")}
        sheetTitle={t("sheetTitle")}
        code={t("code")}
        roster={roster}
        presentLabel={t("presentLabel")}
        absentLabel={t("absentLabel")}
        absentTag={t("absentTag")}
        missingAria={t("missingAria")}
        noteLabel={t("excuseLabel")}
        excuse={excuse}
        ctaExplore={t("ctaExplore")}
        ctaBack={t("ctaBack")}
        backAria={t("backAria")}
      />
    </Container>
  );
}
