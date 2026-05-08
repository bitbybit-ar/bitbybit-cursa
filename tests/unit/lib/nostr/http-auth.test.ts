// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseNostrAuthHeader } from "@/lib/nostr/http-auth";

function encode(value: unknown): string {
  return `Nostr ${Buffer.from(JSON.stringify(value)).toString("base64")}`;
}

describe("nostr/parseNostrAuthHeader", () => {
  it("returns missing when the header is null", () => {
    expect(parseNostrAuthHeader(null)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("returns missing when the header is empty", () => {
    expect(parseNostrAuthHeader("")).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("returns scheme when the prefix is wrong", () => {
    expect(parseNostrAuthHeader("Bearer abc")).toEqual({
      ok: false,
      reason: "scheme",
    });
  });

  it("returns scheme when the encoded part is missing", () => {
    expect(parseNostrAuthHeader("Nostr")).toEqual({
      ok: false,
      reason: "scheme",
    });
  });

  it("returns json when the decoded body is not JSON", () => {
    const header = `Nostr ${Buffer.from("not-json").toString("base64")}`;
    expect(parseNostrAuthHeader(header)).toEqual({
      ok: false,
      reason: "json",
    });
  });

  it("returns the parsed event on a well-formed header", () => {
    const result = parseNostrAuthHeader(encode({ kind: 27235 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event).toEqual({ kind: 27235 });
    }
  });
});
