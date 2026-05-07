CREATE TYPE "public"."offering_type" AS ENUM('code', 'download');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_pubkey" varchar(64) NOT NULL,
	"route" text NOT NULL,
	"action" varchar(80) NOT NULL,
	"payload_diff" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"type" "offering_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"price_ars" integer NOT NULL,
	"price_sats" integer,
	"image_url" text,
	"code_pool" text[] DEFAULT ARRAY[]::text[],
	"download_url" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offerings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pubkey" varchar(64),
	"offering_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"amount_ars" integer NOT NULL,
	"amount_sats" integer NOT NULL,
	"payment_hash" varchar(64),
	"wapu_invoice_id" text,
	"wapu_settlement_ref" text,
	"redemption_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY NOT NULL,
	"cbu" text,
	"alias" text,
	"features_autorenewal" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(64),
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_pubkey_idx" ON "admin_audit_log" USING btree ("actor_pubkey");--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offerings_slug_idx" ON "offerings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "offerings_archived_at_idx" ON "offerings" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "orders_pubkey_idx" ON "orders" USING btree ("pubkey");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_offering_id_idx" ON "orders" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");