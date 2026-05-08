import { NextResponse } from "next/server";
import { getSession, sessionIsPlatformAdmin } from "@/lib/auth";
import { getMerchantByPubkey } from "@/lib/admin/merchants";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });
  const merchant = await getMerchantByPubkey(session.pubkey);
  return NextResponse.json({
    session: {
      pubkey: session.pubkey,
      locale: session.locale,
      signer_type: session.signer_type,
      // Slim merchant payload: just enough for the client to decide
      // between "render the panel link" and "render onboarding CTA".
      // Profile reads happen server-side from the panel route.
      merchant:
        merchant && merchant.active
          ? {
              id: merchant.id,
              slug: merchant.slug,
              display_name: merchant.display_name,
            }
          : null,
      platform_admin: sessionIsPlatformAdmin(session),
    },
  });
}
