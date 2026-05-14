-- Pricing currency picker (ADR 0019).
-- Drops the dual price_ars + optional price_sats model. Adds a
-- single price_amount + price_currency pair where one currency is
-- canonical and the other is computed live from the Wapu rate.

CREATE TYPE "public"."price_currency" AS ENUM('ars', 'sats');
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN IF NOT EXISTS "price_amount" integer;
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN IF NOT EXISTS "price_currency" "price_currency";
--> statement-breakpoint
UPDATE "offerings" SET "price_amount" = "price_ars", "price_currency" = 'ars';
--> statement-breakpoint
ALTER TABLE "offerings" ALTER COLUMN "price_amount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "offerings" ALTER COLUMN "price_currency" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "offerings" DROP COLUMN IF EXISTS "price_ars";
--> statement-breakpoint
ALTER TABLE "offerings" DROP COLUMN IF EXISTS "price_sats";
