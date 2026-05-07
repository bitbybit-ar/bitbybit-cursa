import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWapuClient } from "@/lib/wapu";
import { markOrderPaid } from "@/lib/orders";

const SIGNATURE_HEADER = "x-wapu-signature";

const WebhookEventSchema = z.object({
  event_type: z.enum(["invoice.paid", "invoice.expired", "invoice.failed"]),
  invoice_id: z.string(),
  payment_hash: z.string(),
  occurred_at: z.number().int().nonnegative(),
  amount_sats: z.number().int().nonnegative(),
  amount_ars: z.number().int().nonnegative(),
  external_id: z.string(),
  settlement_ref: z.string().nullable(),
});

/**
 * Wapu webhook receiver.
 *
 * Order of operations matters:
 *   1. Read the RAW body (not the parsed JSON). The signature is
 *      computed over the exact bytes Wapu sent; re-serialising via
 *      `req.json()` would change whitespace and key order, breaking
 *      the verification.
 *   2. Verify the signature via the WapuClient. CLAUDE.md rule:
 *      "Verify Wapu webhook signatures. Every incoming webhook must
 *      be authenticated before any state change."
 *   3. Only then parse and act on the payload.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);

  const wapu = getWapuClient();
  if (!wapu.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "invalid_signature" },
      { status: 401 }
    );
  }

  let parsed: z.infer<typeof WebhookEventSchema>;
  try {
    parsed = WebhookEventSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_body",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }

  if (parsed.event_type !== "invoice.paid") {
    // expired / failed are real events but not implemented in v1 —
    // the order stays in `pending` until the invoice TTL elapses
    // and the storefront tells the buyer to try again. Returning
    // 200 prevents Wapu from retrying these forever.
    return NextResponse.json({ ok: true, ignored: parsed.event_type });
  }

  try {
    const result = await markOrderPaid({
      order_id: parsed.external_id,
      payment_hash: parsed.payment_hash,
      settlement_ref: parsed.settlement_ref,
      paid_at: new Date(parsed.occurred_at * 1000),
    });
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (message.includes("not found")) {
      // The webhook references an order id we do not have. Most
      // likely a duplicate/late delivery for an order that was
      // cleaned up, or a misdirected event from another deployment.
      // 200 to stop retries; log so we can investigate.
      console.warn(`[wapu/webhook] unknown order: ${parsed.external_id}`);
      return NextResponse.json({ ok: true, ignored: "unknown_order" });
    }
    console.error("[wapu/webhook] mark-paid failed:", err);
    return NextResponse.json(
      { error: "internal_error", detail: message },
      { status: 500 }
    );
  }
}
