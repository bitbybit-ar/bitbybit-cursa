import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, offerings, merchants } from "@/lib/db/schema";
import {
  getWapuClient,
  type DirectPaymentFunding,
} from "@/lib/wapu";
import { pickPayoutAlias } from "@/lib/admin/merchants";

export interface CreateOrderInput {
  offering_id: string;
  /** Hex pubkey from a logged-in session, or pasted at checkout. Null = anonymous. */
  pubkey: string | null;
}

export interface CreateOrderResult {
  order_id: string;
  funding: DirectPaymentFunding;
}

export type CreateOrderError =
  | "offering_not_found"
  | "offering_archived"
  | "merchant_inactive"
  | "merchant_payout_missing";

export class OrderCreateError extends Error {
  constructor(public readonly code: CreateOrderError) {
    super(code);
    this.name = "OrderCreateError";
  }
}

/**
 * Atomically create a pending order row and the matching Wapu
 * direct-payment funding instructions. The order id is the opaque
 * `orderId` that powers the receipt URL
 * `/[locale]/gracias/[orderId]`.
 *
 * Marketplace edition (ADR 0012):
 *   - The offering's merchant must be active and have a payout
 *     destination (alias or CBU) on file.
 *   - Wapu routes the ARS straight to the merchant's
 *     `pickPayoutAlias` value at settlement time. The platform
 *     never holds funds.
 *
 * If Wapu rejects the tentative or funding step we surface the
 * error to the caller and never write the order row — failed
 * checkouts should not leave orphaned `pending` rows polluting any
 * dashboard.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const db = getDb();

  const [row] = await db
    .select({ offering: offerings, merchant: merchants })
    .from(offerings)
    .innerJoin(merchants, eq(offerings.merchant_id, merchants.id))
    .where(eq(offerings.id, input.offering_id))
    .limit(1);

  if (!row) throw new OrderCreateError("offering_not_found");
  const { offering, merchant } = row;
  if (offering.archived_at !== null) {
    throw new OrderCreateError("offering_archived");
  }
  if (!merchant.active) throw new OrderCreateError("merchant_inactive");

  const payoutAlias = pickPayoutAlias(merchant);
  if (!payoutAlias) throw new OrderCreateError("merchant_payout_missing");

  // Insert the order BEFORE calling Wapu so we have an external_id
  // to send (the order's row id). If Wapu fails we delete the row
  // before throwing so failed checkouts do not leave pending rows.
  const [pendingRow] = await db
    .insert(orders)
    .values({
      pubkey: input.pubkey,
      offering_id: offering.id,
      merchant_id: merchant.id,
      amount_ars: offering.price_ars,
      amount_sats: 0,
    })
    .returning();

  try {
    const wapu = getWapuClient();
    const tentative = await wapu.createDirectPayment({
      amount_ars: offering.price_ars,
      alias: payoutAlias,
      receiver_name: merchant.display_name,
      external_id: pendingRow.id,
    });
    const funding = await wapu.issueDirectPaymentFunding(tentative.uuid);

    await db
      .update(orders)
      .set({
        amount_sats: funding.amount_sats,
        payment_hash: funding.payment_hash,
        wapu_tentative_uuid: tentative.uuid,
        bolt11: funding.bolt11,
        updated_at: new Date(),
      })
      .where(eq(orders.id, pendingRow.id));

    return { order_id: pendingRow.id, funding };
  } catch (err) {
    await db.delete(orders).where(eq(orders.id, pendingRow.id));
    throw err;
  }
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

export type ClaimOrderResult =
  | { status: "claimed"; order: typeof orders.$inferSelect }
  | { status: "already_yours"; order: typeof orders.$inferSelect }
  | { status: "already_claimed" }
  | { status: "not_found" };

/**
 * Attach an anonymous order to a logged-in buyer's pubkey. Used by
 * `/api/orders/[orderId]/claim` (called from `/[locale]/reclamar/
 * [orderId]`). The opaque orderId from the receipt URL is the
 * access key; if the buyer can name it, they own it. Decision in
 * ADR 0007.
 *
 * Idempotent on `already_yours` so a buyer who clicks "claim"
 * twice gets a benign success rather than a confusing error.
 * `already_claimed` (the order belongs to a *different* pubkey) is
 * the conflict case the route handler maps to a 409.
 */
