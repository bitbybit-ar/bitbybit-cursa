import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BoltIcon } from "@/components/icons";
import styles from "./price-tag.module.scss";

interface PriceTagProps {
  /** Whole pesos. */
  priceArs: number;
  /** Pinned sats price (offerings.price_sats), or null to derive from ARS. */
  priceSats: number | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

// Mirrors MockWapuClient.MOCK_SATS_PER_ARS in lib/wapu.ts. Real
// rate-fetching is a later chunk; until then the storefront and the
// mock wallet agree on this constant.
const FALLBACK_SATS_PER_ARS = 4;

// Why: ARS prices are intrinsically Argentinean. Pin both formatters to
// es-AR (1.234, dot-grouped) regardless of UI locale so en viewers see
// the same numbers a buyer in Argentina would. Sats track es-AR for
// visual consistency with the ARS line directly below it.
const arsFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});
const satsFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function PriceTag({
  priceArs,
  priceSats,
  size = "default",
  className,
}: PriceTagProps) {
  const t = useTranslations("pricing");
  const sats = priceSats ?? priceArs * FALLBACK_SATS_PER_ARS;

  return (
    <div className={cn(styles.priceTag, styles[`size-${size}`], className)}>
      <span className={styles.sats}>
        <BoltIcon size={size === "lg" ? 20 : 16} />
        <strong>{satsFormatter.format(sats)}</strong>
        <span className={styles.unit}>{t("satsSuffix")}</span>
      </span>
      <span className={styles.ars}>
        {t("approximate")} {t("arsPrefix")} {arsFormatter.format(priceArs)}
      </span>
    </div>
  );
}

export default PriceTag;
