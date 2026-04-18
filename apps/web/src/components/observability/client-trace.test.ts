import { describe, expect, it } from "vitest";
import { getTraceRouteArea, isHighValueTracePath } from "@/components/observability/client-trace";

describe("client trace route coverage", () => {
  it("classifies high-value auth/dashboard/transactions/onboarding paths", () => {
    expect(getTraceRouteArea("/auth/login")).toBe("auth");
    expect(getTraceRouteArea("/dashboard")).toBe("dashboard");
    expect(getTraceRouteArea("/transactions/123")).toBe("transactions");
    expect(getTraceRouteArea("/onboarding")).toBe("onboarding");
  });

  it("marks unsupported paths as other", () => {
    expect(getTraceRouteArea("/settings")).toBe("other");
    expect(isHighValueTracePath("/settings")).toBe(false);
  });

  it("marks supported areas as high-value trace paths", () => {
    expect(isHighValueTracePath("/auth/register")).toBe(true);
    expect(isHighValueTracePath("/dashboard")).toBe(true);
    expect(isHighValueTracePath("/transactions")).toBe(true);
    expect(isHighValueTracePath("/onboarding/start")).toBe(true);
  });
});
