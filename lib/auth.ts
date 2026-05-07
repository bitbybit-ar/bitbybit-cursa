import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecret, isAdminPubkey } from "@/lib/env";
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
 * - There is no `is_admin` flag — admin status is computed at every
 *   request by checking the pubkey against `ADMIN_PUBKEYS` (env). If
 *   an admin's key is removed from the env list, every existing
 *   session immediately loses panel access without needing to be
 *   re-issued. The opposite would let a stolen JWT keep panel access
 *   even after the deployer revoked the pubkey.
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
 * comment on AuthSession for why.
 */
export function sessionIsAdmin(session: AuthSession | null): boolean {
  if (!session) return false;
  return isAdminPubkey(session.pubkey);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
