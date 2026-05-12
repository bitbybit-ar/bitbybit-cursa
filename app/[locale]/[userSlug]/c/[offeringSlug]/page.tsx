import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PriceTag } from "@/components/catalog/price-tag";
import { BuyButton } from "@/components/checkout/buy-button";
import { Avatar } from "@/components/common/avatar";
import { BackLink } from "@/components/common/back-link";
import {
  ArrowRightIcon,
  BoltIcon,
  BookIcon,
  KeyIcon,
} from "@/components/icons";
import { getOfferingByUserAndSlug } from "@/lib/offerings";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{
    locale: string;
    userSlug: string;
    offeringSlug: string;
  }>;
};

// Top-level offering detail (ADR 0017). Slug uniqueness is per-user,
// so the route nests under /[userSlug]. Render per request so seller
// edits propagate without a deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, userSlug, offeringSlug } = await params;
  const row = await getOfferingByUserAndSlug(userSlug, offeringSlug);
  if (!row) return {};
  return {
    title: `${row.offering.title} · ${row.seller.display_name}`,
    description: row.offering.description.slice(0, 160),
    alternates: alternatesFor(
      locale,
      `/${userSlug}/c/${offeringSlug}`
    ),
  };
}

export default async function OfferingPage({ params }: Props) {
  const { locale, userSlug, offeringSlug } = await params;
  setRequestLocale(locale);
  const row = await getOfferingByUserAndSlug(userSlug, offeringSlug);
  if (!row) notFound();
  const { offering, seller } = row;

  const t = await getTranslations("offering");

  const descriptionParagraphs = offering.description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Section className={styles.section}>
      <Container column>
        <BackLink
          fallbackHref="/explore"
          ariaLabel={t("back")}
          className={styles.back}
        />

        <article className={styles.hero}>
          {offering.image_url ? (
            <div className={styles.imageWrap}>
              <Image
                src={offering.image_url}
                alt={offering.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.image}
                priority
              />
            </div>
          ) : null}

          <div className={styles.heroBody}>
            <h1 className={styles.title}>{offering.title}</h1>

            <Link href={`/${seller.slug}`} className={styles.heroByline}>
              <Avatar
                src={seller.avatar_url}
                alt=""
                name={seller.display_name}
                size="sm"
              />
              <span className={styles.heroBylineName}>
                {seller.display_name}
              </span>
            </Link>

            <PriceTag
              priceArs={offering.price_ars}
              priceSats={offering.price_sats}
              size="lg"
            />

            <ul className={styles.badges}>
              <li className={`${styles.badge} ${styles.badgeRail}`}>
                <BoltIcon size={14} />
                {t("rail.lightning")}
              </li>
              <li className={`${styles.badge} ${styles.badgeDelivery}`}>
                {offering.type === "code" ? (
                  <KeyIcon size={14} />
                ) : (
                  <BookIcon size={14} />
                )}
                {t(`delivery.${offering.type}`)}
              </li>
            </ul>

            <BuyButton offeringId={offering.id} />
          </div>
        </article>

        <section className={styles.details}>
          <h2 className={styles.detailsHeading}>{t("details")}</h2>
          {descriptionParagraphs.map((paragraph, index) => (
            <p key={index} className={styles.description}>
              {paragraph}
            </p>
          ))}
        </section>

        <aside className={styles.instructor}>
          <Avatar
            src={seller.avatar_url}
            alt=""
            name={seller.display_name}
            size="lg"
            className={styles.instructorAvatar}
          />
          <div className={styles.instructorBody}>
            <h2 className={styles.instructorHeading}>
              {t("instructor.heading")}
            </h2>
            <p className={styles.instructorName}>{seller.display_name}</p>
            {seller.bio ? (
              <p className={styles.instructorBio}>{seller.bio}</p>
            ) : null}
            <Link
              href={`/${seller.slug}`}
              className={styles.instructorLink}
            >
              {t("instructor.storefrontCta", {
                name: seller.display_name,
              })}
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </aside>
      </Container>
    </Section>
  );
}
