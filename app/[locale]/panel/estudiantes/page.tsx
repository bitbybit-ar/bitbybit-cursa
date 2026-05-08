import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/icons";
import { listAdminStudents } from "@/lib/admin/orders";
import { requirePanelMerchant } from "@/lib/admin/panel-context";
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
    namespace: "panel.students",
  });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PanelStudentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const merchant = await requirePanelMerchant();
  const students = await listAdminStudents(merchant.id);
  const t = await getTranslations("panel.students");
  const arsFormatter = new Intl.NumberFormat(
    locale === "es" ? "es-AR" : "en-US"
  );
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-US",
    { dateStyle: "short" }
  );

  return (
    <Container column>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      {students.length === 0 ? (
        <Card variant="default" className={styles.empty}>
          <p>{t("empty")}</p>
        </Card>
      ) : (
        <ul className={styles.list}>
          {students.map((s) => (
            <li key={s.pubkey} className={styles.item}>
              <Link
                href={`/panel/estudiantes/${s.pubkey}`}
                className={styles.row}
              >
                <div className={styles.rowMain}>
                  <code className={styles.pubkey}>{s.pubkey}</code>
                  <span className={styles.rowMeta}>
                    {t("orderCount", { n: s.order_count })}
                    <span className={styles.dot}>·</span>
                    {t("paidCount", { n: s.paid_count })}
                    <span className={styles.dot}>·</span>
                    ARS {arsFormatter.format(s.total_ars)}
                    <span className={styles.dot}>·</span>
                    {t("lastSeen", {
                      date: dateFormatter.format(s.most_recent),
                    })}
                  </span>
                </div>
                <ArrowRightIcon size={16} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
