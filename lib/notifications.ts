import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { NotificationKind } from "@/lib/schemas/notifications";

export type NotificationRow = typeof notifications.$inferSelect;

interface EmitInput {
  recipient_pubkey: string;
  kind: NotificationKind;
  payload?: Record<string, unknown>;
}

export async function emitNotification(input: EmitInput): Promise<void> {
  const db = getDb();
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
