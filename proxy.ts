import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

// Creator-facing surfaces (My courses, Settings, My sales, My
// students) and the slug-claim flow. Captures the non-default
// locale prefix so we can preserve it across the sign-in bounce;
// an undefined capture means Spanish.
const CREATOR_PATH_RE =
  /^(?:\/(en))?\/(?:mis-cursos|mis-ventas|mis-estudiantes|configuracion|onboarding)(?:\/.*)?$/;

// Legacy `/panel/*` paths from the pre-ADR-0014 panel layout. We
// 308-redirect them to the new top-level routes so existing
// bookmarks and external links keep working.
const LEGACY_PANEL_RE = /^(?:\/(en))?\/panel(?:\/(.*))?$/;
const LEGACY_PANEL_MAP: Record<string, string> = {
  "": "/mis-cursos",
  ofertas: "/mis-cursos",
  pedidos: "/mis-ventas",
  estudiantes: "/mis-estudiantes",
  configuracion: "/configuracion",
};

/**
 * Edge middleware.
 *
 * Two responsibilities:
 *
 *   1. Gate creator-facing surfaces (`/mis-cursos`, `/mis-ventas`,
 *      `/mis-estudiantes`, `/configuracion`, `/onboarding`) to
 *      signed-in users. Anonymous visitors bounce to sign-in
 *      preserving the original target via `?next=`. The
 *      merchant-row + active-merchant checks happen server-side
 *      in each page (via `requireUserMerchant`); the edge gate
 *      just enforces "you must be signed in".
 *
 *   2. Redirect legacy `/panel/*` paths to the new top-level
 *      routes so bookmarks survive the ADR 0014 rename.
 *
 * Everything else falls through to the next-intl locale middleware.
 * Spanish is the default locale and is served unprefixed (`/`,
 * `/foo`); English routes carry the `/en` prefix.
 *
 * The session check uses `verifySessionToken` (jose-only, no
 * `next/headers`) so this whole module runs on the edge runtime.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  const legacyMatch = LEGACY_PANEL_RE.exec(pathname);
  if (legacyMatch) {
    const locale = legacyMatch[1] ?? routing.defaultLocale;
    const localePrefix =
      locale === routing.defaultLocale ? "" : `/${locale}`;
    const subpath = legacyMatch[2] ?? "";
    const [head, ...rest] = subpath.split("/");
    const target = LEGACY_PANEL_MAP[head] ?? LEGACY_PANEL_MAP[""];
    const tail = rest.length ? `/${rest.join("/")}` : "";
    const url = new URL(`${localePrefix}${target}${tail}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  const creatorMatch = CREATOR_PATH_RE.exec(pathname);
  if (creatorMatch) {
    const locale = creatorMatch[1] ?? routing.defaultLocale;
    const session = await readSession(request);

    if (!session) {
      const localePrefix =
        locale === routing.defaultLocale ? "" : `/${locale}`;
      const url = new URL(`${localePrefix}/iniciar-sesion`, request.url);
      // Strip the locale prefix from `next` — the sign-in page
      // re-applies it via next-intl's locale-aware router.
      const targetPath =
        localePrefix && pathname.startsWith(localePrefix)
          ? pathname.slice(localePrefix.length) || "/mis-cursos"
          : pathname || "/mis-cursos";
      url.searchParams.set("next", targetPath);
      return NextResponse.redirect(url);
    }

    // Signed in — fall through. Each page's `requireUserMerchant`
    // lazily creates the merchant row and 404s on deactivation.
  }

  return intlMiddleware(request);
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next|_vercel|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
