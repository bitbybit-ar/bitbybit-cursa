import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const lastModified = new Date();

  const rootFor = (locale: string) =>
    locale === routing.defaultLocale ? base : `${base}/${locale}`;

  return routing.locales.map((locale) => ({
    url: rootFor(locale),
    lastModified,
    changeFrequency: "monthly",
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, rootFor(l)])
      ),
    },
  }));
}
