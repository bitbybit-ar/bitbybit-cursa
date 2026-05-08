import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { OfferingCard } from "@/components/catalog/offering-card";
import { listOfferingsForMerchantSlug } from "@/lib/offerings";
import { alternatesFor } from "@/lib/seo";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{ locale: string; merchantSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, merchantSlug } = await params;
  const data = await listOfferingsForMerchantSlug(merchantSlug);
  if (!data) return {};
  return {
    title: data.merchant.display_name,
    description:
      data.merchant.bio?.slice(0, 160) ?? data.merchant.display_name,
    alternates: alternatesFor(locale, `/m/${merchantSlug}`),
  };
}

export default async function MerchantStorePage({ params }: Props) {
  const { locale, merchantSlug } = await params;
  setRequestLocale(locale);
  const data = await listOfferingsForMerchantSlug(merchantSlug);
  if (!data) notFound();
  const { merchant, offerings } = data;

  const t = await getTranslations("storefront");

  return (
    <>
      <Section>
        <Container column>
          <header className={styles.hero}>
            {merchant.avatar_url ? (
              <div className={styles.avatarWrap}>
                <Image
                  src={merchant.avatar_url}
                  alt=""
                  fill
                  sizes="120px"
                  className={styles.avatar}
                />
              </div>
            ) : null}
            <h1 className={styles.title}>{merchant.display_name}</h1>
            {merchant.bio ? (
              <p className={styles.bio}>{merchant.bio}</p>
            ) : null}
          </header>
        </Container>
      </Section>

      <Section alternate>
        <Container column>
          <h2 className={styles.listHeading}>{t("offeringsHeading")}</h2>
          {offerings.length === 0 ? (
            <p className={styles.empty}>{t("empty")}</p>
          ) : (
            <div className={styles.grid}>
              {offerings.map((offering) => (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  merchant={{
                    slug: merchant.slug,
                    display_name: merchant.display_name,
                  }}
                  hideMerchant
                />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
