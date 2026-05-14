/**
 * Shared constants for auth. Kept in its own file so the edge proxy
 * (`proxy.ts`) can import without pulling in
 * `next/headers`, which the edge runtime rejects. `lib/auth.ts`
 * re-exports these so server callers can keep the single import path.
 */

/**
 * Session cookie name. The `__Host-` prefix is enforced by the
 * browser: the cookie is rejected unless it's marked Secure, has
 * `Path=/`, and has no `Domain` attribute — blocking subdomain
 * cookie injection from any future `*.bitbybit.com.ar` service.
 * Renaming this constant invalidates every outstanding session.
 *
 * In dev (`NODE_ENV !== "production"`), `__Host-` won't work because
 * the cookie can't be Secure over plain HTTP. Fall back to a plain
 * name so local dev keeps working.
 */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-session" : "session";

/**
 * Inactivity timeout for the session cookie, in minutes. Each
 * authenticated request through `proxy.ts` re-mints the cookie with
 * a fresh `SESSION_INACTIVITY_MINUTES` clock — so this is a sliding
 * window, not an absolute lifetime. Idle for this long → cookie
 * expires and the user gets bounced to `/sign-in` on next click.
 */
export const SESSION_INACTIVITY_MINUTES = 60;
