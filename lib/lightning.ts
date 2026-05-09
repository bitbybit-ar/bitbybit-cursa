import { sha256 } from "@noble/hashes/sha2.js";
import { bech32 } from "@scure/base";

/**
 * Direct-Lightning settlement-rail seam (ADR 0014).
 *
 * The buyer flow talks to the merchant's Lightning Address through
 * the LightningClient interface defined below. Two implementations
 * live in this file:
 *
 *   - MockLightningClient: deterministic, in-process, no network. Used
 *     in dev and tests so the whole buyer flow runs end-to-end without
 *     resolving real LNURL-pay endpoints.
 *   - RealLightningClient: hits the merchant's `<domain>/.well-known/
 *     lnurlp/<local-part>` endpoint, the LNURL-pay callback, and the
 *     LUD-21 verify URL.
 *
 * `getLightningClient()` returns the mock when LIGHTNING_USE_REAL_CLIENT
 * is unset (default for dev and CI) and the real client otherwise.
 *
 * LUD-21 (`verify` URL) is required. We refuse to mint an invoice
 * against a Lightning Address whose LNURL-pay endpoint does not
 * advertise LUD-21, because without `verify` we have no server-side
 * way to confirm the BOLT11 was paid — the merchant's wallet is the
 * only thing that knows, and the merchant did not give us NWC
 * credentials. Almost every modern provider (WoS, Strike, Alby Hub,
 * LNbits, ZBD, Primal) supports LUD-21.
 */

// --- Public types ------------------------------------------------

export interface LightningAddressMetadata {
  /** LNURL-pay callback URL the client GETs to mint an invoice. */
  callback: string;
  /** Minimum amount the address accepts, in millisats. */
  minSendable: number;
  /** Maximum amount the address accepts, in millisats. */
  maxSendable: number;
}

export interface MintedInvoice {
  bolt11: string;
  /** Hex-encoded 32-byte payment hash. May be derived from the BOLT11. */
  payment_hash: string;
  amount_sats: number;
  /** Unix seconds. */
  expires_at: number;
  /** LUD-21 verify URL the status poller GETs. */
  verify_url: string;
}

export interface VerifyState {
  settled: boolean;
  /** Hex-encoded 32-byte preimage when the wallet returns it; null otherwise. */
  preimage: string | null;
}

/**
 * Reasons mintInvoice can fail. Surfaced as an error code so the
 * settings sanity check + checkout API can give targeted feedback
 * (e.g. "your provider does not support LUD-21" vs. "we could not
 * reach your provider").
 */
export type LightningMintErrorCode =
  | "invalid_address"
  | "lnurl_unreachable"
  | "lnurl_invalid_response"
  | "lnurl_no_lud21"
  | "bolt11_no_payment_hash";

export class LightningMintError extends Error {
  constructor(public readonly code: LightningMintErrorCode, message?: string) {
    super(message ?? code);
    this.name = "LightningMintError";
  }
}

export interface LightningClient {
  resolveAddress(address: string): Promise<LightningAddressMetadata>;
  mintInvoice(
    address: string,
    amount_sats: number,
    comment?: string
  ): Promise<MintedInvoice>;
  pollVerify(verify_url: string): Promise<VerifyState>;
}

// --- Lightning Address parsing -----------------------------------

