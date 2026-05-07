// @vitest-environment node
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { createSession, verifySessionToken } from "@/lib/auth";
import { getAuthSecret } from "@/lib/env";

const HEX_PUBKEY = "a".repeat(64);

describe("auth/createSession + verifySessionToken", () => {
  it("round-trips a minimal session", async () => {
    const token = await createSession({
      pubkey: HEX_PUBKEY,
      locale: "es",
    });
    const session = await verifySessionToken(token);
    expect(session?.pubkey).toBe(HEX_PUBKEY);
    expect(session?.locale).toBe("es");
    expect(session?.signer_type).toBeNull();
  });

  it("preserves signer_type when provided", async () => {
    const token = await createSession({
      pubkey: HEX_PUBKEY,
      locale: "en",
      signer_type: "extension",
    });
    const session = await verifySessionToken(token);
    expect(session?.signer_type).toBe("extension");
    expect(session?.locale).toBe("en");
  });

  it("returns null for a tampered token", async () => {
    const token = await createSession({
      pubkey: HEX_PUBKEY,
      locale: "es",
    });
    const tampered = token.slice(0, -4) + "XXXX";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("not-the-real-secret");
    const foreignToken = await new SignJWT({
      pubkey: HEX_PUBKEY,
      locale: "es",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(otherSecret);
    expect(await verifySessionToken(foreignToken)).toBeNull();
  });

  it("returns null when pubkey is missing from the payload", async () => {
    const token = await new SignJWT({ locale: "es" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getAuthSecret());
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("falls back to es when locale is invalid", async () => {
    const token = await new SignJWT({
      pubkey: HEX_PUBKEY,
      locale: "fr",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getAuthSecret());
    const session = await verifySessionToken(token);
    expect(session?.locale).toBe("es");
  });

  it("treats unknown signer_type as null", async () => {
    const token = await new SignJWT({
      pubkey: HEX_PUBKEY,
      locale: "es",
      signer_type: "smartcard",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getAuthSecret());
    const session = await verifySessionToken(token);
    expect(session?.signer_type).toBeNull();
  });
});
