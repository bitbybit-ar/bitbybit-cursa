import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/env";

// Static, indexable routes that exist for every locale. Per-merchant
// storefronts and per-offering pages are not enumerated here — they
// live in Postgres and would require a DB call from the sitemap.
const STATIC_PATHS = [
  { path: "/", priority: 1 },
  { path: "/como-funciona", priority: 0.7 },
  { path: "/caracteristicas", priority: 0.7 },
  { path: "/faq", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const lastModified = new Date();

  return routing.locales.flatMap((locale) =>
    STATIC_PATHS.map(({ path, priority }) => ({
      url: `${base}/${locale}${path === "/" ? "" : path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: locale === routing.defaultLocale ? priority : priority * 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [
            l,
            `${base}/${l}${path === "/" ? "" : path}`,
          ]),
        ),
      },
    })),
  );
}
