import { type NextRequest, NextResponse } from "next/server";
import {
  ClaimMerchantSchema,
  claimMerchant,
  getMerchantByPubkey,
  getMerchantBySlug,
} from "@/lib/admin/merchants";
import { getSession } from "@/lib/auth";

/**
 * Merchant claim endpoint (ADR 0012). The session pubkey is the
 * primary key — anyone with a Nostr identity can claim a slug
 * exactly once. Re-running this against an existing claim is a
 * 409 to surface the unexpected double-submit.
 *
 * Slug uniqueness is enforced both pre-flight (so the response
 * code is honest) and at the DB layer (the unique index).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ClaimMerchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await getMerchantByPubkey(session.pubkey);
  if (existing) {
    return NextResponse.json(
      {
        error: "already_claimed",
        merchant: { id: existing.id, slug: existing.slug },
      },
      { status: 409 }
    );
  }

  const slugTaken = await getMerchantBySlug(parsed.data.slug);
  if (slugTaken) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  const merchant = await claimMerchant(session.pubkey, parsed.data);
  return NextResponse.json({
    merchant: {
      id: merchant.id,
      slug: merchant.slug,
      display_name: merchant.display_name,
    },
  });
}
