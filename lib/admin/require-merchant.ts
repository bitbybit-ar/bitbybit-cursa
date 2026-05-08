import { type NextResponse } from "next/server";
import { getSession, type AuthSession } from "@/lib/auth";
import {
  getMerchantByPubkey,
  type Merchant,
} from "@/lib/admin/merchants";

/**
 * Read the current session and look up its merchant row.
 *
 * Used by every `/api/admin/*` route as the first line of
 * defence (ADR 0012). Returns either a populated `{ session,
 * merchant }` pair or a `NextResponse` the caller should return
 * as-is. Three failure modes:
 *
 *   - no session            → 401 `unauthorized`
 *   - session, no merchant  → 404 `merchant_required` — the
 *                              caller has not claimed a slug
 *                              yet; the panel layout redirects
 *                              them to /onboarding, but the API
 *                              just rejects.
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
  const merchant = await getMerchantByPubkey(session.pubkey);
  if (!merchant) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "merchant_required" },
        { status: 404 }
      ),
    };
  }
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
