import { NextResponse } from "next/server";
import { getSession, sessionIsPlatformAdmin } from "@/lib/auth";
import { getUserByPubkey } from "@/lib/admin/users";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });
  const user = await getUserByPubkey(session.pubkey);
  return NextResponse.json({
    session: {
      pubkey: session.pubkey,
      locale: session.locale,
      signer_type: session.signer_type,
      // Slim user payload: just enough for the client to decide
      // between "render the panel link" and "render onboarding CTA".
      // Profile reads happen server-side from the panel route.
      user:
        user && user.active
          ? {
              id: user.id,
              slug: user.slug,
              display_name: user.display_name,
            }
          : null,
      platform_admin: sessionIsPlatformAdmin(session),
    },
  });
}
