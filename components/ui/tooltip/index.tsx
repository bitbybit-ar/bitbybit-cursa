import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./tooltip.module.scss";

interface TooltipProps {
  text: string;
  example?: string;
  label?: string;
  /** When true, the wrapper stretches full-width — use for block children like a fullWidth Button. */
  block?: boolean;
  /**
   * When true, the wrapper itself becomes a tab stop and is linked to
   * the popover via aria-describedby. Use this when wrapping content
   * that can't receive focus on its own (e.g. a disabled button), so
   * keyboard and screen-reader users can still discover the tooltip.
   * Don't use with an already-focusable child — creates a double tab
   * stop.
   */
  focusableWrapper?: boolean;
  /**
   * Optional trigger. When omitted, a "?" button is rendered. When
   * provided, these children are the trigger and the popover appears
   * when the wrapper is hovered — useful for attaching tooltips to
   * disabled controls that can't receive hover events themselves.
   */
  children?: ReactNode;
}

export function Tooltip({
  text,
  example,
  label = "More info",
  block = false,
  focusableWrapper = false,
  children,
}: TooltipProps) {
  const id = useId();
  return (
    <span
      className={cn(styles.wrapper, block && styles.wrapperBlock)}
      tabIndex={focusableWrapper ? 0 : undefined}
      aria-describedby={focusableWrapper ? id : undefined}
    >
      {children ?? (
        <button
          type="button"
          className={styles.trigger}
          aria-label={label}
          aria-describedby={id}
        >
          ?
        </button>
      )}
      <span id={id} role="tooltip" className={styles.popover}>
        <span className={styles.text}>{text}</span>
        {example && <span className={styles.example}>{example}</span>}
      </span>
    </span>
  );
}

export default Tooltip;
