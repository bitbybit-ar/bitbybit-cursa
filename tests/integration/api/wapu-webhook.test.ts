// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { testDb, cleanDb, seedMerchant } from "../setup";
import { offerings } from "@/lib/db/schema";
import { createOrder, getOrder } from "@/lib/orders";
import {
  MockWapuClient,
  _resetWapuClientForTests,
  type WapuWebhookEvent,
} from "@/lib/wapu";
import { POST } from "@/app/api/wapu/webhook/route";

const WEBHOOK_URL = "https://cursa.test/api/wapu/webhook";

beforeEach(async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("WAPU_WEBHOOK_SECRET", "test-webhook-secret");
  delete process.env.WAPU_API_KEY;
  _resetWapuClientForTests();

  const { rows } = await testDb.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'offerings'
    ) AS "exists"
  `);
  if (!rows[0]?.exists) {
    throw new Error(
      "Test database is missing the 'offerings' table. Run `npm run test:db:migrate` first."
    );
  }

  await cleanDb();
});

async function seedOrder() {
  const merchant = await seedMerchant();
  const [offering] = await testDb
    .insert(offerings)
    .values({
      merchant_id: merchant.id,
      slug: "test-offering",
      type: "code",
      title: "Test",
      description: "Test.",
      price_ars: 1000,
    })
    .returning();
  const result = await createOrder({
    offering_id: offering.id,
    pubkey: null,
  });
  return { offeringId: offering.id, orderId: result.order_id };
}

function buildWebhookRequest(body: string, signature: string | null): NextRequest {
  return new NextRequest(WEBHOOK_URL, {
    method: "POST",
    headers: signature
      ? { "x-wapu-signature": signature, "content-type": "application/json" }
      : { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/wapu/webhook — happy path", () => {
  it("verifies signature and marks the order paid", async () => {
    const { orderId } = await seedOrder();
    const order = await getOrder(orderId);
    const event: WapuWebhookEvent = {
      event_type: "direct_fiat.paid",
      tentative_uuid: order!.wapu_tentative_uuid!,
      payment_hash: order!.payment_hash!,
      occurred_at: Math.floor(Date.now() / 1000),
      amount_sats: order!.amount_sats,
      amount_ars: order!.amount_ars,
      external_id: orderId,
      settlement_ref: "wapu_ref_test",
    };

    const signer = new MockWapuClient("test-webhook-secret");
    const { rawBody, signature } = signer.signWebhookPayload(event);
    const res = await POST(buildWebhookRequest(rawBody, signature));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.updated).toBe(true);

    const after = await getOrder(orderId);
    expect(after?.status).toBe("paid");
    expect(after?.wapu_settlement_ref).toBe("wapu_ref_test");
  });
});

describe("POST /api/wapu/webhook — rejections", () => {
  it("401s when the signature header is missing", async () => {
    const res = await POST(buildWebhookRequest("{}", null));
    expect(res.status).toBe(401);
  });

  it("401s when the body has been tampered with", async () => {
    const { orderId } = await seedOrder();
    const order = await getOrder(orderId);
    const event: WapuWebhookEvent = {
      event_type: "direct_fiat.paid",
      tentative_uuid: order!.wapu_tentative_uuid!,
      payment_hash: order!.payment_hash!,
      occurred_at: Math.floor(Date.now() / 1000),
      amount_sats: order!.amount_sats,
      amount_ars: order!.amount_ars,
      external_id: orderId,
      settlement_ref: null,
    };
    const signer = new MockWapuClient("test-webhook-secret");
    const { rawBody, signature } = signer.signWebhookPayload(event);
    const tamperedBody = rawBody.replace(
      /direct_fiat\.paid/,
      "direct_fiat.failed"
    );
    const res = await POST(buildWebhookRequest(tamperedBody, signature));
    expect(res.status).toBe(401);
  });

  it("400s when the payload schema is invalid (signature passes but body shape doesn't)", async () => {
    const { createHmac } = await import("node:crypto");
    const rawBody = JSON.stringify({ totally: "wrong" });
    const authentic = createHmac("sha256", "test-webhook-secret")
      .update(rawBody, "utf8")
      .digest("base64");
    const res = await POST(buildWebhookRequest(rawBody, authentic));
    expect(res.status).toBe(400);
  });

  it("ignores unknown order ids with 200 to stop Wapu retries", async () => {
    const event: WapuWebhookEvent = {
      event_type: "direct_fiat.paid",
      tentative_uuid: "ghost",
      payment_hash: "a".repeat(64),
      occurred_at: Math.floor(Date.now() / 1000),
      amount_sats: 100,
      amount_ars: 25,
      external_id: "00000000-0000-0000-0000-000000000000",
      settlement_ref: null,
    };
    const signer = new MockWapuClient("test-webhook-secret");
    const { rawBody, signature } = signer.signWebhookPayload(event);
    const res = await POST(buildWebhookRequest(rawBody, signature));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toBe("unknown_order");
  });

  it("returns 200 with ignored=expired/failed events without touching the row", async () => {
    const { orderId } = await seedOrder();
    const event: WapuWebhookEvent = {
      event_type: "direct_fiat.expired",
      tentative_uuid: "x",
      payment_hash: "a".repeat(64),
      occurred_at: Math.floor(Date.now() / 1000),
      amount_sats: 0,
      amount_ars: 0,
      external_id: orderId,
      settlement_ref: null,
    };
    const signer = new MockWapuClient("test-webhook-secret");
    const { rawBody, signature } = signer.signWebhookPayload(event);
    const res = await POST(buildWebhookRequest(rawBody, signature));
    expect(res.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after?.status).toBe("pending");
  });
});
