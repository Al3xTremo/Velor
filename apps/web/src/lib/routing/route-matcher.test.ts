import { describe, expect, it } from "vitest";
import { routeMatches } from "./route-matcher";

describe("routeMatches", () => {
  it("matches exact protected routes", () => {
    expect(routeMatches("/dashboard", ["/dashboard", "/settings"])).toBe(true);
  });

  it("matches nested protected routes", () => {
    expect(routeMatches("/transactions/123/edit", ["/transactions"])).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(routeMatches("/public", ["/dashboard", "/settings"])).toBe(false);
  });
});
