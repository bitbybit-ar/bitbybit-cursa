import { type NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

/**
 * Status poll for the checkout page. Public — the orderId in the
 * URL is the access key (≥128 bits of entropy, see ADR 0006).
 *
 * Intentionally minimal payload: the buyer only needs to know
 * whether to keep waiting or pivot to the receipt page. The full
 * order detail (including the redemption code) lives behind
 * /[locale]/gracias/[orderId].
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse> {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    order_id: order.id,
    status: order.status,
    paid_at: order.paid_at?.toISOString() ?? null,
  });
}
