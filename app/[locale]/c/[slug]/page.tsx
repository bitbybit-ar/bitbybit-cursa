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
import { getOfferingBySlug } from "@/lib/offerings";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Offering rows live in Postgres (ADR 0009); render per request so
// title/description/price/archived edits propagate without a deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const offering = await getOfferingBySlug(slug);
  if (!offering) return {};
  return {
    title: offering.title,
    description: offering.description.slice(0, 160),
    alternates: alternatesFor(locale, `/c/${slug}`),
  };
}

export default async function OfferingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const offering = await getOfferingBySlug(slug);
  if (!offering) notFound();

  const t = await getTranslations("offering");

  return (
    <Section>
      <Container column>
        <Link href="/" className={styles.back}>
          <ArrowLeftIcon size={16} />
          {t("back")}
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
