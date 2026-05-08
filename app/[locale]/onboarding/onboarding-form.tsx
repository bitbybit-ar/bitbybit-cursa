"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  checkAlias,
  checkCbu,
  checkMerchantSlug,
} from "@/lib/admin/ar-bank-id";
import styles from "./page.module.scss";

/**
 * Slug-claim flow for new merchants (ADR 0012). The user already
 * has a Nostr session; this form turns it into a merchant row.
 *
 * Payout fields (CBU / alias) are deliberately optional at claim
 * time — the merchant can fill them in later from the panel before
 * their first sale. The checkout layer rejects orders against
 * offerings whose merchant has no payout destination.
 */
export function OnboardingForm() {
  const t = useTranslations("onboarding.form");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();

  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [destination, setDestination] = useState("");
  const [isPending, setIsPending] = useState(false);

  function clientValidate(): string | null {
    const slugError = checkMerchantSlug(slug);
    if (slugError) return t(`slugErrors.${slugError}`);
    if (displayName.trim().length < 2) return t("displayNameTooShort");
    if (destination.trim().length > 0) {
      const dest = destination.trim();
      if (checkCbu(dest) === null) return null; // valid CBU
      if (checkAlias(dest) === null) return null; // valid alias
      return t("destinationInvalid");
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const clientError = clientValidate();
    if (clientError) {
      showToast(clientError, "error");
      return;
    }

    const dest = destination.trim();
    const isCbu = dest.length > 0 && checkCbu(dest) === null;

    setIsPending(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          alias: !isCbu && dest ? dest : null,
          cbu: isCbu ? dest : null,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (json?.error === "slug_taken") {
          showToast(t("slugTaken"), "error");
          return;
        }
        if (json?.error === "already_claimed") {
          showToast(t("alreadyClaimed"), "error");
          router.push("/panel");
          return;
        }
        showToast(t("saveFailed"), "error");
        return;
      }
      showToast(t("saved"), "success");
      router.push("/panel");
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="slug" className={styles.label}>
          {t("slug")}
        </label>
        <input
          id="slug"
          type="text"
          inputMode="text"
          className={styles.input}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t("slugPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          minLength={3}
          maxLength={40}
          required
        />
        <p className={styles.hint}>{t("slugHint")}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="display_name" className={styles.label}>
          {t("displayName")}
        </label>
        <input
          id="display_name"
          type="text"
          className={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("displayNamePlaceholder")}
          maxLength={80}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="bio" className={styles.label}>
          {t("bio")} <span className={styles.optional}>{t("optional")}</span>
        </label>
        <textarea
          id="bio"
          className={styles.textarea}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("bioPlaceholder")}
          maxLength={500}
          rows={4}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="destination" className={styles.label}>
          {t("destination")}{" "}
          <span className={styles.optional}>{t("optional")}</span>
        </label>
        <input
          id="destination"
          type="text"
          className={styles.input}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={t("destinationPlaceholder")}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={styles.hint}>{t("destinationHint")}</p>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
