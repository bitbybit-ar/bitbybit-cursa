import { NextResponse } from "next/server";
import { getSession, sessionIsAdmin } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });
  return NextResponse.json({
    session: {
      pubkey: session.pubkey,
      locale: session.locale,
      signer_type: session.signer_type,
      is_admin: sessionIsAdmin(session),
    },
  });
}
