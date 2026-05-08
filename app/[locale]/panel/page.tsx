import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/icons";
import { getAdminOverview } from "@/lib/admin/stats";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "panel.overview" });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PanelOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stats = await getAdminOverview();
  const t = await getTranslations("panel.overview");
  const tStatus = await getTranslations("orderStatus");

  const arsFormatter = new Intl.NumberFormat(
    locale === "es" ? "es-AR" : "en-US",
    { maximumFractionDigits: 0 }
  );
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-US",
    { dateStyle: "short", timeStyle: "short" }
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <section
        className={styles.statGrid}
        aria-label={t("statGridLabel")}
      >
        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("revenueMtd")}</span>
          <span className={styles.statValue}>
            ARS {arsFormatter.format(stats.revenueArsMtd)}
          </span>
          <span className={styles.statHint}>{t("revenueHint")}</span>
        </Card>

        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("pendingOrders")}</span>
          <span className={styles.statValue}>{stats.pendingCount}</span>
          <span className={styles.statHint}>{t("pendingHint")}</span>
        </Card>

        <Card variant="default" className={styles.statCard}>
          <span className={styles.statLabel}>{t("paidLast30")}</span>
          <span className={styles.statValue}>{stats.paidLast30}</span>
          <span className={styles.statHint}>{t("paidHint")}</span>
        </Card>
      </section>

      <section className={styles.feed}>
        <header className={styles.feedHeader}>
          <h2 className={styles.feedTitle}>{t("recentOrders")}</h2>
          <Link href="/panel/pedidos" className={styles.feedLink}>
            {t("viewAll")} <ArrowRightIcon size={14} />
          </Link>
        </header>

        {stats.recent.length === 0 ? (
          <p className={styles.empty}>{t("recentEmpty")}</p>
        ) : (
          <ul className={styles.list}>
            {stats.recent.map((row) => (
              <li key={row.id} className={styles.row}>
                <Link
                  href={`/panel/pedidos/${row.id}`}
                  className={styles.rowLink}
                >
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {row.offering_title ?? t("unknownOffering")}
                    </span>
                    <span className={styles.rowMeta}>
                      {dateFormatter.format(row.created_at)} ·{" "}
                      ARS {arsFormatter.format(row.amount_ars)}
                    </span>
                  </div>
                  <span
                    className={`${styles.status} ${
                      styles[`status-${row.status}`]
                    }`}
                  >
                    {tStatus(row.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
