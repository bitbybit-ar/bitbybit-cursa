import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ArrowLeftIcon } from "@/components/icons";
import { OfferingForm } from "@/components/admin/offering-form";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "myCourses.create",
  });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function NewOfferingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("myCourses.create");

  return (
    <Section>
      <Container column>
      <Link href="/mis-cursos" className={styles.back}>
        <ArrowLeftIcon size={16} />
        {t("back")}
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>

      <OfferingForm />
      </Container>
    </Section>
  );
}
