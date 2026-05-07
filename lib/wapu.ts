import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Wapu integration seam.
 *
 * The buyer flow talks to Wapu through the WapuClient interface
 * defined below. Two implementations live in this file:
 *
 *   - MockWapuClient: deterministic, in-process, no network. Used
 *     in dev and tests so the whole buyer flow runs end-to-end
 *     without any Wapu credentials.
 *   - RealWapuClient: not implemented yet. Throws clearly until the
 *     Wapu API contract is wired up.
 *
 * `getWapuClient()` returns the mock when WAPU_API_KEY is unset
 * (default for dev and CI) and the real client otherwise.
 *
 * The webhook signature scheme below (HMAC-SHA256 of raw body with
 * WAPU_WEBHOOK_SECRET, base64-encoded, sent in `X-Wapu-Signature`)
 * is a *placeholder* matching the pattern Stripe / Resend / most
 * webhook providers use. When the real Wapu spec lands it may be
 * different — swap the verifier inside RealWapuClient and keep the
 * interface stable.
 */

export interface WapuInvoice {
  /** Wapu's identifier for the invoice. Stored on orders.wapu_invoice_id. */
  id: string;
  /** BOLT11-encoded Lightning invoice the buyer pays. */
  bolt11: string;
  /** 32-byte payment hash, hex-encoded. */
  payment_hash: string;
  /** Amount the buyer will be charged, in sats. */
  amount_sats: number;
  /** Amount Wapu will settle to the merchant, in whole pesos. */
  amount_ars: number;
  /** Unix seconds. */
  expires_at: number;
}

export interface CreateInvoiceRequest {
  amount_ars: number;
  /** Free-form description shown in the buyer's wallet. */
  description: string;
  /** Internal order id we want correlated back in the webhook. */
  external_id: string;
}

export type WapuInvoiceStatus = "pending" | "paid" | "expired" | "failed";

export interface WapuInvoiceState {
  id: string;
  status: WapuInvoiceStatus;
  payment_hash: string;
  paid_at: number | null;
  /** Wapu's reference for the ARS settlement to the merchant's CBU. */
  settlement_ref: string | null;
}

export interface WapuWebhookEvent {
  /** Discriminator. v1 only handles `invoice.paid`. */
  event_type: "invoice.paid" | "invoice.expired" | "invoice.failed";
  invoice_id: string;
  payment_hash: string;
  /** Unix seconds. */
  occurred_at: number;
  amount_sats: number;
  amount_ars: number;
  external_id: string;
  settlement_ref: string | null;
}

export interface WapuClient {
  createInvoice(req: CreateInvoiceRequest): Promise<WapuInvoice>;
  getInvoice(id: string): Promise<WapuInvoiceState>;
  /**
   * Verify a webhook delivery. Returns true iff the signature
   * matches the body under the configured secret. Implementations
   * MUST use a constant-time comparison.
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
  ): boolean;
}

// --- Mock ---------------------------------------------------------

/**
 * Deterministic mock used by dev and tests. The "exchange rate" is
 * fixed at MOCK_SATS_PER_ARS for every invoice, the BOLT11 payload
 * is a non-routable placeholder string (clients will recognise it as
 * not real and refuse to pay it — this is intentional), and getInvoice
 * always reports `pending` so the only way to mark an order paid is to
 * call `simulatePaymentEvent` from a test or a dev tool.
 */
const MOCK_SATS_PER_ARS = 4; // 1 ARS = 4 sats. Updated only for tests.
const MOCK_INVOICE_TTL_SECONDS = 600;

export class MockWapuClient implements WapuClient {
  constructor(private readonly secret: string = "mock-webhook-secret") {}

  async createInvoice(req: CreateInvoiceRequest): Promise<WapuInvoice> {
    const id = `mock_inv_${randomBytes(8).toString("hex")}`;
    const paymentHash = randomBytes(32).toString("hex");
    const amountSats = req.amount_ars * MOCK_SATS_PER_ARS;
    return {
      id,
      bolt11: `lnbc${amountSats}n1mock${paymentHash.slice(0, 32)}`,
      payment_hash: paymentHash,
      amount_sats: amountSats,
      amount_ars: req.amount_ars,
      expires_at: Math.floor(Date.now() / 1000) + MOCK_INVOICE_TTL_SECONDS,
    };
  }

  async getInvoice(id: string): Promise<WapuInvoiceState> {
    return {
      id,
      status: "pending",
      payment_hash: "",
      paid_at: null,
      settlement_ref: null,
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
  ): boolean {
    return verifyHmacSignature(this.secret, rawBody, signatureHeader);
  }

  /**
   * Test/dev-only helper: produce the exact bytes a webhook delivery
   * would carry, plus the signature header that would prove
   * authenticity. Lets the integration tests POST a "real" webhook
   * without spinning up a real Wapu environment.
   */
  signWebhookPayload(event: WapuWebhookEvent): {
    rawBody: string;
    signature: string;
  } {
    const rawBody = JSON.stringify(event);
    const signature = createHmac("sha256", this.secret)
      .update(rawBody, "utf8")
      .digest("base64");
    return { rawBody, signature };
  }
}

// --- Shared HMAC helper ------------------------------------------

function verifyHmacSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}

// --- Real client (placeholder) ----------------------------------

class UnimplementedWapuClient implements WapuClient {
  private fail(method: string): never {
    throw new Error(
      `RealWapuClient.${method} is not implemented yet. The Wapu API contract has not been wired in. ` +
        `Set WAPU_API_KEY to empty (the default) to fall back to MockWapuClient.`
    );
  }
  async createInvoice(): Promise<WapuInvoice> {
    this.fail("createInvoice");
  }
  async getInvoice(): Promise<WapuInvoiceState> {
    this.fail("getInvoice");
  }
  verifyWebhookSignature(): boolean {
    this.fail("verifyWebhookSignature");
  }
}

// --- Factory ------------------------------------------------------

let cached: WapuClient | null = null;

/**
 * Reset the cached client. Test-only. Production callers must not
 * use this — the WapuClient is meant to be a process-wide singleton
 * so a misconfigured second instance can't accidentally talk to a
 * different Wapu account.
 */
export function _resetWapuClientForTests(): void {
  cached = null;
}

export function getWapuClient(): WapuClient {
  if (cached) return cached;
  const apiKey = process.env.WAPU_API_KEY;
  if (!apiKey) {
    const secret =
      process.env.WAPU_WEBHOOK_SECRET || "mock-webhook-secret";
    cached = new MockWapuClient(secret);
    return cached;
  }
  cached = new UnimplementedWapuClient();
  return cached;
}
