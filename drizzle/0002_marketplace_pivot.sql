-- Marketplace pivot per ADR 0012.
--
-- Hand-written rather than emitted by `drizzle-kit generate` because
-- the diff combines a column rename, a table drop, and several
-- not-null FK additions; drizzle-kit's interactive prompts cannot run
-- in a non-TTY shell. The downstream snapshots in `drizzle/meta/`
-- are not consumed by the runtime migrator (only by `drizzle-kit
-- generate`); regenerate them with `drizzle-kit push` before the
-- next schema diff.
--
-- This migration is destructive on existing rows by design: ADR 0012
-- treats every offering, order, and audit row as merchant-owned, but
-- the existing rows have no merchant. Pre-launch, the only data on
-- file is the seed. Re-seed after migrating.

TRUNCATE TABLE "admin_audit_log", "orders", "offerings", "settings" RESTART IDENTITY CASCADE;
--> statement-breakpoint
DROP TABLE "settings";
--> statement-breakpoint
CREATE TABLE "merchants" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "pubkey" varchar(64) NOT NULL,
    "slug" varchar(40) NOT NULL,
    "display_name" varchar(80) NOT NULL,
    "bio" text,
    "avatar_url" text,
    "cbu" text,
    "alias" text,
    "features_autorenewal" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "merchants_pubkey_unique" UNIQUE("pubkey"),
    CONSTRAINT "merchants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_pubkey_idx" ON "merchants" USING btree ("pubkey");
--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_slug_idx" ON "merchants" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "merchants_active_idx" ON "merchants" USING btree ("active");
--> statement-breakpoint
ALTER TABLE "offerings" DROP CONSTRAINT IF EXISTS "offerings_slug_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "offerings_slug_idx";
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "merchant_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX "offerings_merchant_slug_idx" ON "offerings" USING btree ("merchant_id", "slug");
--> statement-breakpoint
CREATE INDEX "offerings_merchant_id_idx" ON "offerings" USING btree ("merchant_id");
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "wapu_invoice_id" TO "wapu_tentative_uuid";
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "merchant_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id");
--> statement-breakpoint
CREATE INDEX "orders_merchant_id_idx" ON "orders" USING btree ("merchant_id");
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD COLUMN "merchant_id" uuid;
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id");
--> statement-breakpoint
CREATE INDEX "admin_audit_log_merchant_id_idx" ON "admin_audit_log" USING btree ("merchant_id");
