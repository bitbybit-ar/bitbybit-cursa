import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  await clearSession();
  return NextResponse.json({ ok: true });
}
