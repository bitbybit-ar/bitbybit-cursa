// @vitest-environment node
import { describe, it, expect } from "vitest";
import { slugifyDisplayName } from "@/lib/admin/merchants";

describe("slugifyDisplayName", () => {
  it("lowercases and hyphenates word boundaries", () => {
    expect(slugifyDisplayName("Profe Bitcoin")).toBe("profe-bitcoin");
    expect(slugifyDisplayName("Maria Lopez")).toBe("maria-lopez");
  });

  it("strips diacritical marks via NFKD", () => {
    expect(slugifyDisplayName("Joaquín Acosta")).toBe("joaquin-acosta");
    expect(slugifyDisplayName("Sofía Pérez")).toBe("sofia-perez");
    expect(slugifyDisplayName("María-José")).toBe("maria-jose");
    // ñ decomposes to n + combining tilde, the tilde is stripped
    expect(slugifyDisplayName("Año Nuevo")).toBe("ano-nuevo");
  });

  it("collapses runs of separator characters", () => {
    expect(slugifyDisplayName("a   b\t\nc")).toBe("a-b-c");
    expect(slugifyDisplayName("foo___bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugifyDisplayName("--hello--")).toBe("hello");
    expect(slugifyDisplayName("   leading spaces")).toBe("leading-spaces");
  });

  it("drops emoji and other non-ASCII chars to nothing", () => {
    expect(slugifyDisplayName("🚀 Rocket Profe")).toBe("rocket-profe");
    expect(slugifyDisplayName("漢字 mixed")).toBe("mixed");
  });

  it("truncates to 40 characters and re-trims trailing hyphens", () => {
    const long = "a".repeat(50);
    const result = slugifyDisplayName(long);
    expect(result?.length).toBeLessThanOrEqual(40);
    expect(result).not.toMatch(/-$/);
  });

  it("returns null when the result is shorter than 3 characters", () => {
    expect(slugifyDisplayName("ab")).toBeNull();
    expect(slugifyDisplayName("a")).toBeNull();
    expect(slugifyDisplayName("")).toBeNull();
    expect(slugifyDisplayName("🚀")).toBeNull();
  });

  it("returns null for reserved route slugs", () => {
    expect(slugifyDisplayName("settings")).toBeNull();
    expect(slugifyDisplayName("My Courses")).toBeNull();
    expect(slugifyDisplayName("Orders")).toBeNull();
    expect(slugifyDisplayName("admin")).toBeNull();
    expect(slugifyDisplayName("api")).toBeNull();
    expect(slugifyDisplayName("panel")).toBeNull(); // legacy
  });

  it("handles names that produce only hyphens or empty after stripping", () => {
    expect(slugifyDisplayName("---")).toBeNull();
    expect(slugifyDisplayName("@@@")).toBeNull();
  });
});
