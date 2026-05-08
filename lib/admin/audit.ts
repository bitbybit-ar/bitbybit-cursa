import { getDb } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";

/**
 * Append-only audit log for every admin mutation. ADR 0008
 * mandates that *every* mutation through `/api/admin/*` writes a
 * row before returning success — the log is the only durable
 * trail for "who changed what when" and is consulted both during
 * incident response and routine merchant-support questions.
 *
 * `merchant_id` (ADR 0012) scopes each row so the platform-admin
 * moderation surface can filter the log by merchant. Nullable
 * for forward-compat with platform-level mutations that do not
 * belong to any one merchant.
 *
 * Secrets MUST be redacted by the caller before they reach this
 * function. Never put a CBU, email, NSEC, or API key into
 * `payload_diff`.
 */
export async function writeAuditLog(opts: {
  merchant_id?: string | null;
  actor_pubkey: string;
  route: string;
  action: string;
  payload_diff?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  await db.insert(adminAuditLog).values({
    merchant_id: opts.merchant_id ?? null,
    actor_pubkey: opts.actor_pubkey,
    route: opts.route,
    action: opts.action,
    payload_diff: opts.payload_diff ?? null,
  });
}
