"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "@/components/icons";
import styles from "./receipt-code.module.scss";

interface ReceiptCodeProps {
  /** May be null while the webhook hasn't drawn from the code pool yet. */
  code: string | null;
}

export function ReceiptCode({ code }: ReceiptCodeProps) {
  const t = useTranslations("receipt.code");
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Insecure context — surface the code in the visible box instead.
    }
  }

  if (!code) {
    return (
      <div className={styles.box}>
        <p className={styles.label}>{t("label")}</p>
        <p className={styles.pending}>{t("pending")}</p>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <p className={styles.label}>{t("label")}</p>
      <code className={styles.code}>{code}</code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {isCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        {isCopied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}

export default ReceiptCode;
