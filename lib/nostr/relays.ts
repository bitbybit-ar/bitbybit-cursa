/**
 * Public Nostr relays used for read-only queries (kind:0 profile
 * metadata, etc). Kept distinct from `NIP46_CONNECT_RELAYS` in
 * `nip46-login.ts` because that list has an ordering constraint
 * (`relay.nsec.app` must come first) that does not apply here.
 */
export const PUBLIC_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://relay.nostr.band",
] as const;
