import { describe, it, expect } from "vitest";
import { normalizeUrlForDedup } from "../normalizeUrl";

describe("normalizeUrlForDedup", () => {
  it("strips the www prefix", () => {
    expect(normalizeUrlForDedup("https://www.example.com/page")).toBe(
      normalizeUrlForDedup("https://example.com/page")
    );
  });

  it("strips a trailing slash", () => {
    expect(normalizeUrlForDedup("https://example.com/page/")).toBe(
      normalizeUrlForDedup("https://example.com/page")
    );
  });

  it("strips tracking params so the same video with a different ?si= still dedups", () => {
    const a = normalizeUrlForDedup("https://www.youtube.com/watch?v=abc123&si=xyz789");
    const b = normalizeUrlForDedup("https://www.youtube.com/watch?v=abc123");
    expect(a).toBe(b);
  });

  it("keeps non-tracking query params, since they can change the actual page", () => {
    const a = normalizeUrlForDedup("https://example.com/watch?v=abc123");
    const b = normalizeUrlForDedup("https://example.com/watch?v=def456");
    expect(a).not.toBe(b);
  });

  it("is case-insensitive on the host", () => {
    expect(normalizeUrlForDedup("https://WWW.Example.com/Page")).toBe(
      normalizeUrlForDedup("https://example.com/page".toLowerCase())
    );
  });

  it("falls back to a lowercased trim for a malformed URL instead of throwing", () => {
    expect(normalizeUrlForDedup("  Not A URL  ")).toBe("not a url");
  });
});
