import { MOCK_SATS_PER_ARS } from "@/lib/wapu";

/**
 * Single source of truth for the ARS↔sats conversion the app
 * displays and quotes against. Wapu is the settlement rail; their
 * rate is what we will actually exchange at, so the storefront
 * shows that rate.
 *
 * Today this returns the mock rate baked into `lib/wapu.ts` because
 * the live Wapu rate endpoint isn't wired yet. Swapping to the real
 * fetch is a one-place change: replace the body below with a fetch
 * to Wapu's rate API, keep the 5-minute cache, keep the function
 * signature. Every caller is already routed through `getSatsPerArs`.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { rate: number; expiresAt: number } | null = null;

/**
 * Returns the current sats-per-ARS exchange rate. Cached for 5
 * minutes per process so the storefront doesn't hammer Wapu on
 * every page view. The cache is intentionally process-local — a
 * stale rate across two pods is fine; what we want to avoid is one
 * pod hammering the rate API on every request.
 */
export async function getSatsPerArs(): Promise<number> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.rate;
  const rate = await fetchSatsPerArsFromWapu();
  cached = { rate, expiresAt: now + CACHE_TTL_MS };
  return rate;
}

async function fetchSatsPerArsFromWapu(): Promise<number> {
  // NOTE: deliberate dev placeholder. Wapu's public rate endpoint
  // is not wired yet, so the storefront and the MockWapuClient at
  // funding time both quote against the same constant — that's the
  // only way a buyer's "≈ ARS X" matches what Wapu actually charges
  // in mock mode. When Wapu ships a public rate API, swap the body
  // to a `fetch(..., { next: { revalidate: 0 } })` and rely on the
  // 5-minute in-process cache above. The function signature is
  // already async so no caller changes are needed.
  return MOCK_SATS_PER_ARS;
}

/**
 * Convert a price in one currency to the other using the current
 * rate. Rounds to the nearest integer in the target currency —
 * neither sats nor centavos make sense as fractions in the UI.
 */
export async function convertPrice(
  amount: number,
  from: "ars" | "sats",
  to: "ars" | "sats",
): Promise<number> {
  if (from === to) return amount;
  const rate = await getSatsPerArs();
  if (from === "ars" && to === "sats") return Math.round(amount * rate);
  return Math.round(amount / rate);
}

/**
 * Test-only seam: drop the cache so the next `getSatsPerArs()` call
 * re-fetches. Don't call this from production code paths.
 */
export function __resetExchangeRateCacheForTests(): void {
  cached = null;
}
