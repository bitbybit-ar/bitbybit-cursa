// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDb, cleanDb } from "../../setup";
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
    const result = await createOfferingForAdmin(
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
    expect(result.offering.code_pool).toEqual([]);

    const audit = await testDb.select().from(adminAuditLog);
    expect(audit.length).toBe(1);
    expect(audit[0].actor_pubkey).toBe(ACTOR);
    expect(audit[0].action).toBe("create");
  });

  it("rejects a duplicate slug with slug_taken", async () => {
    await createOfferingForAdmin(
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
});

describe("admin/offerings/updateOfferingForAdmin", () => {
  it("updates editable fields and writes an audit row with the changed keys", async () => {
    const created = await createOfferingForAdmin(
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
    const res = await updateOfferingForAdmin(
      "00000000-0000-0000-0000-000000000000",
      { title: "X" },
      ACTOR
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("not_found");
  });

  it("rejects a slug change that conflicts with another offering", async () => {
    const a = await createOfferingForAdmin(
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
    const created = await createOfferingForAdmin(
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
      created.offering.id,
      ACTOR
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offering.archived_at).not.toBeNull();

    const archived = await listArchivedOfferings();
    expect(archived.length).toBe(1);
    expect(archived[0].id).toBe(created.offering.id);

    const auditRows = await testDb
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, "archive"));
    expect(auditRows.length).toBe(1);
  });

  it("refuses to archive an already-archived offering", async () => {
    const created = await createOfferingForAdmin(
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
    await archiveOfferingForAdmin(created.offering.id, ACTOR);

    const second = await archiveOfferingForAdmin(
      created.offering.id,
      ACTOR
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("already_archived");
  });
});

describe("admin/offerings/list helpers", () => {
  it("listAllOfferings returns active rows ordered newest-first", async () => {
    const a = await createOfferingForAdmin(
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
    const rows = await listAllOfferings();
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe(b.offering.id);
    expect(rows[1].id).toBe(a.offering.id);
  });

  it("getOfferingForAdmin returns archived rows (panel needs them)", async () => {
    const created = await createOfferingForAdmin(
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
    await archiveOfferingForAdmin(created.offering.id, ACTOR);

    const found = await getOfferingForAdmin("fetched");
    expect(found?.id).toBe(created.offering.id);
    expect(found?.archived_at).not.toBeNull();
  });
});
