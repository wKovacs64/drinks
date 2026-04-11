import { describe, expect, test } from "vitest";
import { safeRedirectTo } from "./identity.server";

describe("safeRedirectTo", () => {
  test("returns the path for a valid relative URL", () => {
    expect(safeRedirectTo("/admin")).toBe("/admin");
  });

  test("returns default redirect for null input", () => {
    expect(safeRedirectTo(null)).toBe("/");
  });

  test("returns default redirect for undefined input", () => {
    expect(safeRedirectTo(undefined)).toBe("/");
  });

  test("returns custom default redirect", () => {
    expect(safeRedirectTo(null, "/home")).toBe("/home");
  });

  test("rejects absolute URLs to external hosts", () => {
    expect(safeRedirectTo("https://evil.com")).toBe("/");
  });

  test("rejects protocol-relative URLs", () => {
    expect(safeRedirectTo("//evil.com")).toBe("/");
  });
});