const LN_ADDRESS_RE = /^([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/;

export function parseLightningAddress(
  address: string
): { localPart: string; domain: string } | null {
  if (typeof address !== "string") return null;
  if (address.length === 0 || address.length > 128) return null;
  const m = LN_ADDRESS_RE.exec(address.trim());
  if (!m) return null;
  return { localPart: m[1], domain: m[2].toLowerCase() };
}

// --- BOLT11 helpers ----------------------------------------------

/**
 * Extract the payment hash (hex) from a BOLT11 invoice. Some LNURL-pay
 * providers omit `payment_hash` from the callback response; this lets
 * us recover it from the invoice itself.
 *
 * Ported from bitbybit-habits/lib/lightning.ts. bech32 decode, walk
 * the tagged-fields section to find tag 1 (`p` = payment hash, 32
 * bytes / 256 bits encoded as 52 five-bit words).
 */
export function extractPaymentHash(invoice: string): string | null {
  try {
    const { words } = bech32.decode(
      invoice as `${string}1${string}`,
      2000
    );

    // Skip 7 timestamp words; stop before the last 104 signature words.
    let pos = 7;
    while (pos < words.length - 104) {
      const type = words[pos];
      const dataLen = (words[pos + 1] << 5) | words[pos + 2];
      pos += 3;

      if (type === 1 && dataLen === 52) {
        const hashWords = words.slice(pos, pos + dataLen);
        const hashBytes = bech32.fromWords(hashWords);
        return Buffer.from(hashBytes).toString("hex");
      }

      pos += dataLen;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verify a payment preimage against an expected payment_hash. Used by
 * the WebLN-pay path where the buyer's wallet hands us the preimage
 * after settling — we hash it and compare.
 */
export function verifyPreimage(
  preimage: string,
  payment_hash: string
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(preimage)) return false;
  if (!/^[0-9a-f]{64}$/i.test(payment_hash)) return false;
  const bytes = Buffer.from(preimage, "hex");
  const hash = sha256(bytes);
  const hashHex = Buffer.from(hash).toString("hex");
  return hashHex.toLowerCase() === payment_hash.toLowerCase();
}

// --- Mock --------------------------------------------------------

const MOCK_LNURL_TTL_SECONDS = 600;

interface MockMintRecord {
  bolt11: string;
  payment_hash: string;
  amount_sats: number;
  verify_url: string;
}

/**
 * Deterministic mock for dev and integration tests. `resolveAddress`
 * always returns metadata advertising LUD-21 except for a few
 * deliberately-broken addresses (used in tests):
 *
 *   - `nolud21@example.invalid` — returns allowsLud21: false
 *   - `bogus@example.invalid` — throws
 *
 * `markPaid(verify_url)` is the test-only helper that simulates the
 * merchant's wallet receiving the funds — call it from a test before
 * polling.
 */
export class MockLightningClient implements LightningClient {
  private readonly invoices = new Map<string, MockMintRecord>();
  private readonly settled = new Set<string>();
  private mintCounter = 0;

  async resolveAddress(
    address: string
  ): Promise<LightningAddressMetadata> {
    const parsed = parseLightningAddress(address);
    if (!parsed) {
      throw new LightningMintError("invalid_address", address);
    }
    if (parsed.domain === "example.invalid" && parsed.localPart === "bogus") {
      throw new LightningMintError("lnurl_unreachable", address);
    }
    return {
      callback: `https://${parsed.domain}/.well-known/lnurlp/${parsed.localPart}/callback`,
      minSendable: 1000,
      maxSendable: 100_000_000_000,
    };
  }

  async mintInvoice(
    address: string,
    amount_sats: number,
    comment?: string
  ): Promise<MintedInvoice> {
    const parsed = parseLightningAddress(address);
    if (!parsed) {
      throw new LightningMintError("invalid_address", address);
    }
    if (parsed.domain === "example.invalid") {
      if (parsed.localPart === "bogus") {
        throw new LightningMintError("lnurl_unreachable", address);
      }
      if (parsed.localPart === "nolud21") {
        throw new LightningMintError("lnurl_no_lud21", address);
      }
    }
    this.mintCounter += 1;
    const idx = this.mintCounter;
    // 32-byte hex padding so length matches a real payment_hash.
    const payment_hash = idx.toString(16).padStart(64, "0");
    const verify_url = `https://mock.lnurl/verify/${payment_hash}`;
    const bolt11 = `lnbc${amount_sats}n1mock${payment_hash.slice(0, 32)}`;
    const record: MockMintRecord = {
      bolt11,
      payment_hash,
      amount_sats,
      verify_url,
    };
    this.invoices.set(verify_url, record);
    void comment;
    return {
      bolt11,
      payment_hash,
      amount_sats,
      expires_at: Math.floor(Date.now() / 1000) + MOCK_LNURL_TTL_SECONDS,
      verify_url,
    };
  }

  async pollVerify(verify_url: string): Promise<VerifyState> {
    if (!this.invoices.has(verify_url)) {
      // Verify URLs we did not mint always return unsettled — refuses
      // to leak any cross-test state.
      return { settled: false, preimage: null };
    }
    if (this.settled.has(verify_url)) {
      // Deterministic preimage: the SHA256 of payment_hash bytes.
      // Tests should not assert on this value, only on `settled`.
      return {
        settled: true,
        preimage: "00".repeat(32),
      };
    }
    return { settled: false, preimage: null };
  }

  /**
   * Test/dev-only helper: mark a previously minted invoice as paid by
   * the merchant's wallet. The next `pollVerify(verify_url)` returns
   * `{ settled: true }`.
   */
  markPaid(verify_url: string): void {
    if (!this.invoices.has(verify_url)) {
      throw new Error(`mock_unknown_verify_url: ${verify_url}`);
    }
    this.settled.add(verify_url);
  }
}

// --- Real client (LNURL-pay over fetch) --------------------------

const LNURL_FETCH_TIMEOUT_MS = 6_000;

class RealLightningClient implements LightningClient {
  async resolveAddress(
    address: string
  ): Promise<LightningAddressMetadata> {
    const parsed = parseLightningAddress(address);
    if (!parsed) {
      throw new LightningMintError("invalid_address", address);
    }
    const url = `https://${parsed.domain}/.well-known/lnurlp/${parsed.localPart}`;
    let meta: unknown;
    try {
      meta = await fetchJsonWithTimeout(url, LNURL_FETCH_TIMEOUT_MS);
    } catch {
      throw new LightningMintError("lnurl_unreachable", address);
    }
    if (
      typeof meta !== "object" ||
      meta === null ||
      typeof (meta as Record<string, unknown>).callback !== "string"
    ) {
      throw new LightningMintError("lnurl_invalid_response", address);
    }
    const m = meta as {
      callback: string;
      minSendable?: number;
      maxSendable?: number;
    };
    return {
      callback: m.callback,
      minSendable: Number(m.minSendable ?? 1000),
      maxSendable: Number(m.maxSendable ?? 100_000_000_000),
    };
  }

  async mintInvoice(
    address: string,
    amount_sats: number,
    comment?: string
  ): Promise<MintedInvoice> {
    const meta = await this.resolveAddress(address);
    const amount_msat = amount_sats * 1000;
    const url = new URL(meta.callback);
    url.searchParams.set("amount", amount_msat.toString());
    if (comment) {
      // Most providers clamp comments at ~144–200 chars and reject
      // anything longer.
      url.searchParams.set("comment", comment.slice(0, 200));
    }
    let body: unknown;
    try {
      body = await fetchJsonWithTimeout(
        url.toString(),
        LNURL_FETCH_TIMEOUT_MS
      );
    } catch {
      throw new LightningMintError("lnurl_unreachable", address);
    }
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).pr !== "string"
    ) {
      throw new LightningMintError("lnurl_invalid_response", address);
    }
    const r = body as { pr: string; verify?: string };
    // LUD-21 gate. The metadata response is not a reliable place to
    // probe for `verify`; only the callback response is. We refuse
    // to mint against a provider that does not return one because
    // we have no other server-side way to confirm settlement.
    if (typeof r.verify !== "string" || r.verify.length === 0) {
      throw new LightningMintError("lnurl_no_lud21", address);
    }
    const payment_hash = extractPaymentHash(r.pr);
    if (!payment_hash) {
      throw new LightningMintError("bolt11_no_payment_hash", address);
    }
    return {
      bolt11: r.pr,
      payment_hash,
      amount_sats,
      // Most providers return invoices that expire ~10 min from issue.
      // We do not parse the BOLT11 expiry; the buyer page polls until
      // the merchant's verify URL flips and we do not auto-remint.
      expires_at: Math.floor(Date.now() / 1000) + 600,
      verify_url: r.verify,
    };
  }

  async pollVerify(verify_url: string): Promise<VerifyState> {
    let body: unknown;
    try {
      body = await fetchJsonWithTimeout(
        verify_url,
        LNURL_FETCH_TIMEOUT_MS
      );
    } catch {
      // A transient failure must NOT mark the order paid. Treat it
      // as "not settled yet" and let the buyer page poll again.
      return { settled: false, preimage: null };
    }
    if (typeof body !== "object" || body === null) {
      return { settled: false, preimage: null };
    }
    const r = body as { settled?: boolean; preimage?: string | null };
    return {
      settled: Boolean(r.settled),
      preimage: typeof r.preimage === "string" ? r.preimage : null,
    };
  }
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number
): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`fetch_${res.status}: ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// --- Factory -----------------------------------------------------

let cached: LightningClient | null = null;

/**
 * Reset the cached client. Test-only.
 */
export function _resetLightningClientForTests(): void {
  cached = null;
}

/**
 * Test-only helper to inject a specific client (typically a
 * MockLightningClient with pre-seeded markPaid state) without going
 * through the env switch.
 */
export function _setLightningClientForTests(client: LightningClient): void {
  cached = client;
}

export function getLightningClient(): LightningClient {
  if (cached) return cached;
  if (process.env.LIGHTNING_USE_REAL_CLIENT === "1") {
    cached = new RealLightningClient();
  } else {
    cached = new MockLightningClient();
  }
  return cached;
}
