import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { ArrowLeftIcon } from "@/components/icons";
import { OfferingForm } from "@/components/admin/offering-form";
import { getOfferingForAdmin } from "@/lib/admin/offerings";
import { requirePanelMerchant } from "@/lib/admin/panel-context";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.offerings.edit",
  });
  return {
    title: t("metadataTitle", { slug }),
    robots: { index: false, follow: false },
  };
}

export default async function EditOfferingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const merchant = await requirePanelMerchant();
  const offering = await getOfferingForAdmin(merchant.id, slug);
  if (!offering) notFound();

  const t = await getTranslations("panel.offerings.edit");

  return (
    <Container column>
      <Link href="/panel/ofertas" className={styles.back}>
        <ArrowLeftIcon size={16} />
        {t("back")}
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>
        <code className={styles.slug}>{offering.slug}</code>
        {offering.archived_at ? (
          <span className={styles.archivedTag}>
            {t("archived")}
          </span>
        ) : null}
      </p>

      <OfferingForm offering={offering} />
    </Container>
  );
}
