import { useTranslations } from "next-intl";
import { ExternalLinkIcon } from "@/components/icons";
import styles from "./receipt-download.module.scss";

interface ReceiptDownloadProps {
  /** Source URL on the offering. Signed-URL generation is a later chunk. */
  downloadUrl: string | null;
}

export function ReceiptDownload({ downloadUrl }: ReceiptDownloadProps) {
  const t = useTranslations("receipt.download");

  if (!downloadUrl) {
    return (
      <div className={styles.box}>
        <p className={styles.label}>{t("label")}</p>
        <p className={styles.missing}>{t("missing")}</p>
      </div>
    );
  }

  // Plain <a> rather than the shared Button component because the
  // Button uses next-intl's locale-aware Link, which is for internal
  // routes; an external download URL needs a normal anchor.
  return (
    <div className={styles.box}>
      <p className={styles.label}>{t("label")}</p>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cta}
      >
        <ExternalLinkIcon size={18} />
        {t("cta")}
      </a>
    </div>
  );
}

export default ReceiptDownload;
