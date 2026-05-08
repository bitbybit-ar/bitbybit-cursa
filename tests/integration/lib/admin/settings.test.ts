// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDb, cleanDb } from "../../setup";
import { adminAuditLog, settings } from "@/lib/db/schema";
import {
  getOrInitSettings,
  updateSettingsForAdmin,
} from "@/lib/admin/settings";

const ACTOR = "f".repeat(64);

beforeAll(async () => {
  const { rows } = await testDb.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'settings'
    ) AS "exists"
  `);
  if (!rows[0]?.exists) {
    throw new Error(
      "Test database is missing the 'settings' table. Run `npm run test:db:migrate` first."
    );
  }
});

beforeEach(async () => {
  await cleanDb();
});

describe("admin/settings/getOrInitSettings", () => {
  it("inserts a defaults row on a fresh database", async () => {
    const row = await getOrInitSettings();
    expect(row.id).toBe(1);
    expect(row.cbu).toBeNull();
    expect(row.alias).toBeNull();
    expect(row.features_autorenewal).toBe(false);

    const stored = await testDb.select().from(settings);
    expect(stored.length).toBe(1);
  });

  it("is idempotent — running twice does not insert a duplicate", async () => {
    await getOrInitSettings();
    await getOrInitSettings();
    const stored = await testDb.select().from(settings);
    expect(stored.length).toBe(1);
  });
});

describe("admin/settings/updateSettingsForAdmin", () => {
  it("persists payout details and the autorenewal toggle, with audit", async () => {
    const updated = await updateSettingsForAdmin(
      {
        cbu: "0000003100000000000001",
        alias: "MI.ALIAS.MP",
        features_autorenewal: true,
      },
      ACTOR
    );
    expect(updated.cbu).toBe("0000003100000000000001");
    expect(updated.alias).toBe("MI.ALIAS.MP");
    expect(updated.features_autorenewal).toBe(true);
    expect(updated.updated_by).toBe(ACTOR);

    const audit = await testDb
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, "update"));
    expect(audit.length).toBe(1);
    const diff = audit[0].payload_diff as { changed: string[] };
    expect(diff.changed.sort()).toEqual([
      "alias",
      "cbu",
      "features_autorenewal",
    ]);
  });

  it("only records the keys that actually changed in the audit diff", async () => {
    await updateSettingsForAdmin(
      { cbu: "0000003100000000000001" },
      ACTOR
    );
    // Clear the first audit row so we can isolate the second update.
    await testDb.delete(adminAuditLog);

    await updateSettingsForAdmin(
      { features_autorenewal: true },
      ACTOR
    );
    const audit = await testDb.select().from(adminAuditLog);
    expect(audit.length).toBe(1);
    const diff = audit[0].payload_diff as { changed: string[] };
    expect(diff.changed).toEqual(["features_autorenewal"]);
  });

  it("does not record unchanged fields even when present in the patch", async () => {
    await updateSettingsForAdmin(
      { cbu: "0000003100000000000001" },
      ACTOR
    );
    await testDb.delete(adminAuditLog);

    // Re-submit the same value alongside a new alias.
    await updateSettingsForAdmin(
      {
        cbu: "0000003100000000000001",
        alias: "NEW.ALIAS",
      },
      ACTOR
    );
    const audit = await testDb.select().from(adminAuditLog);
    const diff = audit[0].payload_diff as { changed: string[] };
    expect(diff.changed).toEqual(["alias"]);
  });
});
