import { routing } from "@/i18n/routing";

export function localizedPath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return normalized;
  }
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function alternatesFor(
  locale: string,
  path: string
): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: localizedPath(locale, path),
    languages: Object.fromEntries(
      routing.locales.map((l) => [l, localizedPath(l, path)])
    ),
  };
}
