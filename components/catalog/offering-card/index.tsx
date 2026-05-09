import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, UserIcon } from "@/components/icons";
import { PriceTag } from "@/components/catalog/price-tag";
import type { Offering } from "@/lib/offerings";
import styles from "./offering-card.module.scss";

interface MerchantCard {
  slug: string;
  display_name: string;
  avatar_url?: string | null;
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

  const offeringHref = `/m/${merchant.slug}/c/${offering.slug}`;
  const merchantHref = `/m/${merchant.slug}`;

  return (
    <Card variant="hover" className={styles.card}>
      {offering.image_url ? (
        <Link href={offeringHref} className={styles.imageLink}>
          <div className={styles.imageWrap}>
            <Image
              src={offering.image_url}
              alt={offering.title}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className={styles.image}
            />
          </div>
        </Link>
      ) : null}

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={offeringHref} className={styles.titleLink}>
            {offering.title}
          </Link>
        </h3>
        {hideMerchant ? null : (
          <Link href={merchantHref} className={styles.byline}>
            <span className={styles.avatar} aria-hidden="true">
              {merchant.avatar_url ? (
                <Image
                  src={merchant.avatar_url}
                  alt=""
                  width={24}
                  height={24}
                  className={styles.avatarImg}
                />
              ) : (
                <UserIcon size={14} />
              )}
            </span>
            <span className={styles.bylineName}>{merchant.display_name}</span>
          </Link>
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
        <Link href={offeringHref} className={styles.cta}>
          {t("view")} <ArrowRightIcon size={16} />
        </Link>
      </div>
    </Card>
  );
}

export default OfferingCard;
