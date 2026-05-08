import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PriceTag } from "@/components/catalog/price-tag";
import { BuyButton } from "@/components/checkout/buy-button";
import { ArrowLeftIcon } from "@/components/icons";
import { getOfferingByMerchantAndSlug } from "@/lib/offerings";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{
    locale: string;
    merchantSlug: string;
    offeringSlug: string;
  }>;
};

// Marketplace-scoped offering detail (ADR 0012). Slug uniqueness
// is per-merchant, so the route nests under /m/[merchantSlug].
// Render per request so merchant edits propagate without a deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, merchantSlug, offeringSlug } = await params;
  const row = await getOfferingByMerchantAndSlug(
    merchantSlug,
    offeringSlug
  );
  if (!row) return {};
  return {
    title: `${row.offering.title} · ${row.merchant.display_name}`,
    description: row.offering.description.slice(0, 160),
    alternates: alternatesFor(
      locale,
      `/m/${merchantSlug}/c/${offeringSlug}`
    ),
  };
}

export default async function OfferingPage({ params }: Props) {
  const { locale, merchantSlug, offeringSlug } = await params;
  setRequestLocale(locale);
  const row = await getOfferingByMerchantAndSlug(
    merchantSlug,
    offeringSlug
  );
  if (!row) notFound();
  const { offering, merchant } = row;

  const t = await getTranslations("offering");

  return (
    <Section>
      <Container column>
        <Link href={`/m/${merchant.slug}`} className={styles.back}>
          <ArrowLeftIcon size={16} />
          {merchant.display_name}
        </Link>

        <article className={styles.layout}>
          {offering.image_url ? (
            <div className={styles.imageWrap}>
              <Image
                src={offering.image_url}
                alt={offering.title}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className={styles.image}
                priority
              />
            </div>
          ) : null}

          <div className={styles.content}>
            <h1 className={styles.title}>{offering.title}</h1>

            <PriceTag
              priceArs={offering.price_ars}
              priceSats={offering.price_sats}
              size="lg"
            />

            <section className={styles.detailsBlock}>
              <h2 className={styles.detailsHeading}>{t("details")}</h2>
              <p className={styles.description}>{offering.description}</p>
              <p className={styles.typeNote}>{t(`type.${offering.type}`)}</p>
            </section>

            <BuyButton offeringId={offering.id} />
          </div>
        </article>
      </Container>
    </Section>
  );
}
