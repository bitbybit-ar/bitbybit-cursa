import { type NextResponse } from "next/server";
import { getSession, sessionIsAdmin, type AuthSession } from "@/lib/auth";

/**
 * Read the current session and assert it belongs to an admin.
 *
 * Used by every `/api/admin/*` route as the first line of
 * defence. Returns either the validated session (admin) or a
 * `NextResponse` the caller should return as-is. Mirrors the
 * 401 / 404 split the panel page middleware uses:
 *   - no session            → 401 (the API IS advertised to
 *                             logged-in clients; an honest 401
 *                             is the right shape).
 *   - session, non-admin    → 404 — the same posture as the
 *                             middleware so the API doesn't leak
 *                             the panel's existence to a curious
 *                             non-admin.
 */
export async function requireAdmin(): Promise<
  | { ok: true; session: AuthSession }
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
  if (!sessionIsAdmin(session)) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "not_found" },
        { status: 404 }
      ),
    };
  }
  return { ok: true, session };
}
