"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTheme } from "@/lib/contexts/theme-context";
import { MoonIcon, SunIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./locale-theme-toggle.module.scss";

interface LocaleThemeToggleProps {
  className?: string;
}

export function LocaleThemeToggle({ className }: LocaleThemeToggleProps) {
  const t = useTranslations("landing.nav");
  const { theme, toggleTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleLocale = () => {
    const next = locale === "es" ? "en" : "es";
    router.replace(pathname, { locale: next });
  };

  return (
    <div className={cn(styles.group, className)}>
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleTheme}
        aria-label={
          mounted && theme === "dark"
            ? t("switchToLightMode")
            : t("switchToDarkMode")
        }
        suppressHydrationWarning
      >
        {mounted && theme === "dark" ? (
          <SunIcon size={14} />
        ) : (
          <MoonIcon size={14} />
        )}
      </button>
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleLocale}
        aria-label={
          locale === "es" ? t("switchToEnglish") : t("switchToSpanish")
        }
      >
        {locale === "es" ? "EN" : "ES"}
      </button>
    </div>
  );
}

export default LocaleThemeToggle;
