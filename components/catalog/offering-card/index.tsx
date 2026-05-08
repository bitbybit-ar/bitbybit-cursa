import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/icons";
import { PriceTag } from "@/components/catalog/price-tag";
import type { Offering } from "@/lib/offerings";
import styles from "./offering-card.module.scss";

interface MerchantCard {
  slug: string;
  display_name: string;
}

interface OfferingCardProps {
  offering: Offering;
  /**
   * The owning merchant. Required so the card links to the
   * merchant-scoped detail URL `/m/[mslug]/c/[oslug]` and renders
   * the merchant's display name on the card.
   */
  merchant: MerchantCard;
  /**
   * When `true`, hide the merchant byline. Use on a single
   * merchant's storefront (`/m/[slug]`), where the page hero
   * already names them.
   */
  hideMerchant?: boolean;
}

export function OfferingCard({
  offering,
  merchant,
  hideMerchant = false,
}: OfferingCardProps) {
  const t = useTranslations("catalog.card");
  const tType = useTranslations("offering.type");

  return (
    <Link
      href={`/m/${merchant.slug}/c/${offering.slug}`}
      className={styles.link}
    >
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
          {hideMerchant ? null : (
            <p className={styles.byline}>{merchant.display_name}</p>
          )}
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
