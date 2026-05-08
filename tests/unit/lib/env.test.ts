import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getBaseUrl,
  getDatabaseUrl,
  getAuthSecret,
  getPlatformAdminPubkeys,
  isPlatformAdminPubkey,
} from "@/lib/env";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("env/getBaseUrl", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  it("throws when NEXT_PUBLIC_BASE_URL is unset", () => {
    expect(() => getBaseUrl()).toThrow(/NEXT_PUBLIC_BASE_URL/);
  });

  it("returns the configured value", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
    expect(getBaseUrl()).toBe("https://example.test");
  });
});

describe("env/getDatabaseUrl", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("throws when DATABASE_URL is unset", () => {
    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });
});

describe("env/getAuthSecret", () => {
  beforeEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("returns a deterministic dev fallback when unset and not in production", () => {
    vi.stubEnv("NODE_ENV", "test");
    const secret = getAuthSecret();
    // Cross-realm `instanceof Uint8Array` fails under jsdom, so check
    // the structural traits instead: it must be array-like with bytes.
    expect(ArrayBuffer.isView(secret)).toBe(true);
    expect(secret.length).toBeGreaterThan(0);
  });

  it("throws in production when unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/);
  });

  it("returns the configured secret when set", () => {
    process.env.AUTH_SECRET = "real-secret-value";
    const secret = getAuthSecret();
    expect(new TextDecoder().decode(secret)).toBe("real-secret-value");
  });
});

describe("env/getPlatformAdminPubkeys", () => {
  beforeEach(() => {
    delete process.env.PLATFORM_ADMIN_PUBKEYS;
  });

  it("returns an empty list when unset", () => {
    expect(getPlatformAdminPubkeys()).toEqual([]);
  });

  it("parses a comma-separated list and trims whitespace", () => {
    process.env.PLATFORM_ADMIN_PUBKEYS = " abc , def , ghi ";
    expect(getPlatformAdminPubkeys()).toEqual(["abc", "def", "ghi"]);
  });

  it("ignores empty entries from trailing commas", () => {
    process.env.PLATFORM_ADMIN_PUBKEYS = "abc,,def,";
    expect(getPlatformAdminPubkeys()).toEqual(["abc", "def"]);
  });
});

describe("env/isPlatformAdminPubkey", () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_PUBKEYS = "abc,def";
  });

  it("returns true for a listed pubkey", () => {
    expect(isPlatformAdminPubkey("abc")).toBe(true);
    expect(isPlatformAdminPubkey("def")).toBe(true);
  });

  it("returns false for an unlisted pubkey", () => {
    expect(isPlatformAdminPubkey("xyz")).toBe(false);
  });

  it("is case-sensitive (hex pubkeys are normalised lowercase upstream)", () => {
    expect(isPlatformAdminPubkey("ABC")).toBe(false);
  });
});
