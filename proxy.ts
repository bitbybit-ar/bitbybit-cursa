import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

// Match `/panel` (unprefixed Spanish, the default locale) and
// `/en/panel`. Captures the non-default locale prefix so we can
// preserve it across the sign-in bounce; an undefined capture
// means Spanish.
const PANEL_PATH_RE = /^(?:\/(en))?\/panel(?:\/.*)?$/;
// Match `/onboarding` and `/en/onboarding`. Reserved for the
// slug-claim flow.
const ONBOARDING_PATH_RE = /^(?:\/(en))?\/onboarding(?:\/.*)?$/;

/**
 * Edge middleware.
 *
 * Two responsibilities:
 *
 *   1. Gate `/[locale]/panel/*` to signed-in users. Anonymous
 *      visitors bounce to sign-in preserving the original target
 *      via `?next=`. ADR 0012: the per-merchant + active-merchant
 *      checks happen server-side in the panel layout, NOT here,
 *      because they require a DB lookup we don't want to run on
 *      every edge request and because moderating a merchant must
 *      revoke their access immediately (no JWT-baked claim).
 *
 *   2. Gate `/[locale]/onboarding` to signed-in users — same
 *      bounce.
 *
 * Everything else falls through to the next-intl locale middleware.
 * Spanish is the default locale and is served unprefixed (`/`,
 * `/foo`); English routes carry the `/en` prefix. `/es/...` is
 * redirected to the unprefixed form by the locale middleware.
 *
 * The session check uses `verifySessionToken` (jose-only, no
 * `next/headers`) so this whole module runs on the edge runtime.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const panelMatch = PANEL_PATH_RE.exec(pathname);
  const onboardingMatch = ONBOARDING_PATH_RE.exec(pathname);

  if (panelMatch || onboardingMatch) {
    const locale =
      panelMatch?.[1] ?? onboardingMatch?.[1] ?? routing.defaultLocale;
    const session = await readSession(request);

    if (!session) {
      // Default locale (es) is unprefixed; other locales carry a
      // `/<locale>` prefix.
      const localePrefix =
        locale === routing.defaultLocale ? "" : `/${locale}`;
      const url = new URL(
        `${localePrefix}/iniciar-sesion`,
        request.url
      );
      // Strip the locale prefix from `next` — the sign-in page
      // re-applies it via next-intl's locale-aware router.
      const fallbackTarget = panelMatch ? "/panel" : "/onboarding";
      const targetPath =
        localePrefix && pathname.startsWith(localePrefix)
          ? pathname.slice(localePrefix.length) || fallbackTarget
          : pathname || fallbackTarget;
      url.searchParams.set("next", targetPath);
      return NextResponse.redirect(url);
    }

    // Signed in — fall through to the locale middleware. The
    // server-side layout decides between rendering the panel,
    // bouncing to /onboarding, or 404'ing a deactivated merchant.
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
