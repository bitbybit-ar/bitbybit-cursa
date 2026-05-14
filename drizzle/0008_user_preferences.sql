-- User preferences + soft-delete columns (ADR 0021).
--
-- Three additive columns on the users table:
--
-- * `locale` — default UI language. Navbar's locale switch is
--   session-only; this is the value applied on next sign-in.
-- * `notification_prefs` — per-kind opt-out jsonb. Missing key or
--   `true` keeps the notification enabled; `false` filters it out
--   in `lib/notifications.ts:emitNotification`. Default `{}` so
--   every notification is enabled out of the box.
-- * `deleted_at` — soft-delete timestamp. Set by the new "Delete
--   account" flow in /settings. PII fields get scrubbed in the
--   same statement; the row stays so foreign keys remain valid.
--
-- Pure additive change. Existing rows pick up the defaults; no
-- data migration needed.

ALTER TABLE "users" ADD COLUMN "locale" varchar(2) NOT NULL DEFAULT 'es';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;
