"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useSignerContext } from "@/lib/contexts/signer-context";
import {
  buildSettingsAuthEvent,
  hashSettingsBody,
} from "@/lib/admin/sign-settings-payload";
import { isSignerCancellation } from "@/lib/nostr/auth-errors";
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
  const t = useTranslations("accountSettings.form");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();
  const { signWithPrompt } = useSignerContext();

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

    const nextCbu = emptyToNull(cbu);
    const nextAlias = emptyToNull(alias);
    const cbuChanged = nextCbu !== emptyToNull(initialCbu);
    const aliasChanged = nextAlias !== emptyToNull(initialAlias);
    const requiresReSign = cbuChanged || aliasChanged;

    setIsPending(true);
    try {
      // Pre-serialize once so the bytes the client hashes are the
      // same bytes the server hashes from `req.text()`.
      const serialized = JSON.stringify({
        cbu: nextCbu,
        alias: nextAlias,
        features_autorenewal: isAutorenewal,
      });

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (requiresReSign) {
        const url = new URL(
          "/api/admin/settings",
          window.location.origin
        ).toString();
        const payloadHash = await hashSettingsBody(serialized);
        const unsigned = buildSettingsAuthEvent(url, payloadHash);

        try {
          const signed = await signWithPrompt(unsigned);
          headers.Authorization = `Nostr ${btoa(JSON.stringify(signed))}`;
        } catch (err) {
          if (isSignerCancellation(err)) {
            showToast(t("signCancelled"), "info");
            return;
          }
          if (err instanceof Error && err.message === "re_sign_in_cancelled") {
            showToast(t("signCancelled"), "info");
            return;
          }
          showToast(t("saveFailed"), "error");
          return;
        }
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers,
        body: serialized,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          // 404 here means the admin gate fired, not a missing
          // resource — same handling as before.
          if (res.status === 404) {
            router.push("/");
            return;
          }
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          if (json?.error === "auth_clock_skew") {
            showToast(t("signClockSkew"), "error");
            return;
          }
          showToast(t("signRequiredBody"), "error");
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
        <div className={styles.toggle}>
          <input
            id="autorenewal"
            type="checkbox"
            checked={isAutorenewal}
            onChange={(e) => setIsAutorenewal(e.target.checked)}
          />
          <label htmlFor="autorenewal">
            <strong>{t("autorenewal")}</strong>
            <span className={styles.toggleHint}>
              {t("autorenewalHint")}
            </span>
          </label>
        </div>
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
