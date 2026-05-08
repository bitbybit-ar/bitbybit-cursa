// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { testDb, cleanDb, seedMerchant } from "../setup";
import { offerings, orders, merchants } from "@/lib/db/schema";

beforeAll(async () => {
  // Sanity: the test DB must already be migrated.
  // Run `npm run test:db:migrate` once before this suite.
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

describe("db/migrate — merchants", () => {
  it("inserts a merchant keyed by pubkey", async () => {
    const [row] = await testDb
      .insert(merchants)
      .values({
        pubkey: "a".repeat(64),
        slug: "test-prof",
        display_name: "Test Profe",
      })
      .returning();
    expect(row.slug).toBe("test-prof");
    expect(row.active).toBe(true);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects a duplicate pubkey", async () => {
    await testDb.insert(merchants).values({
      pubkey: "a".repeat(64),
      slug: "first",
      display_name: "First",
    });
    await expect(
      testDb.insert(merchants).values({
        pubkey: "a".repeat(64),
        slug: "second",
        display_name: "Second",
      })
    ).rejects.toThrow();
  });

  it("rejects a duplicate slug", async () => {
    await testDb.insert(merchants).values({
      pubkey: "a".repeat(64),
      slug: "shared",
      display_name: "First",
    });
    await expect(
      testDb.insert(merchants).values({
        pubkey: "b".repeat(64),
        slug: "shared",
        display_name: "Second",
      })
    ).rejects.toThrow();
  });
});

describe("db/migrate — offerings", () => {
  it("inserts and reads back a code offering scoped to a merchant", async () => {
    const merchant = await seedMerchant();
    const [row] = await testDb
      .insert(offerings)
      .values({
        merchant_id: merchant.id,
        slug: "bono-4-clases",
        type: "code",
        title: "Bono 4 clases",
        description: "Cuatro clases de piano, válidas por 30 días.",
        price_ars: 28000,
      })
      .returning();

    expect(row.slug).toBe("bono-4-clases");
    expect(row.merchant_id).toBe(merchant.id);
    expect(row.type).toBe("code");
    expect(row.archived_at).toBeNull();
  });

  it("rejects a duplicate slug within one merchant", async () => {
    const merchant = await seedMerchant();
    await testDb.insert(offerings).values({
      merchant_id: merchant.id,
      slug: "duplicado",
      type: "code",
      title: "First",
      description: "First.",
      price_ars: 1000,
    });

    await expect(
      testDb.insert(offerings).values({
        merchant_id: merchant.id,
        slug: "duplicado",
        type: "code",
        title: "Second",
        description: "Second.",
        price_ars: 2000,
      })
    ).rejects.toThrow();
  });

  it("allows the same slug across two different merchants", async () => {
    const a = await seedMerchant({
      pubkey: "a".repeat(64),
      slug: "merch-a",
    });
    const b = await seedMerchant({
      pubkey: "b".repeat(64),
      slug: "merch-b",
    });
    await testDb.insert(offerings).values({
      merchant_id: a.id,
      slug: "shared",
      type: "code",
      title: "From A",
      description: "From A.",
      price_ars: 1000,
    });
    await testDb.insert(offerings).values({
      merchant_id: b.id,
      slug: "shared",
      type: "code",
      title: "From B",
      description: "From B.",
      price_ars: 1000,
    });
  });
});

describe("db/migrate — orders", () => {
  it("accepts an anonymous order with null pubkey", async () => {
    const merchant = await seedMerchant();
    const [offering] = await testDb
      .insert(offerings)
      .values({
        merchant_id: merchant.id,
        slug: "anon-test",
        type: "code",
        title: "Anon",
        description: "Anon.",
        price_ars: 1000,
      })
      .returning();

    const [order] = await testDb
      .insert(orders)
      .values({
        offering_id: offering.id,
        merchant_id: merchant.id,
        amount_ars: 1000,
        amount_sats: 100,
      })
      .returning();

    expect(order.pubkey).toBeNull();
    expect(order.status).toBe("pending");
    expect(order.merchant_id).toBe(merchant.id);
  });

  it("rejects an order whose offering_id does not exist", async () => {
    const merchant = await seedMerchant();
    await expect(
      testDb.insert(orders).values({
        offering_id: "00000000-0000-0000-0000-000000000000",
        merchant_id: merchant.id,
        amount_ars: 1000,
        amount_sats: 100,
      })
    ).rejects.toThrow();
  });
});
