import { describe, it, expect } from "vitest";
import { decodeTraceSnr, isRealNode, toNodeId } from "./parser-utils";

describe("decodeTraceSnr", () => {
  it("int8 ×4 -> dB ; INT8_MIN et non-nombres -> null", () => {
    expect(decodeTraceSnr([24, -128, "x" as unknown as number, 0])).toEqual([6, null, null, 0]);
  });

  it("non-tableau -> []", () => {
    expect(decodeTraceSnr(undefined)).toEqual([]);
  });
});

describe("toNodeId / isRealNode", () => {
  it("toNodeId pad en hex non signé", () => {
    expect(toNodeId(0xf669cf14)).toBe("!f669cf14");
    expect(toNodeId(-1)).toBe("!ffffffff");
  });

  it("isRealNode exclut 0, broadcast et non-finis", () => {
    expect(isRealNode(0x1234)).toBe(true);
    expect(isRealNode(0)).toBe(false);
    expect(isRealNode(0xffffffff)).toBe(false);
    expect(isRealNode(NaN)).toBe(false);
  });
});
