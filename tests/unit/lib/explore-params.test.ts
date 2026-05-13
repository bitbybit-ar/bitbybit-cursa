import { describe, it, expect } from "vitest";
import {
  PAGE_SIZE,
  buildExploreHref,
  hasActiveFilters,
  parseExploreParams,
} from "@/lib/explore-params";

describe("parseExploreParams", () => {
  it("returns defaults when nothing is passed", () => {
    const out = parseExploreParams(undefined);
    expect(out).toEqual({
      q: "",
      type: null,
      sort: "newest",
      page: 1,
    });
  });

  it("trims the search and caps it at 100 chars", () => {
    const long = "x".repeat(200);
    expect(parseExploreParams({ q: `  ${long}  ` }).q).toHaveLength(100);
  });

  it("whitelists type; drops unknown values", () => {
    expect(parseExploreParams({ type: "code" }).type).toBe("code");
    expect(parseExploreParams({ type: "junk" }).type).toBeNull();
  });

  it("falls back to 'newest' for an unknown sort", () => {
    expect(parseExploreParams({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseExploreParams({ sort: "weird" }).sort).toBe("newest");
  });

  it("clamps page to >= 1 and ignores garbage", () => {
    expect(parseExploreParams({ page: "3" }).page).toBe(3);
    expect(parseExploreParams({ page: "0" }).page).toBe(1);
    expect(parseExploreParams({ page: "nope" }).page).toBe(1);
  });

  it("caps page at 1000 so a huge offset can't tank the DB", () => {
    expect(parseExploreParams({ page: "1000" }).page).toBe(1000);
    expect(parseExploreParams({ page: "999999999" }).page).toBe(1000);
  });

  it("reads the first value when a key arrives as an array", () => {
    expect(parseExploreParams({ q: ["piano", "guitar"] }).q).toBe("piano");
  });
});

describe("buildExploreHref", () => {
  it("returns the bare /explore when nothing is set", () => {
    const params = parseExploreParams(undefined);
    expect(buildExploreHref(params)).toBe("/explore");
  });

  it("omits defaults and only encodes non-default values", () => {
    const params = parseExploreParams({ q: "piano", type: "code", page: "2" });
    const href = buildExploreHref(params);
    expect(href.startsWith("/explore?")).toBe(true);
    expect(href).toContain("q=piano");
    expect(href).toContain("type=code");
    expect(href).toContain("page=2");
    expect(href).not.toContain("sort=newest");
  });

  it("applies the patch on top of the current params", () => {
    const params = parseExploreParams({ q: "piano", page: "2" });
    expect(buildExploreHref(params, { page: 3 })).toContain("page=3");
    expect(buildExploreHref(params, { page: 1 })).not.toContain("page=");
  });
});

describe("hasActiveFilters", () => {
  it("is false for defaults and true for any deviation", () => {
    expect(hasActiveFilters(parseExploreParams(undefined))).toBe(false);
    expect(hasActiveFilters(parseExploreParams({ q: "x" }))).toBe(true);
    expect(hasActiveFilters(parseExploreParams({ sort: "oldest" }))).toBe(true);
  });
});

describe("PAGE_SIZE", () => {
  it("is a positive integer", () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
    expect(Number.isInteger(PAGE_SIZE)).toBe(true);
  });
});
