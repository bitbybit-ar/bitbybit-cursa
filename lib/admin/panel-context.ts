import "server-only";
import { notFound } from "next/navigation";
import { getSession, type AuthSession } from "@/lib/auth";
import {
  ensureMerchantForPubkey,
  type Merchant,
} from "@/lib/admin/merchants";

/**
 * Page-side counterpart of `requireMerchant` (the API helper). Used
 * by every creator-facing page (My courses, Settings, My sales, My
 * students) to scope queries to the user's merchant row.
 *
 * Per ADR 0014, "merchant" is no longer a gate — it's just the
 * server-side row that owns offerings/orders for this pubkey. Any
 * signed-in user gets one lazily; deactivated merchants 404.
 *
 * Anonymous visitors are bounced upstream by the edge proxy; the
 * `notFound()` here is defence-in-depth.
 */
export async function requireUserMerchant(): Promise<{
  session: AuthSession;
  merchant: Merchant;
}> {
  const session = await getSession();
  if (!session) notFound();
  const merchant = await ensureMerchantForPubkey(session.pubkey);
  if (!merchant.active) notFound();
  return { session, merchant };
}

/** @deprecated Use `requireUserMerchant`. */
export async function requirePanelMerchant(): Promise<Merchant> {
  const { merchant } = await requireUserMerchant();
  return merchant;
}
