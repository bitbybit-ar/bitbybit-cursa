"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import styles from "./preferences-form.module.scss";

type Locale = "es" | "en";

interface PreferencesFormProps {
  initialLocale: Locale;
}

/**
 * Default-locale picker (ADR 0021).
 *
 * The navbar's existing locale toggle stays as a session-only
 * switch; this is the value applied to the URL prefix on the next
 * sign-in. Theme is deliberately NOT here — it lives in
 * `next-themes`/localStorage and persists per-device, which is the
 * common Theme UX users already know.
 */
export function PreferencesForm({ initialLocale }: PreferencesFormProps) {
  const t = useTranslations("settings.preferences");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        showToast(t("saveFailed"), "error");
        return;
      }
      showToast(t("saved"), "success");
      router.refresh();
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t("title")}</h2>
          <p className={styles.sectionHint}>{t("hint")}</p>
        </header>

        <div className={styles.field}>
          <label htmlFor="locale" className={styles.label}>
            {t("language")}
          </label>
          <select
            id="locale"
            className={styles.select}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="es">{t("languageEs")}</option>
            <option value="en">{t("languageEn")}</option>
          </select>
          <p className={styles.hint}>{t("languageHint")}</p>
        </div>

        <div className={styles.themeNote}>
          <strong>{t("themeLabel")}</strong>
          <p>{t("themeHint")}</p>
        </div>
      </section>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export default PreferencesForm;
