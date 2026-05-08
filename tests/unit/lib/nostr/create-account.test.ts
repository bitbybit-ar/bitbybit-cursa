import { describe, it, expect } from "vitest";
import { decode } from "nostr-tools/nip19";
import { getPublicKey } from "nostr-tools/pure";
import { createNewIdentity } from "@/lib/nostr/create-account";

describe("createNewIdentity", () => {
  it("returns a 32-byte secret key, a 64-hex pubkey, and a bech32 nsec", () => {
    const id = createNewIdentity();
    expect(id.secretKey).toBeInstanceOf(Uint8Array);
    expect(id.secretKey.length).toBe(32);
    expect(id.pubkey).toMatch(/^[0-9a-f]{64}$/);
    expect(id.nsec.startsWith("nsec1")).toBe(true);
  });

  it("the nsec round-trips back to the same secret key", () => {
    const id = createNewIdentity();
    const decoded = decode(id.nsec);
    expect(decoded.type).toBe("nsec");
    if (decoded.type !== "nsec") return;
    expect(Array.from(decoded.data)).toEqual(Array.from(id.secretKey));
  });

  it("the pubkey is the schnorr public key derived from the secret", () => {
    const id = createNewIdentity();
    expect(getPublicKey(id.secretKey)).toBe(id.pubkey);
  });

  it("produces a fresh keypair each call (collision is astronomically unlikely)", () => {
    const a = createNewIdentity();
    const b = createNewIdentity();
    expect(a.pubkey).not.toBe(b.pubkey);
    expect(a.nsec).not.toBe(b.nsec);
  });
});
