import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { WotIcon, ArrowRightIcon } from "@/components/icons";
import styles from "./nostr-prompt-card.module.scss";

interface NostrPromptCardProps {
  /** Order id used so the sign-in flow can claim the order on return. */
  orderId: string;
}

export function NostrPromptCard({ orderId }: NostrPromptCardProps) {
  const t = useTranslations("receipt.nostrPrompt");

  return (
    <Card variant="default" className={styles.card}>
      <div className={styles.iconWrap}>
        <WotIcon size={28} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{t("title")}</h3>
        <p className={styles.text}>{t("body")}</p>
      </div>
      <Link
        href={{
          pathname: "/sign-in",
          query: { next: `/claim/${orderId}` },
        }}
        className={styles.cta}
      >
        {t("cta")} <ArrowRightIcon size={16} />
      </Link>
    </Card>
  );
}

export default NostrPromptCard;
