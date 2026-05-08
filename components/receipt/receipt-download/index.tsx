import { useTranslations } from "next-intl";
import { ExternalLinkIcon } from "@/components/icons";
import styles from "./receipt-download.module.scss";

interface ReceiptDownloadProps {
  orderId: string;
  /**
   * Whether the offering has a download URL on file. When false,
   * the component renders the "missing" pending state instead of a
   * dead link. The actual URL lives on the offering and never
   * reaches the client; the proxy at `/api/downloads/[orderId]`
   * resolves it after re-checking access.
   */
  isAvailable: boolean;
}

export function ReceiptDownload({
  orderId,
  isAvailable,
}: ReceiptDownloadProps) {
  const t = useTranslations("receipt.download");

  if (!isAvailable) {
    return (
      <div className={styles.box}>
        <p className={styles.label}>{t("label")}</p>
        <p className={styles.missing}>{t("missing")}</p>
      </div>
    );
  }

  // Anchor (not the shared Button) because the proxy URL lives
  // outside next-intl's locale-aware Link routing; the Button
  // component would try to localise the href.
  return (
    <div className={styles.box}>
      <p className={styles.label}>{t("label")}</p>
      <a
        href={`/api/downloads/${orderId}`}
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
