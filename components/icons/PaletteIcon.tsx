import type { IconProps } from "./types";

export function PaletteIcon({
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
      <path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 1.4-3.4 2 2 0 0 1 1.4-3.4H17a5 5 0 0 0 5-5 9 9 0 0 0-10-8.2z" />
      <circle cx="7.5" cy="10.5" r="1.2" fill={color} />
      <circle cx="9.5" cy="6.5" r="1.2" fill={color} />
      <circle cx="14.5" cy="6.5" r="1.2" fill={color} />
      <circle cx="17.5" cy="10.5" r="1.2" fill={color} />
    </svg>
  );
}
