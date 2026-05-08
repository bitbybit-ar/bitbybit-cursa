// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDb, cleanDb, seedMerchant } from "../../setup";
import { adminAuditLog } from "@/lib/db/schema";
import {
  createOfferingForAdmin,
  updateOfferingForAdmin,
  archiveOfferingForAdmin,
  listAllOfferings,
  listArchivedOfferings,
  getOfferingForAdmin,
} from "@/lib/admin/offerings";

const ACTOR = "a".repeat(64);

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

describe("admin/offerings/createOfferingForAdmin", () => {
  it("inserts a code offering with empty pool and writes an audit row", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const result = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "intro-bitcoin",
        type: "code",
        title: "Intro a Bitcoin",
        description: "Taller online.",
        price_ars: 5000,
      },
      ACTOR
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offering.slug).toBe("intro-bitcoin");
    expect(result.offering.merchant_id).toBe(merchant.id);
    expect(result.offering.code_pool).toEqual([]);

    const audit = await testDb.select().from(adminAuditLog);
    expect(audit.length).toBe(1);
    expect(audit[0].actor_pubkey).toBe(ACTOR);
    expect(audit[0].merchant_id).toBe(merchant.id);
    expect(audit[0].action).toBe("create");
  });

  it("rejects a duplicate slug within one merchant with slug_taken", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    await createOfferingForAdmin(
      merchant.id,
      {
        slug: "dupe",
        type: "code",
        title: "First",
        description: "First.",
        price_ars: 1000,
      },
      ACTOR
    );
    const second = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "dupe",
        type: "code",
        title: "Second",
        description: "Second.",
        price_ars: 2000,
      },
      ACTOR
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("slug_taken");
  });

  it("allows the same slug across different merchants", async () => {
    const a = await seedMerchant({
      pubkey: "a".repeat(64),
      slug: "merch-a",
    });
    const b = await seedMerchant({
      pubkey: "b".repeat(64),
      slug: "merch-b",
    });
    const fromA = await createOfferingForAdmin(
      a.id,
      {
        slug: "shared-slug",
        type: "code",
        title: "From A",
        description: "From A.",
        price_ars: 1000,
      },
      a.pubkey
    );
    const fromB = await createOfferingForAdmin(
      b.id,
      {
        slug: "shared-slug",
        type: "code",
        title: "From B",
        description: "From B.",
        price_ars: 1000,
      },
      b.pubkey
    );
    expect(fromA.ok).toBe(true);
    expect(fromB.ok).toBe(true);
  });
});

describe("admin/offerings/updateOfferingForAdmin", () => {
  it("updates editable fields and writes an audit row with the changed keys", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const created = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "to-edit",
        type: "code",
        title: "Original",
        description: "Original.",
        price_ars: 1000,
      },
      ACTOR
    );
    if (!created.ok) throw new Error("seed failed");

    const updated = await updateOfferingForAdmin(
      merchant.id,
      created.offering.id,
      { title: "New title", price_ars: 1500 },
      ACTOR
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.offering.title).toBe("New title");
    expect(updated.offering.price_ars).toBe(1500);
    expect(updated.offering.slug).toBe("to-edit");

    const auditRows = await testDb
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, "update"));
    expect(auditRows.length).toBe(1);
    const diff = auditRows[0].payload_diff as { changed: string[] };
    expect(diff.changed.sort()).toEqual(["price_ars", "title"]);
  });

  it("returns not_found for an unknown id", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const res = await updateOfferingForAdmin(
      merchant.id,
      "00000000-0000-0000-0000-000000000000",
      { title: "X" },
      ACTOR
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("not_found");
  });

  it("returns not_found when the id belongs to another merchant (cross-tenant scoping)", async () => {
    const owner = await seedMerchant({
      pubkey: "a".repeat(64),
      slug: "owner",
    });
    const intruder = await seedMerchant({
      pubkey: "b".repeat(64),
      slug: "intruder",
    });
    const created = await createOfferingForAdmin(
      owner.id,
      {
        slug: "private",
        type: "code",
        title: "Private",
        description: "Private.",
        price_ars: 1000,
      },
      owner.pubkey
    );
    if (!created.ok) throw new Error("seed failed");

    const res = await updateOfferingForAdmin(
      intruder.id,
      created.offering.id,
      { title: "Hijacked" },
      intruder.pubkey
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("not_found");
  });

  it("rejects a slug change that conflicts with another offering on the same merchant", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const a = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "a-slug",
        type: "code",
        title: "A",
        description: "A.",
        price_ars: 100,
      },
      ACTOR
    );
    const b = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "b-slug",
        type: "code",
        title: "B",
        description: "B.",
        price_ars: 100,
      },
      ACTOR
    );
    if (!a.ok || !b.ok) throw new Error("seed failed");

    const result = await updateOfferingForAdmin(
      merchant.id,
      b.offering.id,
      { slug: "a-slug" },
      ACTOR
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("slug_taken");
  });
});

