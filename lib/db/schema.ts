import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
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

// --- Merchants ---
// One row per professor/educator selling on the marketplace. Keyed
// by Nostr pubkey — the merchant's identity is their key, period.
// Decision in ADR 0012.
//
// Payout fields (cbu, alias) start null on a fresh claim and get
// filled from the panel before the first sale; the application
// layer rejects checkouts on an offering whose merchant has neither.
//
// `active` is the platform-admin moderation gate. Inactive merchants
// disappear from discovery and their offerings cannot be purchased,
// but the row + history stays for audit.
export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pubkey: varchar("pubkey", { length: 64 }).notNull().unique(),
    slug: varchar("slug", { length: 40 }).notNull().unique(),
    display_name: varchar("display_name", { length: 80 }).notNull(),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    cbu: text("cbu"),
    alias: text("alias"),
    features_autorenewal: boolean("features_autorenewal")
      .notNull()
      .default(false),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchants_pubkey_idx").on(table.pubkey),
    uniqueIndex("merchants_slug_idx").on(table.slug),
    index("merchants_active_idx").on(table.active),
  ]
);

// --- Offerings ---
// Catalog rows. Edited from /[locale]/panel/ofertas. Decisions in
// ADRs 0009 (storage) and 0012 (per-merchant ownership). Soft delete
// via archived_at; hard delete is not exposed in v1 because orders
// reference offerings and we do not want orphaned references.
export const offerings = pgTable(
  "offerings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchant_id: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    // Slug is unique per merchant, not globally — two merchants can
    // both have an offering called "intro-bitcoin".
    slug: varchar("slug", { length: 80 }).notNull(),
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
    uniqueIndex("offerings_merchant_slug_idx").on(
      table.merchant_id,
      table.slug
    ),
    index("offerings_merchant_id_idx").on(table.merchant_id),
    index("offerings_archived_at_idx").on(table.archived_at),
  ]
);

// --- Orders ---
// One row per checkout. id is the opaque orderId in the receipt URL
// /[locale]/gracias/[orderId]. Anonymous orders have null pubkey;
// logged-in or npub-paste-at-checkout orders carry the buyer pubkey
// for DM delivery and history. Decisions in ADRs 0007, 0009, 0012.
//
// merchant_id is denormalized from offering.merchant_id — it could
// be derived through a join, but every panel query filters on it,
// so the index pays for itself.
//
// The Wapu integration moved from invoice-based (single-tenant) to
// direct-payment (marketplace, ADR 0012). `wapu_tentative_uuid`
// holds the direct-payment tentative the buyer is funding; the row
// also still carries `payment_hash` and `bolt11` because those are
// the artifacts the buyer's wallet sees and the UI renders.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable on purpose — anonymous orders are the floor (ADR 0007).
    pubkey: varchar("pubkey", { length: 64 }),
    offering_id: uuid("offering_id")
      .notNull()
      .references(() => offerings.id),
    merchant_id: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    status: orderStatus("status").notNull().default("pending"),
    amount_ars: integer("amount_ars").notNull(),
    amount_sats: integer("amount_sats").notNull(),
    payment_hash: varchar("payment_hash", { length: 64 }),
    wapu_tentative_uuid: text("wapu_tentative_uuid"),
    // BOLT11 invoice string returned by Wapu's funding endpoint.
    // Cached on the row so the checkout page survives reloads (and
    // so the QR can re-render) without re-calling Wapu.
    bolt11: text("bolt11"),
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
    index("orders_merchant_id_idx").on(table.merchant_id),
    index("orders_created_at_idx").on(table.created_at),
  ]
);

// --- Admin audit log ---
// Append-only record of every panel mutation. Decision in ADR 0008.
// payload_diff is jsonb so the shape can evolve per route without
// schema changes; secrets must be redacted at the API layer before
// the write.
//
// merchant_id was added with ADR 0012: every audit row now scopes
// to a merchant for filtering on the platform-admin moderation
// surface. Nullable for forward-compat with platform-level
// mutations that do not belong to any one merchant.
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchant_id: uuid("merchant_id").references(() => merchants.id),
    actor_pubkey: varchar("actor_pubkey", { length: 64 }).notNull(),
    route: text("route").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    payload_diff: jsonb("payload_diff").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_log_actor_pubkey_idx").on(table.actor_pubkey),
    index("admin_audit_log_merchant_id_idx").on(table.merchant_id),
    index("admin_audit_log_created_at_idx").on(table.created_at),
  ]
);
