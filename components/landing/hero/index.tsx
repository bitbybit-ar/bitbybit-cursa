import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HeroBubbles } from "./hero-bubbles";
import styles from "./hero.module.scss";

export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section className={styles.heroFrame}>
      <HeroBubbles />
      <div className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            {t.rich("title", {
              gradient: (chunks) => (
                <span className={styles.gradientWord}>{chunks}</span>
              ),
            })}
          </h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
          <div className={styles.ctas}>
            <Button
              href="/explorar"
              variant="primary"
              size="lg"
              className={styles.cta}
            >
              {t("ctaExplore")}
            </Button>
            <Button
              href="/iniciar-sesion?next=/mis-cursos/nueva"
              variant="primary"
              size="lg"
              className={`${styles.cta} ${styles.ctaSoft}`}
            >
              {t("ctaPublish")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
