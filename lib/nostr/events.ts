import type { UnsignedNostrEvent } from "./types";

/**
 * Build a plain kind:1 short text note (NIP-01). Used by the
 * "Share on Nostr" popup after a seller creates a course — the
 * content is whatever the seller typed into the textarea, no
 * e/p/imeta tagging.
 */
export function buildNoteEvent(content: string): UnsignedNostrEvent {
  return {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content,
  };
}
