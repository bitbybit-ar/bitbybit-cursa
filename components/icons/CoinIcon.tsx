import type { IconProps } from "./types";

export function CoinIcon({
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
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5h-1A2.5 2.5 0 0 0 8.5 10c0 2.5 5 1.5 5 4a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 7.5 15" />
      <path d="M11 6v1.5M11 16.5V18" />
    </svg>
  );
}
