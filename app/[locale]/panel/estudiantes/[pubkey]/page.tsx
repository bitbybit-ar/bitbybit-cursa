import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { getAdminStudentDetail } from "@/lib/admin/orders";
import { requirePanelMerchant } from "@/lib/admin/panel-context";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pubkey: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.students.detail",
  });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PanelStudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; pubkey: string }>;
}) {
  const { locale, pubkey } = await params;
  setRequestLocale(locale);

  // Bare hex sanity check before hitting the DB.
  if (!/^[0-9a-f]{64}$/i.test(pubkey)) notFound();

  const merchant = await requirePanelMerchant();
  const student = await getAdminStudentDetail(merchant.id, pubkey);
  if (!student) notFound();

  const t = await getTranslations("panel.students.detail");
  const tStatus = await getTranslations("orderStatus");
  const arsFormatter = new Intl.NumberFormat(
    locale === "es" ? "es-AR" : "en-US"
  );
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-US",
    { dateStyle: "short", timeStyle: "short" }
  );

  return (
    <Container column>
      <Link href="/panel/estudiantes" className={styles.back}>
        <ArrowLeftIcon size={16} />
        {t("back")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <code className={styles.pubkey}>{student.pubkey}</code>

      <section className={styles.statGrid}>
        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("orderCount")}</span>
          <span className={styles.statValue}>{student.order_count}</span>
        </Card>
        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("paidCount")}</span>
          <span className={styles.statValue}>{student.paid_count}</span>
        </Card>
        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("totalArs")}</span>
          <span className={styles.statValue}>
            ARS {arsFormatter.format(student.total_ars)}
          </span>
        </Card>
      </section>

      <h2 className={styles.sectionTitle}>{t("ordersHeading")}</h2>
      <ul className={styles.list}>
        {student.orders.map((order) => (
          <li key={order.id} className={styles.item}>
            <Link
              href={`/panel/pedidos/${order.id}`}
              className={styles.row}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {order.offering_title ?? t("unknownOffering")}
                </span>
                <span className={styles.rowMeta}>
                  {dateFormatter.format(order.created_at)} ·{" "}
                  ARS {arsFormatter.format(order.amount_ars)}
                </span>
              </div>
              <span
                className={`${styles.status} ${
                  styles[`status-${order.status}`]
                }`}
              >
                {tStatus(order.status)}
              </span>
              <ArrowRightIcon size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
