import { type NextRequest, NextResponse } from "next/server";
import {
  UpdateMerchantProfileSchema,
  updateMerchantProfile,
} from "@/lib/admin/merchants";
import { requireMerchant } from "@/lib/admin/require-merchant";
import { parseNostrAuthHeader } from "@/lib/nostr/http-auth";
import { validateNip98AuthEvent } from "@/lib/nostr/verify";
import { hashSettingsBody } from "@/lib/admin/sign-settings-payload";
import { getLightningClient, LightningMintError } from "@/lib/lightning";

/**
 * Update the current merchant's profile (CBU, alias, Lightning
 * Address, payout method, autorenewal toggle). Marketplace edition
 * (ADR 0012) — the deployment-wide `settings` singleton is gone;
 * this route writes to the caller's `merchants` row.
 *
 * ADR 0008's NIP-07 re-sign requirement carries over to all
 * payment-destination fields. Per ADR 0015, that now includes
 * `lightning_address` and `payout_method` in addition to cbu/alias.
 * Any change to these requires a NIP-98 kind:27235 signature whose
 * `payload` tag binds to the request body's sha256 and whose
 * pubkey equals the session pubkey.
 *
 * When the merchant sets/changes their `lightning_address` and the
 * sats rail is selected (or about to be), we mint a 1-sat probe
 * invoice via lib/lightning to confirm the upstream provider
 * advertises LUD-21 (the `verify` URL on its callback response).
 * Providers without LUD-21 are rejected — the LN rail has no
 * server-side way to confirm settlement otherwise.
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
  const lightningAddressChanged =
    parsed.data.lightning_address !== undefined &&
    parsed.data.lightning_address !== auth.merchant.lightning_address;
  const payoutMethodChanged =
    parsed.data.payout_method !== undefined &&
    parsed.data.payout_method !== auth.merchant.payout_method;
  const requiresReSign =
    cbuChanged ||
    aliasChanged ||
    lightningAddressChanged ||
    payoutMethodChanged;

  // LUD-21 sanity check (ADR 0015). When a merchant sets/changes
  // their LN address and the sats rail will be active after this
  // PATCH, mint a 1-sat probe invoice to confirm the provider
  // advertises LUD-21. Refuse the save with a friendly error if
  // not — at checkout time we'd have no way to verify settlement.
  const nextLightningAddress =
    parsed.data.lightning_address ?? auth.merchant.lightning_address;
  const willUseSatsRail =
    (parsed.data.payout_method ?? auth.merchant.payout_method) ===
    "lightning_address";
  if (
    lightningAddressChanged &&
    nextLightningAddress &&
    willUseSatsRail
  ) {
    try {
      await getLightningClient().mintInvoice(
        nextLightningAddress,
        1,
        "cursa-probe"
      );
    } catch (err) {
      if (err instanceof LightningMintError) {
        return NextResponse.json(
          { error: "lightning_address_invalid", reason: err.code },
          { status: 400 }
        );
      }
      throw err;
    }
  }

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
      lightning_address: updated.lightning_address,
      payout_method: updated.payout_method,
      features_autorenewal: updated.features_autorenewal,
    },
  });
}
