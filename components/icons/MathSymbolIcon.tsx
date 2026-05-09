import type { IconProps } from "./types";

export function MathSymbolIcon({
  size = 24,
  className,
  color = "currentColor",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 4h14l-7 8 7 8H5l7-8L5 4z" />
    </svg>
  );
}
