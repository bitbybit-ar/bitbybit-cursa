"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
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
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialBannerUrl: string;
  initialCbu: string;
  initialAlias: string;
  initialLightningAddress: string;
  initialPayoutMethod: PayoutMethod;
  /**
   * True when the LN address we seeded came from the user's Nostr
   * kind:0 profile rather than their cursats row. Surfaces a hint
   * under the field so the user knows why a value they never typed
   * into cursats is already there, and that saving will persist it.
   */
  lightningAddressFromNostr: boolean;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function SettingsForm({
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
  initialBannerUrl,
  initialCbu,
  initialAlias,
  initialLightningAddress,
  initialPayoutMethod,
  lightningAddressFromNostr,
}: SettingsFormProps) {
  const t = useTranslations("settings.form");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();
  const { signWithPrompt } = useSignerContext();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [payoutMethod, setPayoutMethod] =
    useState<PayoutMethod>(initialPayoutMethod);
  const [cbu, setCbu] = useState(initialCbu);
  const [alias, setAlias] = useState(initialAlias);
  const [lightningAddress, setLightningAddress] = useState(
    initialLightningAddress,
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    if (displayName.trim().length < 2) {
      showToast(t("displayNameRequired"), "error");
      return;
    }
    if (payoutMethod === "cbu_alias" && !cbu.trim() && !alias.trim()) {
      showToast(t("destinationRequired"), "error");
      return;
    }
    if (payoutMethod === "lightning_address" && !lightningAddress.trim()) {
      showToast(t("lightningAddressRequired"), "error");
      return;
    }

    const nextAvatarUrl = emptyToNull(avatarUrl);
    if (nextAvatarUrl !== null) {
      try {
        new URL(nextAvatarUrl);
      } catch {
        showToast(t("avatarUrlInvalid"), "error");
        return;
      }
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
        display_name: displayName.trim(),
        bio: emptyToNull(bio),
        avatar_url: nextAvatarUrl,
        banner_url: nextBannerUrl,
        cbu: nextCbu,
        alias: nextAlias,
        lightning_address: nextLightningAddress,
        payout_method: payoutMethod,
      });

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (requiresReSign) {
        const url = new URL(
          "/api/settings",
          window.location.origin,
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
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t("sectionProfile")}</h2>
          <p className={styles.sectionHint}>{t("sectionProfileHint")}</p>
        </header>

        <div className={styles.field}>
          <label htmlFor="display_name" className={styles.label}>
            {t("displayName")}
            <Tooltip
              text={t("displayNameTooltip")}
              example={t("displayNameExample")}
              label={tCommon("tooltipLabel")}
            />
          </label>
          <input
            id="display_name"
            type="text"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="bio" className={styles.label}>
            {t("bio")}
            <Tooltip
              text={t("bioTooltip")}
              label={tCommon("tooltipLabel")}
            />
          </label>
          <textarea
            id="bio"
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="avatar_url" className={styles.label}>
            {t("avatarUrl")}
            <Tooltip
              text={t("avatarUrlTooltip")}
              example={t("avatarUrlExample")}
              label={tCommon("tooltipLabel")}
            />
          </label>
          <input
            id="avatar_url"
            type="url"
            inputMode="url"
            className={styles.input}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={t("avatarUrlPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="banner_url" className={styles.label}>
            {t("bannerUrl")}
            <Tooltip
              text={t("bannerUrlTooltip")}
              example={t("bannerUrlExample")}
              label={tCommon("tooltipLabel")}
            />
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
        </div>

        <div className={styles.field}>
          <label htmlFor="lightning_address" className={styles.label}>
            {t("lightningAddress")}
            <Tooltip
              text={t("lightningAddressTooltip")}
              example={t("lightningAddressExample")}
              label={tCommon("tooltipLabel")}
            />
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
          {lightningAddressFromNostr && lightningAddress ? (
            <p className={styles.hint}>{t("lightningAddressFromNostr")}</p>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t("sectionPayout")}</h2>
          <p className={styles.sectionHint}>{t("sectionPayoutHint")}</p>
        </header>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t("payoutMethod")}</legend>
          <label
            className={`${styles.radio} ${payoutMethod === "cbu_alias" ? styles.radioSelected : ""}`}
          >
            <input
              type="radio"
              name="payout_method"
              value="cbu_alias"
              checked={payoutMethod === "cbu_alias"}
              onChange={() => setPayoutMethod("cbu_alias")}
            />
            <span>
              <strong>{t("railArs")}</strong>
              <span className={styles.radioHint}>{t("railArsHint")}</span>
            </span>
          </label>
          <label
            className={`${styles.radio} ${payoutMethod === "lightning_address" ? styles.radioSelected : ""}`}
          >
            <input
              type="radio"
              name="payout_method"
              value="lightning_address"
              checked={payoutMethod === "lightning_address"}
              onChange={() => setPayoutMethod("lightning_address")}
            />
            <span>
              <strong>{t("railSats")}</strong>
              <span className={styles.radioHint}>{t("railSatsHint")}</span>
            </span>
          </label>
        </fieldset>

        {payoutMethod === "cbu_alias" ? (
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="cbu" className={styles.label}>
                {t("cbu")}
                <Tooltip
                  text={t("cbuTooltip")}
                  example={t("cbuExample")}
                  label={tCommon("tooltipLabel")}
                />
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
                <Tooltip
                  text={t("aliasTooltip")}
                  example={t("aliasExample")}
                  label={tCommon("tooltipLabel")}
                />
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
          </div>
        ) : (
          <p className={styles.hint}>{t("payoutLnNote")}</p>
        )}
      </section>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export default SettingsForm;
