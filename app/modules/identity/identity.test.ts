import { describe, test } from "remix/test";
import { expect } from "remix/assert";
import { safeRedirectTo } from "./identity.server.ts";

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
