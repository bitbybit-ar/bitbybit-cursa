// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDb, cleanDb } from "../setup";
import { offerings, orders, settings } from "@/lib/db/schema";

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

describe("db/migrate — offerings", () => {
  it("inserts and reads back a code offering", async () => {
    const [row] = await testDb
      .insert(offerings)
      .values({
        slug: "bono-4-clases",
        type: "code",
        title: "Bono 4 clases",
        description: "Cuatro clases de piano, válidas por 30 días.",
        price_ars: 28000,
      })
      .returning();

    expect(row.slug).toBe("bono-4-clases");
    expect(row.type).toBe("code");
    expect(row.archived_at).toBeNull();
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects a duplicate slug", async () => {
    await testDb.insert(offerings).values({
      slug: "duplicado",
      type: "code",
      title: "First",
      description: "First.",
      price_ars: 1000,
    });

    await expect(
      testDb.insert(offerings).values({
        slug: "duplicado",
        type: "code",
        title: "Second",
        description: "Second.",
        price_ars: 2000,
      })
    ).rejects.toThrow();
  });
});

describe("db/migrate — orders", () => {
  it("accepts an anonymous order with null pubkey", async () => {
    const [offering] = await testDb
      .insert(offerings)
      .values({
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
        amount_ars: 1000,
        amount_sats: 100,
      })
      .returning();

    expect(order.pubkey).toBeNull();
    expect(order.status).toBe("pending");
  });

  it("rejects an order whose offering_id does not exist", async () => {
    await expect(
      testDb.insert(orders).values({
        offering_id: "00000000-0000-0000-0000-000000000000",
        amount_ars: 1000,
        amount_sats: 100,
      })
    ).rejects.toThrow();
  });
});

describe("db/migrate — settings singleton", () => {
  it("accepts the id=1 row", async () => {
    const [row] = await testDb
      .insert(settings)
      .values({ id: 1 })
      .returning();
    expect(row.id).toBe(1);
    expect(row.features_autorenewal).toBe(false);
  });

  it("rejects any id other than 1", async () => {
    await expect(
      testDb.insert(settings).values({ id: 2 })
    ).rejects.toThrow();
  });

  it("toggles features_autorenewal", async () => {
    await testDb.insert(settings).values({ id: 1 });
    await testDb
      .update(settings)
      .set({ features_autorenewal: true })
      .where(eq(settings.id, 1));
    const [row] = await testDb.select().from(settings);
    expect(row.features_autorenewal).toBe(true);
  });
});
