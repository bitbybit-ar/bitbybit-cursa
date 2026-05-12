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

type PayoutMethod = "cbu_alias" | "lightning_address";

interface SettingsFormProps {
  initialBannerUrl: string;
  initialCbu: string;
  initialAlias: string;
  initialLightningAddress: string;
  initialPayoutMethod: PayoutMethod;
  initialAutorenewal: boolean;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function SettingsForm({
  initialBannerUrl,
  initialCbu,
  initialAlias,
  initialLightningAddress,
  initialPayoutMethod,
  initialAutorenewal,
}: SettingsFormProps) {
  const t = useTranslations("settings.form");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();
  const { signWithPrompt } = useSignerContext();

  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [payoutMethod, setPayoutMethod] =
    useState<PayoutMethod>(initialPayoutMethod);
  const [cbu, setCbu] = useState(initialCbu);
  const [alias, setAlias] = useState(initialAlias);
  const [lightningAddress, setLightningAddress] = useState(
    initialLightningAddress
  );
  const [isAutorenewal, setIsAutorenewal] = useState(initialAutorenewal);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    if (payoutMethod === "cbu_alias" && !cbu.trim() && !alias.trim()) {
      showToast(t("destinationRequired"), "error");
      return;
    }
    if (payoutMethod === "lightning_address" && !lightningAddress.trim()) {
      showToast(t("lightningAddressRequired"), "error");
      return;
    }

    const nextBannerUrl = emptyToNull(bannerUrl);
    if (nextBannerUrl !== null) {
      try {
        new URL(nextBannerUrl);
      } catch {
        showToast(t("bannerUrlInvalid"), "error");
        return;
      }
    }
    const nextCbu = emptyToNull(cbu);
    const nextAlias = emptyToNull(alias);
    const nextLightningAddress = emptyToNull(lightningAddress);
    const cbuChanged = nextCbu !== emptyToNull(initialCbu);
    const aliasChanged = nextAlias !== emptyToNull(initialAlias);
    const lightningChanged =
      nextLightningAddress !== emptyToNull(initialLightningAddress);
    const railChanged = payoutMethod !== initialPayoutMethod;
    const requiresReSign =
      cbuChanged || aliasChanged || lightningChanged || railChanged;

    setIsPending(true);
    try {
      // Pre-serialize once so the bytes the client hashes are the
      // same bytes the server hashes from `req.text()`.
      const serialized = JSON.stringify({
        banner_url: nextBannerUrl,
        cbu: nextCbu,
        alias: nextAlias,
        lightning_address: nextLightningAddress,
        payout_method: payoutMethod,
        features_autorenewal: isAutorenewal,
      });

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (requiresReSign) {
        const url = new URL(
          "/api/settings",
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

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers,
        body: serialized,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
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
        if (res.status === 400) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
            reason?: string;
          } | null;
          if (json?.error === "lightning_address_invalid") {
            showToast(t("lightningAddressInvalid"), "error");
            return;
          }
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
        <legend className={styles.legend}>{t("profileLegend")}</legend>
        <p className={styles.legendHint}>{t("profileHint")}</p>

        <div className={styles.field}>
          <label htmlFor="banner_url" className={styles.label}>
            {t("bannerUrl")}
          </label>
          <input
            id="banner_url"
            type="url"
            inputMode="url"
            className={styles.input}
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder={t("bannerUrlPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
          <span className={styles.fieldHint}>{t("bannerUrlHint")}</span>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("payoutLegend")}</legend>
        <p className={styles.legendHint}>{t("payoutHint")}</p>

        <div className={styles.railSelector}>
          <label className={styles.railOption}>
            <input
              type="radio"
              name="payout_method"
              value="cbu_alias"
              checked={payoutMethod === "cbu_alias"}
              onChange={() => setPayoutMethod("cbu_alias")}
            />
            <span>
              <strong>{t("railArs")}</strong>
              <span className={styles.railHint}>{t("railArsHint")}</span>
            </span>
          </label>
          <label className={styles.railOption}>
            <input
              type="radio"
              name="payout_method"
              value="lightning_address"
              checked={payoutMethod === "lightning_address"}
              onChange={() => setPayoutMethod("lightning_address")}
            />
            <span>
              <strong>{t("railSats")}</strong>
              <span className={styles.railHint}>{t("railSatsHint")}</span>
            </span>
          </label>
        </div>

        {payoutMethod === "cbu_alias" ? (
          <>
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
          </>
        ) : (
          <div className={styles.field}>
            <label htmlFor="lightning_address" className={styles.label}>
              {t("lightningAddress")}
            </label>
            <input
              id="lightning_address"
              type="text"
              inputMode="email"
              className={styles.input}
              value={lightningAddress}
              onChange={(e) => setLightningAddress(e.target.value)}
              placeholder={t("lightningAddressPlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <span className={styles.fieldHint}>
              {t("lightningAddressHint")}
            </span>
          </div>
        )}
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
