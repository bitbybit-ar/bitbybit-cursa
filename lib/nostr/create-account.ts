/**
 * Client-side "create new identity" helper.
 *
 * Generates a fresh Nostr keypair. The signing + backend handshake
 * is done by the caller via `completeLoginWithSigner`, which is
 * the same code path used by the normal nsec login — so both flows
 * share the session-refresh step and can't drift.
 */

import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nsecEncode } from "nostr-tools/nip19";

export interface CreatedIdentity {
  secretKey: Uint8Array;
  pubkey: string;
  nsec: string;
}

export function createNewIdentity(): CreatedIdentity {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  const nsec = nsecEncode(secretKey);
  return { secretKey, pubkey, nsec };
}
