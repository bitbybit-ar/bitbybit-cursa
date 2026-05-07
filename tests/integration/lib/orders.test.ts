// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDb, cleanDb } from "../setup";
import { offerings } from "@/lib/db/schema";
import {
  createOrder,
  markOrderPaid,
  getOrder,
  listOrdersByPubkey,
} from "@/lib/orders";

beforeAll(async () => {
  const { rows } = await testDb.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'offerings'
    ) AS "exists"
  `);
  if (!rows[0]?.exists) {
    throw new Error(
      "Test database is missing the 'offerings' table. Run `npm run test:db:migrate` first."
    );
  }
});

beforeEach(async () => {
  await cleanDb();
});

async function seedOffering(slug = "bono-4-clases") {
  const [row] = await testDb
    .insert(offerings)
    .values({
      slug,
      type: "code",
      title: "Bono 4 clases",
      description: "Cuatro clases.",
      price_ars: 28000,
    })
    .returning();
  return row;
}

const HEX_PUBKEY = "a".repeat(64);

describe("orders/createOrder", () => {
  it("creates an anonymous order with null pubkey and a Wapu invoice", async () => {
    const offering = await seedOffering();
    const result = await createOrder({
      offering_id: offering.id,
      pubkey: null,
    });
    expect(result.invoice.amount_ars).toBe(28000);
    expect(result.invoice.bolt11).toMatch(/^lnbc/);

    const row = await getOrder(result.order_id);
    expect(row?.pubkey).toBeNull();
    expect(row?.status).toBe("pending");
    expect(row?.amount_ars).toBe(28000);
    expect(row?.amount_sats).toBe(result.invoice.amount_sats);
    expect(row?.payment_hash).toBe(result.invoice.payment_hash);
  });

  it("attaches the buyer pubkey when provided", async () => {
    const offering = await seedOffering();
    const result = await createOrder({
      offering_id: offering.id,
      pubkey: HEX_PUBKEY,
    });
    const row = await getOrder(result.order_id);
    expect(row?.pubkey).toBe(HEX_PUBKEY);
  });

  it("rejects a checkout against a non-existent offering", async () => {
    await expect(
      createOrder({
        offering_id: "00000000-0000-0000-0000-000000000000",
        pubkey: null,
      })
    ).rejects.toThrow(/does not exist/);
  });

  it("rejects a checkout against an archived offering", async () => {
    const offering = await seedOffering("archived");
    await testDb
      .update(offerings)
      .set({ archived_at: new Date() })
      .where(eq(offerings.id, offering.id));

    await expect(
      createOrder({ offering_id: offering.id, pubkey: null })
    ).rejects.toThrow(/archived/);
  });
});

describe("orders/markOrderPaid", () => {
  it("transitions pending → paid and stamps paid_at + settlement", async () => {
    const offering = await seedOffering();
    const { order_id } = await createOrder({
      offering_id: offering.id,
      pubkey: null,
    });
    const before = await getOrder(order_id);
    expect(before?.status).toBe("pending");

    const paidAt = new Date();
    const result = await markOrderPaid({
      order_id,
      payment_hash: before!.payment_hash!,
      settlement_ref: "wapu_ref_xyz",
      paid_at: paidAt,
    });

    expect(result.updated).toBe(true);
    const after = await getOrder(order_id);
    expect(after?.status).toBe("paid");
    expect(after?.paid_at?.getTime()).toBeCloseTo(paidAt.getTime(), -3);
    expect(after?.wapu_settlement_ref).toBe("wapu_ref_xyz");
  });

  it("is idempotent — second call returns updated=false and does not overwrite paid_at", async () => {
    const offering = await seedOffering();
    const { order_id } = await createOrder({
      offering_id: offering.id,
      pubkey: null,
    });
    const before = await getOrder(order_id);

    const firstPaidAt = new Date(2026, 0, 1);
    await markOrderPaid({
      order_id,
      payment_hash: before!.payment_hash!,
      settlement_ref: "first",
      paid_at: firstPaidAt,
    });
    const second = await markOrderPaid({
      order_id,
      payment_hash: before!.payment_hash!,
      settlement_ref: "second",
      paid_at: new Date(2026, 5, 1),
    });

    expect(second.updated).toBe(false);
    const after = await getOrder(order_id);
    expect(after?.wapu_settlement_ref).toBe("first");
    expect(after?.paid_at?.getTime()).toBe(firstPaidAt.getTime());
  });

  it("refuses to update when payment_hash mismatches the stored value", async () => {
    const offering = await seedOffering();
    const { order_id } = await createOrder({
      offering_id: offering.id,
      pubkey: null,
    });
    await expect(
      markOrderPaid({
        order_id,
        payment_hash: "b".repeat(64),
        settlement_ref: null,
        paid_at: new Date(),
      })
    ).rejects.toThrow(/payment_hash mismatch/);
  });
});

describe("orders/listOrdersByPubkey", () => {
  it("returns the buyer's orders, newest first", async () => {
    const offering = await seedOffering();
    const a = await createOrder({
      offering_id: offering.id,
      pubkey: HEX_PUBKEY,
    });
    const b = await createOrder({
      offering_id: offering.id,
      pubkey: HEX_PUBKEY,
    });
    const list = await listOrdersByPubkey(HEX_PUBKEY);
    expect(list.length).toBe(2);
    expect(list.map((o) => o.id)).toEqual([b.order_id, a.order_id]);
  });

  it("does not return anonymous orders or other buyers' orders", async () => {
    const offering = await seedOffering();
    await createOrder({ offering_id: offering.id, pubkey: null });
    await createOrder({ offering_id: offering.id, pubkey: "b".repeat(64) });
    const list = await listOrdersByPubkey(HEX_PUBKEY);
    expect(list.length).toBe(0);
  });
});
