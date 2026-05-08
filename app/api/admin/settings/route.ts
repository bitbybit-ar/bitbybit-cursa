import { type NextRequest, NextResponse } from "next/server";
import {
  UpdateSettingsSchema,
  updateSettingsForAdmin,
} from "@/lib/admin/settings";
import { requireAdmin } from "@/lib/admin/require-admin";

/**
 * Update merchant settings. ADR 0008 calls for a NIP-07 re-sign
 * step on payment-destination changes (CBU, alias). That gate is
 * NOT enforced here yet — the v1 admin panel landed without the
 * `signWithPrompt` machinery, so a re-sign flow would require
 * porting more of the arena signer-context. The audit log
 * captures every change with the actor's pubkey in the meantime.
 * Tracked as a follow-up.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updated = await updateSettingsForAdmin(
    parsed.data,
    auth.session.pubkey
  );
  return NextResponse.json({
    settings: {
      cbu: updated.cbu,
      alias: updated.alias,
      features_autorenewal: updated.features_autorenewal,
    },
  });
}
