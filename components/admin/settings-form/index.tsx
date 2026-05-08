"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import styles from "./settings-form.module.scss";

interface SettingsFormProps {
  initialCbu: string;
  initialAlias: string;
  initialAutorenewal: boolean;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function SettingsForm({
  initialCbu,
  initialAlias,
  initialAutorenewal,
}: SettingsFormProps) {
  const t = useTranslations("panel.settings.form");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();

  const [cbu, setCbu] = useState(initialCbu);
  const [alias, setAlias] = useState(initialAlias);
  const [isAutorenewal, setIsAutorenewal] = useState(initialAutorenewal);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    if (!cbu.trim() && !alias.trim()) {
      showToast(t("destinationRequired"), "error");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cbu: emptyToNull(cbu),
          alias: emptyToNull(alias),
          features_autorenewal: isAutorenewal,
        }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          router.push("/");
          return;
        }
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
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("payoutLegend")}</legend>
        <p className={styles.legendHint}>{t("payoutHint")}</p>

        <div className={styles.field}>
          <label htmlFor="cbu" className={styles.label}>
            {t("cbu")}
          </label>
          <input
            id="cbu"
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={cbu}
            onChange={(e) => setCbu(e.target.value)}
            placeholder={t("cbuPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="alias" className={styles.label}>
            {t("alias")}
          </label>
          <input
            id="alias"
            type="text"
            className={styles.input}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={t("aliasPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("featuresLegend")}</legend>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={isAutorenewal}
            onChange={(e) => setIsAutorenewal(e.target.checked)}
          />
          <span>
            <strong>{t("autorenewal")}</strong>
            <span className={styles.toggleHint}>
              {t("autorenewalHint")}
            </span>
          </span>
        </label>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export default SettingsForm;
