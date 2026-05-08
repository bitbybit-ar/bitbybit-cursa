import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, BadgeIcon } from "@/components/icons";
import {
  listAllOfferings,
  listArchivedOfferings,
} from "@/lib/admin/offerings";
import { requirePanelMerchant } from "@/lib/admin/panel-context";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "panel.offerings" });
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PanelOfferingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const merchant = await requirePanelMerchant();
  const [active, archived] = await Promise.all([
    listAllOfferings(merchant.id),
    listArchivedOfferings(merchant.id),
  ]);

  const t = await getTranslations("panel.offerings");
  const arsFormatter = new Intl.NumberFormat(
    locale === "es" ? "es-AR" : "en-US",
    { maximumFractionDigits: 0 }
  );

  return (
    <Container column>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <Button href="/panel/ofertas/nueva" variant="primary">
          <BadgeIcon size={16} />
          {t("createCta")}
        </Button>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>{t("activeHeading")}</h2>
        {active.length === 0 ? (
          <Card variant="default" className={styles.empty}>
            <p>{t("emptyActive")}</p>
            <Link
              href="/panel/ofertas/nueva"
              className={styles.emptyLink}
            >
              {t("createCta")} <ArrowRightIcon size={16} />
            </Link>
          </Card>
        ) : (
          <ul className={styles.list}>
            {active.map((row) => (
              <li key={row.id} className={styles.item}>
                <Link
                  href={`/panel/ofertas/${row.slug}/editar`}
                  className={styles.row}
                >
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{row.title}</span>
                    <span className={styles.rowMeta}>
                      <code className={styles.slug}>{row.slug}</code>
                      <span className={styles.dot}>·</span>
                      {t(`type.${row.type}`)}
                      <span className={styles.dot}>·</span>
                      ARS {arsFormatter.format(row.price_ars)}
                    </span>
                  </div>
                  <ArrowRightIcon size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{t("archivedHeading")}</h2>
          <ul className={styles.list}>
            {archived.map((row) => (
              <li key={row.id} className={`${styles.item} ${styles.archivedItem}`}>
                <div className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{row.title}</span>
                    <span className={styles.rowMeta}>
                      <code className={styles.slug}>{row.slug}</code>
                      <span className={styles.dot}>·</span>
                      {t("archivedAt", {
                        date: new Intl.DateTimeFormat(
                          locale === "es" ? "es-AR" : "en-US",
                          { dateStyle: "medium" }
                        ).format(row.archived_at!),
                      })}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
