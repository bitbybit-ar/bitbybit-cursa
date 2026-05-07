import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  smallint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Offering type — code redemption (in-person voucher) or downloadable
// asset (signed URL on the receipt page). Decision in ADR 0009.
export const offeringType = pgEnum("offering_type", ["code", "download"]);

// Order status lifecycle.
//   pending  — invoice created, awaiting Lightning payment
//   paid     — Wapu webhook confirmed settlement
//   failed   — invoice expired or webhook reported failure
//   refunded — manual reversal (write actions are v1.1; column exists
//              now so the enum does not need migration when refunds land)
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

// --- Offerings ---
// Catalog rows. Edited from /[locale]/panel/ofertas. Decision in
// ADR 0009. Soft delete via archived_at; hard delete is not exposed
// in v1 because orders reference offerings and we do not want
// orphaned references.
export const offerings = pgTable(
  "offerings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    type: offeringType("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    price_ars: integer("price_ars").notNull(),
    // Optional pinned sats price; when null, the storefront quotes
    // sats from the live ARS rate at checkout time.
    price_sats: integer("price_sats"),
    image_url: text("image_url"),
    // For type=code: pool of redemption codes. For type=download: null.
    code_pool: text("code_pool")
      .array()
      .$type<string[]>()
      .default(sql`ARRAY[]::text[]`),
    // For type=download: source URL signed at delivery time. For
    // type=code: null.
    download_url: text("download_url"),
    archived_at: timestamp("archived_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("offerings_slug_idx").on(table.slug),
    index("offerings_archived_at_idx").on(table.archived_at),
  ]
);

// --- Orders ---
// One row per checkout. id is the opaque orderId in the receipt URL
// /[locale]/gracias/[orderId]. Anonymous orders have null pubkey;
// logged-in or npub-paste-at-checkout orders carry the buyer pubkey
// for DM delivery and history. Decisions in ADRs 0007 and 0009.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable on purpose — anonymous orders are the floor (ADR 0007).
    pubkey: varchar("pubkey", { length: 64 }),
    offering_id: uuid("offering_id")
      .notNull()
      .references(() => offerings.id),
    status: orderStatus("status").notNull().default("pending"),
    amount_ars: integer("amount_ars").notNull(),
    amount_sats: integer("amount_sats").notNull(),
    payment_hash: varchar("payment_hash", { length: 64 }),
    wapu_invoice_id: text("wapu_invoice_id"),
    wapu_settlement_ref: text("wapu_settlement_ref"),
    redemption_code: text("redemption_code"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    paid_at: timestamp("paid_at"),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("orders_pubkey_idx").on(table.pubkey),
    index("orders_status_idx").on(table.status),
    index("orders_offering_id_idx").on(table.offering_id),
    index("orders_created_at_idx").on(table.created_at),
  ]
);

// --- Settings ---
// Singleton row. The id = 1 check enforces "one row, ever".
// Either cbu or alias must be set before the storefront can take
// payouts; the panel form validates this at the application layer
// so the schema can render an empty /panel on a fresh deploy.
// Decision in ADR 0009.
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey(),
    cbu: text("cbu"),
    alias: text("alias"),
    // Runtime toggle for the auto-renewal flow. Code paths are
    // deployed-but-dormant when false; gated by a runtime check
    // (amended ADR 0005).
    features_autorenewal: boolean("features_autorenewal")
      .notNull()
      .default(false),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    // Pubkey of the admin who last touched this row. Always populated
    // by the API layer; nullable to allow the seed insert.
    updated_by: varchar("updated_by", { length: 64 }),
  },
  (table) => [check("settings_singleton", sql`${table.id} = 1`)]
);

// --- Admin audit log ---
// Append-only record of every panel mutation. Decision in ADR 0008.
// payload_diff is jsonb so the shape can evolve per route without
// schema changes; secrets must be redacted at the API layer before
// the write.
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor_pubkey: varchar("actor_pubkey", { length: 64 }).notNull(),
    route: text("route").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    payload_diff: jsonb("payload_diff").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_log_actor_pubkey_idx").on(table.actor_pubkey),
    index("admin_audit_log_created_at_idx").on(table.created_at),
  ]
);
