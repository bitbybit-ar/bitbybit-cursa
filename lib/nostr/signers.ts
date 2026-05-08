/**
 * Unified signer interface for in-memory Nostr signing.
 *
 * The login flow produces one of three signer types (extension,
 * nsec, nip46). After auth, we keep a `SignerHandle` in memory so
 * subsequent actions (claiming an order, future receipt-DM resends)
 * can be signed without re-prompting the user. None of these handles
 * persist across reloads — see `SignerProvider` for the auto-restore
 * policy.
 *
 * NIP-46 (Nostr Connect bunker) is intentionally out of scope for v1
 * of the buyer flow. Adding it later means dropping a `makeNip46Signer`
 * factory in this file alongside the bunker handshake (see
 * `bitbybit-arena/lib/nostr/nip46-login.ts` for the reference port).
 */

import { finalizeEvent } from "nostr-tools/pure";
import type { NostrEvent, UnsignedNostrEvent } from "./types";
import type { SignerType } from "@/lib/schemas/auth";

export type { SignerType } from "@/lib/schemas/auth";

export interface SignerHandle {
  type: SignerType;
  pubkey: string;
  sign: (event: UnsignedNostrEvent) => Promise<NostrEvent>;
  close?: () => Promise<void>;
}

export function makeExtensionSigner(pubkey: string): SignerHandle {
  return {
    type: "extension",
    pubkey,
    sign: async (event) => {
      if (!window.nostr) throw new Error("no_extension");
      const signed = await window.nostr.signEvent(event);
      return { ...signed, pubkey };
    },
  };
}

export function makeNsecSigner(
  secretKey: Uint8Array,
  pubkey: string
): SignerHandle {
  return {
    type: "nsec",
    pubkey,
    sign: async (event) => {
      const signed = finalizeEvent(event, secretKey);
      return {
        id: signed.id,
        pubkey,
        created_at: signed.created_at,
        kind: signed.kind,
        tags: signed.tags,
        content: signed.content,
        sig: signed.sig,
      };
    },
  };
}