export async function claimOrderForBuyer(opts: {
  order_id: string;
  pubkey: string;
}): Promise<ClaimOrderResult> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.order_id))
    .limit(1);

  if (!existing) return { status: "not_found" };
  if (existing.pubkey === opts.pubkey) {
    return { status: "already_yours", order: existing };
  }
  if (existing.pubkey !== null) {
    return { status: "already_claimed" };
  }

  const [updated] = await db
    .update(orders)
    .set({ pubkey: opts.pubkey, updated_at: new Date() })
    .where(eq(orders.id, opts.order_id))
    .returning();
  return { status: "claimed", order: updated };
}

export type RedemptionDrawResult =
  | { status: "assigned"; code: string }
  | { status: "pool_empty" }
  | { status: "not_a_code_offering" }
  | { status: "already_assigned"; code: string };

const DRAW_MAX_ATTEMPTS = 5;

/**
 * Pop a redemption code from `offerings.code_pool` and assign it to
 * `orders.redemption_code`. Called from the Wapu webhook handler
 * after the order transitions to `paid`.
 *
 * Concurrency
 *   neon-http does not support interactive transactions, so we
 *   serialise via optimistic concurrency: the UPDATE on offerings
 *   matches the chosen first-of-pool value, and a racing webhook
 *   that picked the same value sees zero rows updated and retries.
 *   With a 5-attempt cap, simultaneous webhooks for distinct
 *   orders against the same offering converge to distinct codes
 *   even under high concurrency.
 *
 * Idempotency
 *   If the order already has a `redemption_code` (a previous draw
 *   succeeded; the webhook fired again), returns `already_assigned`
 *   without consuming another code from the pool.
 */
export async function drawAndAssignCode(opts: {
  order_id: string;
}): Promise<RedemptionDrawResult> {
  const db = getDb();

  for (let attempt = 0; attempt < DRAW_MAX_ATTEMPTS; attempt++) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, opts.order_id))
      .limit(1);
    if (!order) throw new Error(`Order ${opts.order_id} not found`);
    if (order.redemption_code) {
      return { status: "already_assigned", code: order.redemption_code };
    }

    const [offering] = await db
      .select()
      .from(offerings)
      .where(eq(offerings.id, order.offering_id))
      .limit(1);
    if (!offering) {
      throw new Error(`Offering ${order.offering_id} not found`);
    }
    if (offering.type !== "code") {
      return { status: "not_a_code_offering" };
    }

    const pool = offering.code_pool ?? [];
    if (pool.length === 0) {
      return { status: "pool_empty" };
    }

    const candidate = pool[0];
    const remaining = pool.slice(1);

    // Optimistic pop: only succeed if the pool's first element is
    // still the candidate we picked. A racing webhook that chose
    // the same candidate gets zero rows updated and falls into the
    // next loop iteration, which re-reads the (now-shrunken) pool.
    const popResult = await db
      .update(offerings)
      .set({ code_pool: remaining, updated_at: new Date() })
      .where(
        and(
          eq(offerings.id, offering.id),
          sql`${offerings.code_pool}[1] = ${candidate}`
        )
      )
      .returning({ id: offerings.id });

    if (popResult.length === 0) {
      // Another writer popped this candidate; retry with fresh state.
      continue;
    }

    await db
      .update(orders)
      .set({ redemption_code: candidate, updated_at: new Date() })
      .where(eq(orders.id, opts.order_id));

    return { status: "assigned", code: candidate };
  }

  // Exhausted retries — caller should log + return 500 so Wapu
  // re-delivers the webhook. This should be vanishingly rare in
  // practice; loud failure beats silently dropping the assignment.
  throw new Error(
    `drawAndAssignCode exhausted ${DRAW_MAX_ATTEMPTS} attempts for order ${opts.order_id}`
  );
}
