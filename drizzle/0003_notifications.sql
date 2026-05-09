-- In-app notifications per ADR 0014. One row per delivery; the
-- recipient is the Nostr pubkey (no FK to merchants — buyers
-- without a merchant row also receive `order.paid` notifications).
-- Polled by the bell component every 30s; read_at null = unread.

CREATE TABLE "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "recipient_pubkey" varchar(64) NOT NULL,
    "kind" varchar(40) NOT NULL,
    "payload" jsonb,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx"
    ON "notifications" ("recipient_pubkey", "created_at");
