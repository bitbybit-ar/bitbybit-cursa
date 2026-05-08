import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { writeAuditLog } from "./audit";

/**
 * Settings is a singleton row with a CHECK constraint pinning
 * `id = 1`. On a fresh deploy no row exists yet; the panel needs
 * to handle "first edit ever" alongside the steady-state "edit
 * existing row" case. Both paths converge through the helpers
 * below, which always return a populated row to the caller.
 */

export type Settings = typeof settings.$inferSelect;

export const UpdateSettingsSchema = z
  .object({
    cbu: z.string().min(1).max(80).nullable(),
    alias: z.string().min(1).max(80).nullable(),
    features_autorenewal: z.boolean(),
  })
  .partial();

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

/**
 * Read the singleton row, lazily inserting an empty defaults row
 * if it doesn't exist. The render path on `/panel/configuracion`
 * uses this directly so a fresh deploy renders a usable form
 * instead of a blank page.
 */
export async function getOrInitSettings(): Promise<Settings> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(settings)
    .values({
      id: 1,
      cbu: null,
      alias: null,
      features_autorenewal: false,
      updated_by: null,
    })
    .returning();
  return inserted;
}

export async function updateSettingsForAdmin(
  patch: UpdateSettingsInput,
  actorPubkey: string
): Promise<Settings> {
  const db = getDb();

  // Make sure the row exists. `getOrInitSettings` is idempotent;
  // running it before the UPDATE collapses the first-edit-ever
  // path into the same code as steady-state.
  const before = await getOrInitSettings();

  const next: Partial<Settings> = {
    updated_at: new Date(),
    updated_by: actorPubkey,
  };
  if (patch.cbu !== undefined) next.cbu = patch.cbu;
  if (patch.alias !== undefined) next.alias = patch.alias;
  if (patch.features_autorenewal !== undefined) {
    next.features_autorenewal = patch.features_autorenewal;
  }

  const [row] = await db
    .update(settings)
    .set(next)
    .where(eq(settings.id, 1))
    .returning();

  // Diff intentionally redacts CBU + alias values — those are
  // payment-destination secrets-adjacent. Record only WHICH
  // fields changed; the new value lives in the row itself.
  const changedKeys = (
    Object.keys(patch) as Array<keyof UpdateSettingsInput>
  ).filter(
    (k) =>
      patch[k] !== undefined &&
      JSON.stringify(patch[k]) !==
        JSON.stringify(before[k as keyof Settings])
  );
  await writeAuditLog({
    actor_pubkey: actorPubkey,
    route: "/api/admin/settings",
    action: "update",
    payload_diff: { changed: changedKeys },
  });

  return row;
}
