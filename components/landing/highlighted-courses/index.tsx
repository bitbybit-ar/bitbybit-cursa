import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { OfferingCard } from "@/components/catalog/offering-card";
import { highlightedCourses } from "@/lib/mock/highlighted-courses";
import styles from "./highlighted-courses.module.scss";

export function HighlightedCourses() {
  const t = useTranslations("landing.highlighted");

  return (
    <Section id="cursos-destacados">
      <header className={styles.header}>
        <h2 className={styles.title}>{t("title")}</h2>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <div className={styles.grid}>
        {highlightedCourses.map(({ offering, merchant }) => (
          <OfferingCard
            key={offering.id}
            offering={offering}
            merchant={merchant}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Button
          href="/explore"
          variant="ghost"
          size="default"
          className={styles.exploreButton}
        >
          {t("exploreMore")}
        </Button>
      </div>
    </Section>
  );
}

export default HighlightedCourses;
