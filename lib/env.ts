// Centralised environment access. Each helper throws at boot when the
// underlying value is missing in production, and returns a deterministic
// dev/test fallback when one is safe. Callers must use these helpers
// rather than reading `process.env` directly so the failure mode is
// predictable.

export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL is not set. Configure it in .env.local (or your hosting environment) before running the app."
    );
  }
  return url;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local with a Neon (or other Postgres) connection string."
    );
  }
  return url;
}

// JWT signing key for the buyer + admin Nostr session cookie.
// Required in production; deterministic fallback in dev/test so the
// suite can run without env wiring.
export function getAuthSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (raw && raw.length > 0) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Generate one with `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode("dev-secret-change-in-production");
}

// Comma-separated list of hex pubkeys allowed into /panel/*. Decision
// in ADR 0008 — env (not DB) so the very first admin can sign in
// before any row exists.
export function getAdminPubkeys(): string[] {
  const raw = process.env.ADMIN_PUBKEYS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Whether a given pubkey (hex) is permitted into /panel/*. Caller is
// responsible for normalising npub→hex before checking.
export function isAdminPubkey(pubkey: string): boolean {
  return getAdminPubkeys().includes(pubkey);
}
