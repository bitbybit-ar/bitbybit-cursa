import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { BoltIcon } from "@/components/icons";
import { convertPrice } from "@/lib/exchange-rate";
import styles from "./price-tag.module.scss";

interface PriceTagProps {
  /** Whole-unit amount the seller priced the offering at. */
  priceAmount: number;
  /** Which currency `priceAmount` is denominated in. */
  priceCurrency: "ars" | "sats";
  size?: "sm" | "default" | "lg";
  className?: string;
}

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

/**
 * Server-async price renderer. Shows sats prominently (BoltIcon
 * line) and ARS as the secondary "approximate" line. Whichever
 * currency the seller priced in is the canonical value; the other
 * is computed at render time through `lib/exchange-rate.ts`.
 *
 * The "≈" prefix decorates the computed line so buyers can tell at
 * a glance which figure is the seller's chosen price versus the
 * live conversion.
 */
export async function PriceTag({
  priceAmount,
  priceCurrency,
  size = "default",
  className,
}: PriceTagProps) {
  const t = await getTranslations("pricing");

  const sats =
    priceCurrency === "sats"
      ? priceAmount
      : await convertPrice(priceAmount, "ars", "sats");
  const ars =
    priceCurrency === "ars"
      ? priceAmount
      : await convertPrice(priceAmount, "sats", "ars");

  const satsApprox = priceCurrency === "ars";
  const arsApprox = priceCurrency === "sats";

  return (
    <div className={cn(styles.priceTag, styles[`size-${size}`], className)}>
      <span className={styles.sats}>
        <BoltIcon size={size === "lg" ? 20 : 16} />
        {satsApprox ? (
          <span className={styles.approxBadge}>{t("approximate")}</span>
        ) : null}
        <strong>{satsFormatter.format(sats)}</strong>
        <span className={styles.unit}>{t("satsSuffix")}</span>
      </span>
      <span className={styles.ars}>
        {arsApprox ? `${t("approximate")} ` : ""}
        {t("arsPrefix")} {arsFormatter.format(ars)}
      </span>
    </div>
  );
}

export default PriceTag;
