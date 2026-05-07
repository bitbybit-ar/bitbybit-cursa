import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { NostrPubkeySchema } from "@/lib/schemas/primitives";

const CheckoutBodySchema = z.object({
  offering_id: z.string().uuid(),
  /**
   * Pasted at checkout for buyers who want a Nostr DM but no
   * session. Logged-in buyers do not need to send this — the
   * session pubkey wins.
   */
  pubkey: NostrPubkeySchema.optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = CheckoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Logged-in session always wins over a pasted pubkey: the buyer
  // who took the trouble to sign in is the one we credit, even if
  // the form had a stale value pre-filled.
  const session = await getSession();
  const pubkey = session?.pubkey ?? parsed.data.pubkey ?? null;

  try {
    const result = await createOrder({
      offering_id: parsed.data.offering_id,
      pubkey,
    });
    return NextResponse.json({
      order_id: result.order_id,
      invoice: {
        bolt11: result.invoice.bolt11,
        amount_sats: result.invoice.amount_sats,
        amount_ars: result.invoice.amount_ars,
        expires_at: result.invoice.expires_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (message.includes("does not exist") || message.includes("archived")) {
      return NextResponse.json(
        { error: "offering_unavailable", detail: message },
        { status: 404 }
      );
    }
    console.error("[checkout] failed:", err);
    return NextResponse.json(
      { error: "checkout_failed" },
      { status: 502 }
    );
  }
}
