import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMerchantByPubkey, type Merchant } from "@/lib/admin/merchants";

/**
 * Page-side counterpart of `requireMerchant` (which is for API
 * routes). Use inside any `/[locale]/panel/**` page that needs to
 * scope queries to the active merchant.
 *
 * The panel layout already does the same lookup + redirect dance,
 * so by the time a page calls this we know the merchant exists
 * and is active. The redundant `notFound()` is defence-in-depth
 * for any future page rendered outside the panel layout.
 */
export async function requirePanelMerchant(): Promise<Merchant> {
  const session = await getSession();
  if (!session) notFound();
  const merchant = await getMerchantByPubkey(session.pubkey);
  if (!merchant || !merchant.active) notFound();
  return merchant;
}
