// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  MockLightningClient,
  LightningMintError,
  parseLightningAddress,
  extractPaymentHash,
  verifyPreimage,
  getLightningClient,
  _resetLightningClientForTests,
  _setLightningClientForTests,
} from "@/lib/lightning";
import { sha256 } from "@noble/hashes/sha2.js";

describe("parseLightningAddress", () => {
  it("accepts well-formed addresses", () => {
    expect(parseLightningAddress("alice@walletofsatoshi.com")).toEqual({
      localPart: "alice",
      domain: "walletofsatoshi.com",
    });
    expect(parseLightningAddress("foo.bar+1@strike.me")).toEqual({
      localPart: "foo.bar+1",
      domain: "strike.me",
    });
  });

  it("lowercases the domain (DNS is case-insensitive) but preserves the local part", () => {
    expect(parseLightningAddress("Alice@WalletOfSatoshi.com")).toEqual({
      localPart: "Alice",
      domain: "walletofsatoshi.com",
    });
  });

  it("rejects malformed input", () => {
    expect(parseLightningAddress("")).toBeNull();
    expect(parseLightningAddress("nope")).toBeNull();
    expect(parseLightningAddress("@walletofsatoshi.com")).toBeNull();
    expect(parseLightningAddress("alice@")).toBeNull();
    expect(parseLightningAddress("alice@localhost")).toBeNull(); // single label
    expect(parseLightningAddress("a".repeat(129) + "@x.com")).toBeNull();
  });
});

describe("extractPaymentHash", () => {
  it("returns null on garbage input rather than throwing", () => {
    expect(extractPaymentHash("not-a-bolt11")).toBeNull();
    expect(extractPaymentHash("")).toBeNull();
    expect(extractPaymentHash("lnbc")).toBeNull();
  });
});

describe("verifyPreimage", () => {
  it("returns true when sha256(preimage) === payment_hash", () => {
    const preimage = "00".repeat(32);
    const hashHex = Buffer.from(
      sha256(Buffer.from(preimage, "hex"))
    ).toString("hex");
    expect(verifyPreimage(preimage, hashHex)).toBe(true);
  });

  it("is case-insensitive on the hex inputs", () => {
    const preimage = "AB".repeat(32);
    const hashHex = Buffer.from(
      sha256(Buffer.from(preimage, "hex"))
    ).toString("hex");
    expect(verifyPreimage(preimage.toLowerCase(), hashHex.toUpperCase())).toBe(true);
  });

  it("rejects mismatched preimage / hash", () => {
    const preimage = "00".repeat(32);
    const wrongHash = "ff".repeat(32);
    expect(verifyPreimage(preimage, wrongHash)).toBe(false);
  });

  it("rejects malformed hex inputs without throwing", () => {
    expect(verifyPreimage("zz", "ff".repeat(32))).toBe(false);
    expect(verifyPreimage("00".repeat(32), "not-hex")).toBe(false);
  });
});

describe("MockLightningClient/resolveAddress", () => {
  it("returns metadata for a normal address", async () => {
    const client = new MockLightningClient();
    const meta = await client.resolveAddress("alice@walletofsatoshi.com");
    expect(meta.callback).toMatch(/^https:\/\/walletofsatoshi\.com\//);
    expect(meta.minSendable).toBeGreaterThan(0);
    expect(meta.maxSendable).toBeGreaterThan(meta.minSendable);
  });

  it("rejects malformed addresses with invalid_address", async () => {
    const client = new MockLightningClient();
    await expect(client.resolveAddress("not-an-address")).rejects.toBeInstanceOf(
      LightningMintError
    );
    await expect(client.resolveAddress("not-an-address")).rejects.toMatchObject({
      code: "invalid_address",
    });
  });

  it("simulates an unreachable provider for the test address bogus@example.invalid", async () => {
    const client = new MockLightningClient();
    await expect(
      client.resolveAddress("bogus@example.invalid")
    ).rejects.toMatchObject({ code: "lnurl_unreachable" });
  });
});

describe("MockLightningClient/mintInvoice", () => {
  it("mints a deterministic invoice with payment_hash and verify_url", async () => {
    const client = new MockLightningClient();
    const invoice = await client.mintInvoice("alice@strike.me", 5_000);
    expect(invoice.bolt11).toMatch(/^lnbc5000n1mock/);
    expect(invoice.payment_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(invoice.verify_url).toMatch(/^https:\/\/mock\.lnurl\/verify\//);
    expect(invoice.amount_sats).toBe(5_000);
    expect(invoice.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("issues a unique payment_hash + verify_url per mint", async () => {
    const client = new MockLightningClient();
    const a = await client.mintInvoice("alice@strike.me", 1_000);
    const b = await client.mintInvoice("alice@strike.me", 1_000);
    expect(a.payment_hash).not.toBe(b.payment_hash);
    expect(a.verify_url).not.toBe(b.verify_url);
  });

  it("refuses to mint against the LUD-21-less test address nolud21@example.invalid", async () => {
    const client = new MockLightningClient();
    await expect(
      client.mintInvoice("nolud21@example.invalid", 1_000)
    ).rejects.toMatchObject({ code: "lnurl_no_lud21" });
  });
});

describe("MockLightningClient/pollVerify + markPaid", () => {
  it("returns settled:false until markPaid is called", async () => {
    const client = new MockLightningClient();
    const invoice = await client.mintInvoice("alice@strike.me", 100);
    expect(await client.pollVerify(invoice.verify_url)).toEqual({
      settled: false,
      preimage: null,
    });
    client.markPaid(invoice.verify_url);
    const after = await client.pollVerify(invoice.verify_url);
    expect(after.settled).toBe(true);
    expect(after.preimage).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns settled:false for an unknown verify_url (does not leak state)", async () => {
    const client = new MockLightningClient();
    const result = await client.pollVerify(
      "https://mock.lnurl/verify/never-minted"
    );
    expect(result).toEqual({ settled: false, preimage: null });
  });

  it("rejects markPaid for an unknown verify_url", async () => {
    const client = new MockLightningClient();
    expect(() =>
      client.markPaid("https://mock.lnurl/verify/never-minted")
    ).toThrow(/mock_unknown_verify_url/);
  });
});

describe("getLightningClient factory", () => {
  beforeEach(() => {
    _resetLightningClientForTests();
    delete process.env.LIGHTNING_USE_REAL_CLIENT;
  });

  it("returns the mock by default", () => {
    expect(getLightningClient()).toBeInstanceOf(MockLightningClient);
  });

  it("memoises the instance", () => {
    expect(getLightningClient()).toBe(getLightningClient());
  });

  it("honours an injected client", () => {
    const injected = new MockLightningClient();
    _setLightningClientForTests(injected);
    expect(getLightningClient()).toBe(injected);
  });
});
