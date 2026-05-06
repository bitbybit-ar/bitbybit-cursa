import { routing } from "@/i18n/routing";

export function alternatesFor(
  locale: string,
  path: string
): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries(
      routing.locales.map((l) => [l, `/${l}${path}`])
    ),
  };
}
