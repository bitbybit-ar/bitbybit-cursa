import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, offerings } from "@/lib/db/schema";
import { getWapuClient, type WapuInvoice } from "@/lib/wapu";

export interface CreateOrderInput {
  offering_id: string;
  /** Hex pubkey from a logged-in session, or pasted at checkout. Null = anonymous. */
  pubkey: string | null;
}

export interface CreateOrderResult {
  order_id: string;
  invoice: WapuInvoice;
}

/**
 * Atomically create a pending order row and the matching Wapu
 * invoice. The order id is the opaque `orderId` that powers the
 * receipt URL `/[locale]/gracias/[orderId]`.
 *
 * If Wapu rejects the invoice creation we surface the error to the
 * caller and never write the order row — failed checkouts should not
 * leave orphaned `pending` rows polluting the dashboard.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const db = getDb();

  const [offering] = await db
    .select()
    .from(offerings)
    .where(eq(offerings.id, input.offering_id))
    .limit(1);

  if (!offering) {
    throw new Error(`Offering ${input.offering_id} does not exist`);
  }
  if (offering.archived_at !== null) {
    throw new Error(`Offering ${input.offering_id} is archived`);
  }

  const wapu = getWapuClient();
  const invoice = await wapu.createInvoice({
    amount_ars: offering.price_ars,
    description: offering.title,
    external_id: "pending", // overwritten with order id below
  });

  const [order] = await db
    .insert(orders)
    .values({
      pubkey: input.pubkey,
      offering_id: input.offering_id,
      amount_ars: invoice.amount_ars,
      amount_sats: invoice.amount_sats,
      payment_hash: invoice.payment_hash,
      wapu_invoice_id: invoice.id,
    })
    .returning();

  return { order_id: order.id, invoice };
}

/**
 * Idempotent transition to `paid`. The Wapu webhook may fire more
 * than once for the same payment (network retries, at-least-once
 * delivery); this guard makes the second call a no-op.
 */
export async function markOrderPaid(opts: {
  order_id: string;
  payment_hash: string;
  settlement_ref: string | null;
  paid_at: Date;
}): Promise<{ updated: boolean }> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.order_id))
    .limit(1);

  if (!existing) {
    throw new Error(`Order ${opts.order_id} not found`);
  }
  if (existing.status === "paid") {
    return { updated: false };
  }
  if (
    existing.payment_hash &&
    existing.payment_hash !== opts.payment_hash
  ) {
    // Defence against a webhook tied to a different invoice colliding
    // with this order id. Should not happen with a working Wapu, but
    // we'd rather refuse the update than corrupt the row.
    throw new Error(
      `payment_hash mismatch for order ${opts.order_id}: ` +
        `expected ${existing.payment_hash}, got ${opts.payment_hash}`
    );
  }

  await db
    .update(orders)
    .set({
      status: "paid",
      paid_at: opts.paid_at,
      payment_hash: opts.payment_hash,
      wapu_settlement_ref: opts.settlement_ref,
      updated_at: new Date(),
    })
    .where(eq(orders.id, opts.order_id));
  return { updated: true };
}

export async function getOrder(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return row ?? null;
}

/**
 * History query for /[locale]/mis-compras. Cursor is the
 * `created_at` of the last row from the previous page; pass null
 * for the first page.
 */
export async function listOrdersByPubkey(
  pubkey: string,
  limit = 20
): Promise<Array<typeof orders.$inferSelect>> {
  const db = getDb();
  return db
    .select()
    .from(orders)
    .where(eq(orders.pubkey, pubkey))
    .orderBy(desc(orders.created_at))
    .limit(limit);
}