describe("admin/offerings/archiveOfferingForAdmin", () => {
  it("sets archived_at and writes an audit row", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const created = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "to-archive",
        type: "download",
        title: "Soon-archived",
        description: "Goodbye.",
        price_ars: 500,
        download_url: "https://example.com/file.pdf",
      },
      ACTOR
    );
    if (!created.ok) throw new Error("seed failed");

    const result = await archiveOfferingForAdmin(
      merchant.id,
      created.offering.id,
      ACTOR
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offering.archived_at).not.toBeNull();

    const archived = await listArchivedOfferings(merchant.id);
    expect(archived.length).toBe(1);
    expect(archived[0].id).toBe(created.offering.id);

    const auditRows = await testDb
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, "archive"));
    expect(auditRows.length).toBe(1);
  });

  it("refuses to archive an already-archived offering", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const created = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "already",
        type: "code",
        title: "Already archived",
        description: "Already.",
        price_ars: 500,
      },
      ACTOR
    );
    if (!created.ok) throw new Error("seed failed");
    await archiveOfferingForAdmin(merchant.id, created.offering.id, ACTOR);

    const second = await archiveOfferingForAdmin(
      merchant.id,
      created.offering.id,
      ACTOR
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("already_archived");
  });
});

describe("admin/offerings/list helpers", () => {
  it("listAllOfferings returns active rows for the merchant, newest-first", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const a = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "a",
        type: "code",
        title: "A",
        description: "A.",
        price_ars: 100,
      },
      ACTOR
    );
    const b = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "b",
        type: "code",
        title: "B",
        description: "B.",
        price_ars: 100,
      },
      ACTOR
    );
    if (!a.ok || !b.ok) throw new Error("seed failed");
    const rows = await listAllOfferings(merchant.id);
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe(b.offering.id);
    expect(rows[1].id).toBe(a.offering.id);
  });

  it("listAllOfferings does not leak rows from other merchants", async () => {
    const a = await seedMerchant({
      pubkey: "a".repeat(64),
      slug: "merch-a",
    });
    const b = await seedMerchant({
      pubkey: "b".repeat(64),
      slug: "merch-b",
    });
    await createOfferingForAdmin(
      a.id,
      {
        slug: "from-a",
        type: "code",
        title: "From A",
        description: "From A.",
        price_ars: 100,
      },
      a.pubkey
    );
    await createOfferingForAdmin(
      b.id,
      {
        slug: "from-b",
        type: "code",
        title: "From B",
        description: "From B.",
        price_ars: 100,
      },
      b.pubkey
    );
    const seenByA = await listAllOfferings(a.id);
    expect(seenByA.length).toBe(1);
    expect(seenByA[0].slug).toBe("from-a");
  });

  it("getOfferingForAdmin returns archived rows (panel needs them)", async () => {
    const merchant = await seedMerchant({ pubkey: ACTOR });
    const created = await createOfferingForAdmin(
      merchant.id,
      {
        slug: "fetched",
        type: "code",
        title: "Fetched",
        description: "Fetched.",
        price_ars: 100,
      },
      ACTOR
    );
    if (!created.ok) throw new Error("seed failed");
    await archiveOfferingForAdmin(merchant.id, created.offering.id, ACTOR);

    const found = await getOfferingForAdmin(merchant.id, "fetched");
    expect(found?.id).toBe(created.offering.id);
    expect(found?.archived_at).not.toBeNull();
  });
});
