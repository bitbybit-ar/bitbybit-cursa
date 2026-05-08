import { type NextRequest, NextResponse } from "next/server";
import {
  CreateOfferingSchema,
  createOfferingForAdmin,
} from "@/lib/admin/offerings";
import { requireMerchant } from "@/lib/admin/require-merchant";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = CreateOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await createOfferingForAdmin(
    auth.merchant.id,
    parsed.data,
    auth.session.pubkey
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: 409 }
    );
  }

  return NextResponse.json({
    offering: { id: result.offering.id, slug: result.offering.slug },
  });
}
