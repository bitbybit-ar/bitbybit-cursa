import type { Locale } from "@/lib/schemas/auth";

/**
 * Hardcoded merchant identity. Edited by the developer who forks
 * the repo, never by the merchant via the panel. Decision in ADR
 * 0010 — branding/identity stay in code; offerings + payment
 * destination + autorenewal toggle live in Postgres and are
 * panel-editable.
 *
 * Update the values below for each fork. The shape is intentionally
 * narrow: anything that grows beyond identity probably belongs in
 * `messages/{es,en}.json` (copy) or `styles/_theme.scss` (visuals).
 */
export interface MerchantIdentity {
  /** Human-readable name shown in titles and OG tags. */
  name: string;
  /** Public host (no scheme, no path). Used for canonical hints. */
  domain: string;
  /** Default locale shown to the buyer when there is no Accept-Language match. */
  default_locale: Locale;
  /** Optional links shown in the footer. Omit to hide. */
  social: {
    nostr_npub?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

export const MERCHANT: MerchantIdentity = {
  name: "BitByBit Cursá",
  domain: "cursa.bitbybit.com.ar",
  default_locale: "es",
  social: {},
};
