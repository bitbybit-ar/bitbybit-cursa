"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/routing";
import styles from "./code-pool-panel.module.scss";

interface CodePoolPanelProps {
  offeringId: string;
  offeringSlug: string;
  initialRemaining: number;
}

/**
 * Edit-page sidekick for type=code offerings. Two affordances:
 *
 *   1. Mint additional codes — bumps the pool by N. Calls
 *      `POST /api/my-courses/[id]/mint-codes`.
 *   2. Download the current pool as CSV — for sellers to back up
 *      the unused codes before they distribute them in-person.
 *
 * Lives outside `OfferingForm` so a mint action does not require
 * the seller to re-submit the whole form, and so the audit row for
 * "mint_codes" is distinct from "update".
 */
export function CodePoolPanel({
  offeringId,
  offeringSlug,
  initialRemaining,
}: CodePoolPanelProps) {
  const t = useTranslations("myCourses.codePool");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();

  const [remaining, setRemaining] = useState(initialRemaining);
  const [mintCount, setMintCount] = useState("10");
  const [isMinting, setIsMinting] = useState(false);

  async function handleMint() {
    if (isMinting) return;
    const count = Number.parseInt(mintCount, 10);
    if (Number.isNaN(count) || count <= 0 || count > 10_000) {
      showToast(t("invalidCount"), "error");
      return;
    }

    setIsMinting(true);
    try {
      const res = await fetch(`/api/my-courses/${offeringId}/mint-codes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (!res.ok) {
        showToast(t("mintFailed"), "error");
        return;
      }
      const data = (await res.json()) as { pool_size: number };
      setRemaining(data.pool_size);
      showToast(t("mintSuccess", { count }), "success");
      router.refresh();
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t("title")}</h2>
        <p className={styles.subtitle}>
          {t("remaining", { count: remaining })}
        </p>
      </header>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="mintCount" className={styles.label}>
            {t("mintCountLabel")}
          </label>
          <input
            id="mintCount"
            type="number"
            min={1}
            max={10000}
            step={1}
            className={styles.input}
            value={mintCount}
            onChange={(e) => setMintCount(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleMint}
          disabled={isMinting}
        >
          {isMinting ? t("minting") : t("mintCta")}
        </Button>
      </div>

      <a
        href={`/api/my-courses/${offeringId}/codes`}
        download={`${offeringSlug}-codes.csv`}
        className={styles.download}
      >
        {t("downloadCsv")}
      </a>
    </section>
  );
}

export default CodePoolPanel;
