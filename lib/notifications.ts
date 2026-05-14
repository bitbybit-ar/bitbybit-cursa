import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import type { NotificationKind } from "@/lib/schemas/notifications";

export type NotificationRow = typeof notifications.$inferSelect;

interface EmitInput {
  recipient_pubkey: string;
  kind: NotificationKind;
  payload?: Record<string, unknown>;
}

/**
 * Insert a notification row for `recipient_pubkey`, unless that
 * user has explicitly opted out of this `kind` via
 * `users.notification_prefs` (ADR 0021).
 *
 * The lookup is by-pubkey; the user row may not exist yet (the
 * `notifications` table has no FK on purpose so anonymous-buyer
 * notifications can land before a user row materialises). Missing
 * user → fall through to insert; the recipient can collect the
 * notification once they sign in. Explicit `false` in
 * `notification_prefs[kind]` → silently skip. Any other value
 * (missing key, `true`, or invalid type) → insert.
 */
export async function emitNotification(input: EmitInput): Promise<void> {
  const db = getDb();

  const [recipient] = await db
    .select({ prefs: users.notification_prefs })
    .from(users)
    .where(eq(users.pubkey, input.recipient_pubkey))
    .limit(1);
  if (recipient?.prefs?.[input.kind] === false) return;

  await db.insert(notifications).values({
    recipient_pubkey: input.recipient_pubkey,
    kind: input.kind,
    payload: input.payload ?? null,
  });
}

interface ListOptions {
  limit?: number;
}

export async function listForPubkey(
  pubkey: string,
  options: ListOptions = {}
): Promise<NotificationRow[]> {
  const db = getDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipient_pubkey, pubkey))
    .orderBy(desc(notifications.created_at))
    .limit(options.limit ?? 50);
}

export async function markRead(id: string, pubkey: string): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipient_pubkey, pubkey),
        isNull(notifications.read_at)
      )
    );
}

export async function markAllRead(pubkey: string): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.recipient_pubkey, pubkey),
        isNull(notifications.read_at)
      )
    );
}
