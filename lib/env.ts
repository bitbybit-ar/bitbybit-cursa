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

// Comma-separated list of hex pubkeys allowed into the
// platform-admin moderation surface (separate from per-user
// panel access). ADR 0012 renamed this from `ADMIN_PUBKEYS`
// because the marketplace pivot turned "admin" into two distinct
// roles: every user administers their own panel; only platform
// admins moderate other users. Env (not DB) so the very first
// platform admin can act before any row exists.
export function getPlatformAdminPubkeys(): string[] {
  const raw = process.env.PLATFORM_ADMIN_PUBKEYS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Whether a given pubkey (hex) holds the platform-admin role.
// Caller is responsible for normalising npub→hex before checking.
export function isPlatformAdminPubkey(pubkey: string): boolean {
  return getPlatformAdminPubkeys().includes(pubkey);
}

// Exchange-rate source for the sats↔ARS conversion shown across the
// storefront (ADR 0022). Defaults to Yadio's Argentine crypto-market
// BTC/ARS rate — the parallel rate buyers and Wapu actually transact
// at, not the official rate. Overridable via env so staging can point
// at a deterministic stub. The endpoint MUST return JSON carrying ARS
// per 1 BTC as a positive number under `rate` or `result`
// (Yadio `/convert/1/BTC/ARS` returns both). Not a secret — it is a
// public read-only endpoint — so no NEXT_PUBLIC_ prefix and no
// throw-on-missing: a missing value just uses the default.
export function getExchangeRateApiUrl(): string {
  return (
    process.env.EXCHANGE_RATE_API_URL ??
    "https://api.yadio.io/convert/1/BTC/ARS"
  );
}
