import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  merchants,
  offerings,
  orders,
  adminAuditLog,
  offeringType,
  orderStatus,
} from "@/lib/db/schema";

describe("db/schema enums", () => {
  it("offering type covers code and download", () => {
    expect(offeringType.enumValues).toEqual(["code", "download"]);
  });

  it("order status covers the lifecycle", () => {
    expect(orderStatus.enumValues).toEqual([
      "pending",
      "paid",
      "failed",
      "refunded",
    ]);
  });
});

describe("db/schema merchants", () => {
  const config = getTableConfig(merchants);

  it("uses snake_case table name", () => {
    expect(config.name).toBe("merchants");
  });

  it("requires pubkey, slug, and display_name", () => {
    for (const name of ["pubkey", "slug", "display_name"]) {
      const col = config.columns.find((c) => c.name === name);
      expect(col?.notNull, `${name} should be NOT NULL`).toBe(true);
    }
  });

  it("makes pubkey and slug unique (one row per identity, one row per URL)", () => {
    const pubkey = config.columns.find((c) => c.name === "pubkey");
    const slug = config.columns.find((c) => c.name === "slug");
    expect(pubkey?.isUnique).toBe(true);
    expect(slug?.isUnique).toBe(true);
  });

  it("defaults active and features_autorenewal", () => {
    const active = config.columns.find((c) => c.name === "active");
    expect(active?.default).toBe(true);
    expect(active?.notNull).toBe(true);
    const flag = config.columns.find(
      (c) => c.name === "features_autorenewal"
    );
    expect(flag?.default).toBe(false);
    expect(flag?.notNull).toBe(true);
  });

  it("makes cbu and alias nullable so a fresh claim can render the panel", () => {
    for (const name of ["cbu", "alias"]) {
      const col = config.columns.find((c) => c.name === name);
      expect(col?.notNull, `${name} should be nullable`).toBe(false);
    }
  });
});

describe("db/schema offerings", () => {
  const config = getTableConfig(offerings);

  it("uses snake_case table name", () => {
    expect(config.name).toBe("offerings");
  });

  it("requires merchant_id (per ADR 0012)", () => {
    const merchantId = config.columns.find(
      (c) => c.name === "merchant_id"
    );
    expect(merchantId?.notNull).toBe(true);
  });

  it("makes archived_at nullable for soft-delete", () => {
    const archivedAt = config.columns.find((c) => c.name === "archived_at");
    expect(archivedAt?.notNull).toBe(false);
  });

  it("requires title, description, and price_ars", () => {
    for (const name of ["title", "description", "price_ars"]) {
      const col = config.columns.find((c) => c.name === name);
      expect(col?.notNull, `${name} should be NOT NULL`).toBe(true);
    }
  });

  it("makes price_sats nullable so the storefront can quote dynamically", () => {
    const priceSats = config.columns.find((c) => c.name === "price_sats");
    expect(priceSats?.notNull).toBe(false);
  });

  it("references merchants via merchant_id", () => {
    const fk = config.foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "merchant_id")
    );
    expect(fk).toBeDefined();
  });
});

describe("db/schema orders", () => {
  const config = getTableConfig(orders);

  it("makes pubkey nullable so anonymous orders are valid", () => {
    const pubkey = config.columns.find((c) => c.name === "pubkey");
    expect(pubkey?.notNull).toBe(false);
  });

  it("requires offering_id, merchant_id, and the amounts", () => {
    for (const name of [
      "offering_id",
      "merchant_id",
      "amount_ars",
      "amount_sats",
    ]) {
      const col = config.columns.find((c) => c.name === name);
      expect(col?.notNull, `${name} should be NOT NULL`).toBe(true);
    }
  });

  it("defaults status to pending", () => {
    const status = config.columns.find((c) => c.name === "status");
    expect(status?.default).toBe("pending");
  });

  it("references offerings via offering_id", () => {
    const fk = config.foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "offering_id")
    );
    expect(fk).toBeDefined();
  });

  it("references merchants via merchant_id", () => {
    const fk = config.foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "merchant_id")
    );
    expect(fk).toBeDefined();
  });

  it("renamed wapu_invoice_id to wapu_tentative_uuid (direct-payment)", () => {
    expect(
      config.columns.find((c) => c.name === "wapu_tentative_uuid")
    ).toBeDefined();
    expect(
      config.columns.find((c) => c.name === "wapu_invoice_id")
    ).toBeUndefined();
  });
});

describe("db/schema admin_audit_log", () => {
  const config = getTableConfig(adminAuditLog);

  it("requires actor_pubkey, route, and action", () => {
    for (const name of ["actor_pubkey", "route", "action"]) {
      const col = config.columns.find((c) => c.name === name);
      expect(col?.notNull, `${name} should be NOT NULL`).toBe(true);
    }
  });

  it("makes merchant_id nullable for platform-level audit rows", () => {
    const m = config.columns.find((c) => c.name === "merchant_id");
    expect(m?.notNull).toBe(false);
  });

  it("makes payload_diff nullable so non-mutating audits can omit it", () => {
    const diff = config.columns.find((c) => c.name === "payload_diff");
    expect(diff?.notNull).toBe(false);
  });
});
