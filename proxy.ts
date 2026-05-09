import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

// Creator-facing surfaces gated to signed-in users:
// /settings, /my-courses, /create-course, /orders, /purchases.
// Captures the non-default locale prefix so we can preserve it
// across the sign-in bounce; an undefined capture means Spanish.
const CREATOR_PATH_RE =
  /^(?:\/(en))?\/(?:settings|my-courses|create-course|orders|purchases)(?:\/.*)?$/;

// Legacy paths preserved as 308 redirects so bookmarks and external
// links keep working after the ADR 0014 + 0015 renames. Three
// generations are mapped:
//   pre-0014: /panel/{ofertas,pedidos,estudiantes,configuracion}
//   ADR 0014: /mis-cursos, /mis-ventas, /mis-estudiantes, /configuracion, /onboarding
//   ADR 0015 + final: /my-courses, /orders, /create-course, /purchases, /settings
const LEGACY_PATHS_RE =
  /^(?:\/(en))?\/(panel(?:\/.*)?|mis-cursos(?:\/.*)?|mis-ventas(?:\/.*)?|mis-estudiantes(?:\/.*)?|configuracion(?:\/.*)?|onboarding(?:\/.*)?|explorar(?:\/.*)?|iniciar-sesion(?:\/.*)?|gracias\/.*|reclamar\/.*)$/;

/**
 * Map a legacy pathname (without the locale prefix) to the new
 * canonical English path. Order matters: longer prefixes first so
 * `/mis-cursos/nueva` matches before `/mis-cursos`.
 */
function rewriteLegacyPath(subpath: string): string | null {
  const rewrites: Array<[RegExp, string]> = [
    // Pre-ADR-0014 panel namespace
    [/^\/panel\/configuracion(\/.*)?$/, "/settings$1"],
    [/^\/panel\/ofertas\/nueva$/, "/create-course"],
    [/^\/panel\/ofertas\/([^/]+)\/editar$/, "/my-courses/$1/edit"],
    [/^\/panel\/ofertas(\/.*)?$/, "/my-courses$1"],
    [/^\/panel\/pedidos(\/.*)?$/, "/orders$1"],
    [/^\/panel\/estudiantes(\/.*)?$/, "/orders"],
    [/^\/panel(\/.*)?$/, "/my-courses"],
    // ADR 0014 era — Spanish top-level
    [/^\/mis-cursos\/nueva$/, "/create-course"],
    [/^\/mis-cursos\/([^/]+)\/editar$/, "/my-courses/$1/edit"],
    [/^\/mis-cursos(\/.*)?$/, "/my-courses$1"],
    [/^\/mis-ventas(\/.*)?$/, "/orders$1"],
    [/^\/mis-estudiantes(\/.*)?$/, "/orders"],
    [/^\/configuracion(\/.*)?$/, "/settings$1"],
    [/^\/onboarding(\/.*)?$/, "/sign-in"],
    // Public-route Spanish → English (ADR 0015 final)
    [/^\/explorar(\/.*)?$/, "/explore$1"],
    [/^\/iniciar-sesion(\/.*)?$/, "/sign-in$1"],
    [/^\/gracias\/(.+)$/, "/receipt/$1"],
    [/^\/reclamar\/(.+)$/, "/claim/$1"],
  ];
  for (const [re, target] of rewrites) {
    if (re.test(subpath)) return subpath.replace(re, target);
  }
  return null;
}

/**
 * Edge middleware.
 *
 * Three responsibilities:
 *
 *   1. Redirect every legacy URL to its current canonical form so
 *      old bookmarks survive the renames. 308 preserves the method
 *      and tells search engines the move is permanent.
 *
 *   2. Gate creator-facing surfaces (/settings, /my-courses,
 *      /create-course, /orders, /purchases) to signed-in users.
 *      Anonymous visitors bounce to /sign-in preserving the
 *      original target via ?next=. The merchant-row check happens
 *      server-side in each page (via requireUserMerchant); the
 *      edge gate just enforces "you must be signed in".
 *
 *   3. Everything else falls through to the next-intl locale
 *      middleware. Spanish is the default locale and is served
 *      unprefixed (`/`, `/foo`); English routes carry the `/en`
 *      prefix.
 *
 * The session check uses `verifySessionToken` (jose-only, no
 * `next/headers`) so this whole module runs on the edge runtime.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  const legacyMatch = LEGACY_PATHS_RE.exec(pathname);
  if (legacyMatch) {
    const locale = legacyMatch[1] ?? routing.defaultLocale;
    const localePrefix =
      locale === routing.defaultLocale ? "" : `/${locale}`;
    const subpath = pathname.slice(localePrefix.length);
    const target = rewriteLegacyPath(subpath);
    if (target) {
      const url = new URL(`${localePrefix}${target}`, request.url);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url, 308);
    }
  }

  const creatorMatch = CREATOR_PATH_RE.exec(pathname);
  if (creatorMatch) {
    const locale = creatorMatch[1] ?? routing.defaultLocale;
    const session = await readSession(request);

    if (!session) {
      const localePrefix =
        locale === routing.defaultLocale ? "" : `/${locale}`;
      const url = new URL(`${localePrefix}/sign-in`, request.url);
      // Strip the locale prefix from `next` — the sign-in page
      // re-applies it via next-intl's locale-aware router.
      const targetPath =
        localePrefix && pathname.startsWith(localePrefix)
          ? pathname.slice(localePrefix.length) || "/my-courses"
          : pathname || "/my-courses";
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
