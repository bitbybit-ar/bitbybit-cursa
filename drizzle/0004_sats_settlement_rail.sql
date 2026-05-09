-- Sats settlement rail per ADR 0014.
--
-- Adds the second settlement rail: merchants can pick between
-- 'cbu_alias' (Wapu→ARS) and 'lightning_address' (sats direct to
-- their own LN wallet via LNURL-pay). Existing merchants default to
-- 'cbu_alias' so behavior is unchanged on migration.
--
-- Hand-written rather than emitted by `drizzle-kit generate` for
-- the same reason as 0002: the diff combines two new enums, two
-- new columns each on merchants and orders, and a backfill that
-- needs to land in a specific order. Snapshots in `drizzle/meta/`
-- are not consumed by the runtime migrator.

CREATE TYPE "payout_method" AS ENUM ('cbu_alias', 'lightning_address');
--> statement-breakpoint
CREATE TYPE "order_rail" AS ENUM ('wapu_ars', 'direct_lightning');
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "lightning_address" varchar(128);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_method" "payout_method" NOT NULL DEFAULT 'cbu_alias';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rail" "order_rail" NOT NULL DEFAULT 'wapu_ars';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "lnurl_verify_url" text;
