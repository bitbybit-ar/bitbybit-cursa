import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/auth";
import { isAdminPubkey } from "@/lib/env";

const intlMiddleware = createMiddleware(routing);

// Match `/{es,en}/panel` and `/{es,en}/panel/...`. Captures the
// locale so we can preserve it across the sign-in bounce.
const PANEL_PATH_RE = /^\/(es|en)\/panel(?:\/.*)?$/;

/**
 * Edge middleware.
 *
 * Two responsibilities:
 *
 *   1. Gate `/[locale]/panel/*` to admin pubkeys. Decision in ADR
 *      0008. Non-admins receive a 404, NOT a 403 — the surface is
 *      not advertised. Anonymous visitors bounce through sign-in
 *      preserving the original target via `?next=`.
 *
 *   2. Hand everything else to the next-intl locale middleware so
 *      `/` redirects to `/es`, `/foo` accepts both locales, etc.
 *
 * The session check uses `verifySessionToken` (jose-only, no
 * `next/headers`) so this whole module runs on the edge runtime.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const panelMatch = PANEL_PATH_RE.exec(pathname);

  if (panelMatch) {
    const locale = panelMatch[1];
    const session = await readSession(request);

    if (!session) {
      const url = new URL(`/${locale}/iniciar-sesion`, request.url);
      // Strip the locale prefix from `next` — the sign-in page
      // re-applies it via next-intl's locale-aware router.
      const localePrefix = `/${locale}`;
      const targetPath = pathname.startsWith(localePrefix)
        ? pathname.slice(localePrefix.length) || "/panel"
        : pathname;
      url.searchParams.set("next", targetPath);
      return NextResponse.redirect(url);
    }

    if (!isAdminPubkey(session.pubkey)) {
      // 404 (NOT 403) so the panel surface is not advertised to a
      // logged-in non-admin. Routed to next-intl with a rewrite to
      // `/_not-found` so Next renders the standard 404 page in the
      // active locale.
      return new NextResponse(null, { status: 404 });
    }

    // Admin — fall through to the locale middleware so the page
    // renders normally.
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
