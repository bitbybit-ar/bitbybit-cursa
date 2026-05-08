import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecret, isPlatformAdminPubkey } from "@/lib/env";
import { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/auth-constants";
import { LocaleSchema, SignerTypeSchema, type Locale, type SignerType } from "@/lib/schemas/auth";

export { SESSION_COOKIE_NAME };

const SESSION_DURATION = `${SESSION_DURATION_DAYS}d`;

/**
 * The session payload that lives inside the signed JWT cookie.
 *
 * Notice what is *not* here:
 *
 * - There is no user id, display name, or avatar — Cursá has no
 *   `users` table; the pubkey IS the identity (ADR 0007).
 * - There is no `merchant_id` — that lookup happens at every
 *   request via `lib/admin/merchants.getMerchantByPubkey`. Same
 *   reasoning as the platform-admin check below: deactivating a
 *   merchant must revoke their panel access immediately, without
 *   waiting for the JWT to expire. ADR 0012.
 * - There is no `platform_admin` flag — platform-admin status is
 *   computed at every request by checking the pubkey against
 *   `PLATFORM_ADMIN_PUBKEYS` (env). If a platform admin's key is
 *   removed from the env list, every existing session
 *   immediately loses moderation access without needing to be
 *   re-issued.
 */
export interface AuthSession {
  pubkey: string;
  locale: Locale;
  /** null when the JWT was issued before signer_type was tracked. */
  signer_type: SignerType | null;
}

interface SessionPayload {
  pubkey: string;
  locale: Locale;
  signer_type?: SignerType | null;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getAuthSecret());
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Pure JWT verification — no `next/headers` dependency. Lets the
 * `/panel` middleware (edge runtime) reuse the same logic without
 * dragging in cookies(), and makes the unit tests trivial.
 */
export async function verifySessionToken(
  token: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const p = payload as unknown as SessionPayload;
    if (!p.pubkey) return null;
    const locale = LocaleSchema.safeParse(p.locale).success
      ? (p.locale as Locale)
      : "es";
    const signerType =
      p.signer_type && SignerTypeSchema.safeParse(p.signer_type).success
        ? p.signer_type
        : null;
    return { pubkey: p.pubkey, locale, signer_type: signerType };
  } catch {
    return null;
  }
}

/**
 * Computed at request time, never serialised into the JWT. See the
 * comment on AuthSession for why. Marketplace-mode replacement for
 * the old `sessionIsAdmin` — the platform-admin role is a separate
 * moderation surface, not the per-merchant panel.
 */
export function sessionIsPlatformAdmin(
  session: AuthSession | null
): boolean {
  if (!session) return false;
  return isPlatformAdminPubkey(session.pubkey);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
