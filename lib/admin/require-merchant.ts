import { type NextResponse } from "next/server";
import { getSession, type AuthSession } from "@/lib/auth";
import {
  ensureMerchantForPubkey,
  type Merchant,
} from "@/lib/admin/merchants";

/**
 * Read the current session and look up (or lazily create) its
 * merchant row.
 *
 * Used by every `/api/settings/*` route. Per ADR 0014, the merchant
 * row is no longer a gate — any signed-in user gets one. The two
 * failure modes are:
 *
 *   - no session            → 401 `unauthorized`
 *   - session, deactivated  → 404 `merchant_inactive` — the
 *                              platform admin disabled this
 *                              merchant; the surface is not
 *                              advertised.
 */
export async function requireMerchant(): Promise<
  | { ok: true; session: AuthSession; merchant: Merchant }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      ),
    };
  }
  const merchant = await ensureMerchantForPubkey(session.pubkey);
  if (!merchant.active) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "merchant_inactive" },
        { status: 404 }
      ),
    };
  }
  return { ok: true, session, merchant };
}
