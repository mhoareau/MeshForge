import { describe, expect, it } from "vitest";
import { resolveGatewayStatus } from "./nodes";

describe("resolveGatewayStatus", () => {
  it("suit l'auto-détection quand l'override est null", () => {
    expect(resolveGatewayStatus(null, true)).toBe(true);
    expect(resolveGatewayStatus(null, false)).toBe(false);
  });

  it("force le statut gateway quand l'admin pose un override", () => {
    expect(resolveGatewayStatus(true, false)).toBe(true);
    expect(resolveGatewayStatus(false, true)).toBe(false);
  });
});
