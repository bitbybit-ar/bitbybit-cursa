import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import styles from "./pager.module.scss";

interface PagerProps {
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
}

export async function Pager({
  page,
  totalPages,
  prevHref,
  nextHref,
}: PagerProps) {
  const t = await getTranslations("catalog.pager");

  return (
    <nav className={styles.pager} aria-label={t("ariaLabel")}>
      {prevHref ? (
        <Link href={prevHref} className={styles.link} rel="prev">
          {t("prev")}
        </Link>
      ) : (
        <span className={styles.disabled} aria-disabled="true">
          {t("prev")}
        </span>
      )}
      <span className={styles.position}>
        {t("position", { page, total: totalPages })}
      </span>
      {nextHref ? (
        <Link href={nextHref} className={styles.link} rel="next">
          {t("next")}
        </Link>
      ) : (
        <span className={styles.disabled} aria-disabled="true">
          {t("next")}
        </span>
      )}
    </nav>
  );
}
