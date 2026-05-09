import { type NextRequest, NextResponse } from "next/server";
import {
  UpdateMerchantProfileSchema,
  updateMerchantProfile,
} from "@/lib/admin/merchants";
import { requireMerchant } from "@/lib/admin/require-merchant";
import { parseNostrAuthHeader } from "@/lib/nostr/http-auth";
import { validateNip98AuthEvent } from "@/lib/nostr/verify";
import { hashSettingsBody } from "@/lib/admin/sign-settings-payload";

/**
 * Update the current merchant's profile (CBU, alias, autorenewal
 * toggle). Marketplace edition (ADR 0012) — the deployment-wide
 * `settings` singleton is gone; this route now writes to the
 * caller's `merchants` row.
 *
 * ADR 0008's NIP-07 re-sign requirement carries over verbatim: any
 * change that touches a payment-destination field (cbu, alias)
 * requires a NIP-98 kind:27235 signature whose `payload` tag binds
 * to the request body's sha256, and whose pubkey equals the
 * session pubkey.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;

  // Read raw bytes first so the hash matches what the client signed.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = UpdateMerchantProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const cbuChanged =
    parsed.data.cbu !== undefined && parsed.data.cbu !== auth.merchant.cbu;
  const aliasChanged =
    parsed.data.alias !== undefined &&
    parsed.data.alias !== auth.merchant.alias;
  const requiresReSign = cbuChanged || aliasChanged;

  let signedEventId: string | undefined;

  if (requiresReSign) {
    const header = parseNostrAuthHeader(req.headers.get("authorization"));
    if (!header.ok) {
      return NextResponse.json(
        { error: "auth_required", reason: header.reason },
        { status: 401 }
      );
    }

    const payloadHash = await hashSettingsBody(raw);
    const validation = validateNip98AuthEvent(header.event, {
      url: req.nextUrl.toString(),
      method: "PATCH",
      payloadHash,
    });
    if (!validation.ok) {
      if (validation.reason === "clock") {
        return NextResponse.json(
          { error: "auth_clock_skew" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "auth_invalid_signature", reason: validation.reason },
        { status: 400 }
      );
    }

    if (validation.event.pubkey !== auth.session.pubkey) {
      return NextResponse.json(
        { error: "auth_mismatch" },
        { status: 403 }
      );
    }

    signedEventId = validation.event.id;
  }

  const updated = await updateMerchantProfile(
    auth.merchant.id,
    parsed.data,
    auth.session.pubkey,
    { signedEventId }
  );
  return NextResponse.json({
    merchant: {
      cbu: updated.cbu,
      alias: updated.alias,
      features_autorenewal: updated.features_autorenewal,
    },
  });
}
