-- Collapse merchants into users per ADR 0016.
--
-- After ADR 0014 every signed-in user already gets a row
-- auto-created in `merchants`, so the merchant/user split was
-- vestigial from the single-tenant era. This migration is a pure
-- structural rename: `merchants` → `users`, `merchant_id` →
-- `user_id` on offerings/orders/admin_audit_log, and the index +
-- FK + unique-constraint names normalised to the new prefix.
--
-- Hand-written rather than emitted by `drizzle-kit generate` for
-- the same reason as 0002/0004: the diff is dense with renames
-- across four tables and drizzle-kit's interactive prompts cannot
-- run in a non-TTY shell. Regenerate the snapshots in
-- `drizzle/meta/` via `drizzle-kit push` before the next schema
-- diff.
--
-- No data backfill required. Payout fields (cbu, alias,
-- lightning_address, payout_method) stay on the renamed `users`
-- row and remain meaningful only for users who actually sell.

ALTER TABLE "merchants" RENAME TO "users";
--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "merchants_pubkey_unique" TO "users_pubkey_unique";
--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "merchants_slug_unique" TO "users_slug_unique";
--> statement-breakpoint
ALTER INDEX "merchants_pubkey_idx" RENAME TO "users_pubkey_idx";
--> statement-breakpoint
ALTER INDEX "merchants_slug_idx" RENAME TO "users_slug_idx";
--> statement-breakpoint
ALTER INDEX "merchants_active_idx" RENAME TO "users_active_idx";
--> statement-breakpoint

-- offerings
ALTER TABLE "offerings" RENAME COLUMN "merchant_id" TO "user_id";
--> statement-breakpoint
ALTER TABLE "offerings" RENAME CONSTRAINT "offerings_merchant_id_fk" TO "offerings_user_id_fk";
--> statement-breakpoint
ALTER INDEX "offerings_merchant_slug_idx" RENAME TO "offerings_user_slug_idx";
--> statement-breakpoint
ALTER INDEX "offerings_merchant_id_idx" RENAME TO "offerings_user_id_idx";
--> statement-breakpoint

-- orders
ALTER TABLE "orders" RENAME COLUMN "merchant_id" TO "user_id";
--> statement-breakpoint
ALTER TABLE "orders" RENAME CONSTRAINT "orders_merchant_id_fk" TO "orders_user_id_fk";
--> statement-breakpoint
ALTER INDEX "orders_merchant_id_idx" RENAME TO "orders_user_id_idx";
--> statement-breakpoint

-- admin_audit_log
ALTER TABLE "admin_audit_log" RENAME COLUMN "merchant_id" TO "user_id";
--> statement-breakpoint
ALTER TABLE "admin_audit_log" RENAME CONSTRAINT "admin_audit_log_merchant_id_fk" TO "admin_audit_log_user_id_fk";
--> statement-breakpoint
ALTER INDEX "admin_audit_log_merchant_id_idx" RENAME TO "admin_audit_log_user_id_idx";
