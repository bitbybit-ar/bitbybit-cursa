// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  MockWapuClient,
  getWapuClient,
  _resetWapuClientForTests,
  type WapuWebhookEvent,
} from "@/lib/wapu";

describe("MockWapuClient/createInvoice", () => {
  it("returns a deterministic shape", async () => {
    const client = new MockWapuClient();
    const invoice = await client.createInvoice({
      amount_ars: 28000,
      description: "Bono 4 clases",
      external_id: "order-123",
    });
    expect(invoice.amount_ars).toBe(28000);
    expect(invoice.amount_sats).toBeGreaterThan(0);
    expect(invoice.bolt11).toMatch(/^lnbc\d+n1mock/);
    expect(invoice.payment_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(invoice.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("issues unique invoice ids and payment hashes", async () => {
    const client = new MockWapuClient();
    const a = await client.createInvoice({
      amount_ars: 1000,
      description: "x",
      external_id: "1",
    });
    const b = await client.createInvoice({
      amount_ars: 1000,
      description: "x",
      external_id: "2",
    });
    expect(a.id).not.toBe(b.id);
    expect(a.payment_hash).not.toBe(b.payment_hash);
  });
});

describe("MockWapuClient/getInvoice", () => {
  it("always reports pending so the test must drive payment via webhook", async () => {
    const client = new MockWapuClient();
    const state = await client.getInvoice("anything");
    expect(state.status).toBe("pending");
    expect(state.paid_at).toBeNull();
  });
});

describe("MockWapuClient webhook signing/verification", () => {
  const event: WapuWebhookEvent = {
    event_type: "invoice.paid",
    invoice_id: "mock_inv_abc",
    payment_hash: "a".repeat(64),
    occurred_at: 1_700_000_000,
    amount_sats: 4_000,
    amount_ars: 1_000,
    external_id: "order-1",
    settlement_ref: "wapu_settle_1",
  };

  it("round-trips a signed payload", () => {
    const client = new MockWapuClient("test-secret");
    const { rawBody, signature } = client.signWebhookPayload(event);
    expect(client.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a tampered body with the original signature", () => {
    const client = new MockWapuClient("test-secret");
    const { rawBody, signature } = client.signWebhookPayload(event);
    const tampered = rawBody.replace(/order-1/, "order-2");
    expect(client.verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const client = new MockWapuClient("test-secret");
    const { rawBody } = client.signWebhookPayload(event);
    expect(client.verifyWebhookSignature(rawBody, null)).toBe(false);
  });

  it("rejects a signature signed with a different secret", () => {
    const sender = new MockWapuClient("attacker-secret");
    const receiver = new MockWapuClient("real-secret");
    const { rawBody, signature } = sender.signWebhookPayload(event);
    expect(receiver.verifyWebhookSignature(rawBody, signature)).toBe(false);
  });

  it("rejects junk in the signature header", () => {
    const client = new MockWapuClient("test-secret");
    const { rawBody } = client.signWebhookPayload(event);
    expect(client.verifyWebhookSignature(rawBody, "not-base64!!")).toBe(false);
    expect(client.verifyWebhookSignature(rawBody, "")).toBe(false);
  });
});

describe("getWapuClient factory", () => {
  beforeEach(() => {
    _resetWapuClientForTests();
    delete process.env.WAPU_API_KEY;
  });

  it("returns the mock when WAPU_API_KEY is unset", () => {
    const client = getWapuClient();
    expect(client).toBeInstanceOf(MockWapuClient);
  });

  it("returns the same instance on repeated calls", () => {
    const a = getWapuClient();
    const b = getWapuClient();
    expect(a).toBe(b);
  });

  it("returns the unimplemented real client when WAPU_API_KEY is set", async () => {
    process.env.WAPU_API_KEY = "real-key";
    const client = getWapuClient();
    expect(client).not.toBeInstanceOf(MockWapuClient);
    await expect(
      client.createInvoice({
        amount_ars: 100,
        description: "x",
        external_id: "y",
      })
    ).rejects.toThrow(/not implemented/);
  });
});
