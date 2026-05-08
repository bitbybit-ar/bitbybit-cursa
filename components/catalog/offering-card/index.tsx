import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/icons";
import { PriceTag } from "@/components/catalog/price-tag";
import type { Offering } from "@/lib/offerings";
import styles from "./offering-card.module.scss";

interface OfferingCardProps {
  offering: Offering;
}

export function OfferingCard({ offering }: OfferingCardProps) {
  const t = useTranslations("catalog.card");
  const tType = useTranslations("offering.type");

  return (
    <Link href={`/c/${offering.slug}`} className={styles.link}>
      <Card variant="hover" className={styles.card}>
        {offering.image_url ? (
          <div className={styles.imageWrap}>
            <Image
              src={offering.image_url}
              alt={offering.title}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className={styles.image}
            />
          </div>
        ) : null}

        <div className={styles.body}>
          <h3 className={styles.title}>{offering.title}</h3>
          <p className={styles.description}>{offering.description}</p>
          <p className={styles.typeLabel}>{tType(offering.type)}</p>
        </div>

        <div className={styles.footer}>
          <PriceTag
            priceArs={offering.price_ars}
            priceSats={offering.price_sats}
            size="default"
          />
          <span className={styles.cta}>
            {t("view")} <ArrowRightIcon size={16} />
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default OfferingCard;
