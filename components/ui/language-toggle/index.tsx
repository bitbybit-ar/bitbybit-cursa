"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import styles from "./language-toggle.module.scss";

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  const next = locale === "es" ? "en" : "es";
  const ariaLabel =
    locale === "es" ? t("switchToEnglish") : t("switchToSpanish");
  const label = locale === "es" ? "EN" : "ES";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => router.replace(pathname, { locale: next })}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}

export default LanguageToggle;
