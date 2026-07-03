import { describe, it, expect, vi, beforeEach } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../db", () => ({ pool: { query } }));

import { toReachEdges, getNodeReach } from "./reach";

describe("toReachEdges", () => {
  it("coerce hop en number", () => {
    expect(toReachEdges([{ aId: "!a", bId: "!b", hop: "3" }])).toEqual([
      { aId: "!a", bId: "!b", hop: 3 },
    ]);
  });
});

describe("getNodeReach", () => {
  beforeEach(() => query.mockReset());

  it("interroge et normalise", async () => {
    query.mockResolvedValue({ rows: [{ aId: "!a", bId: "!b", hop: 0 }] });
    const out = await getNodeReach();
    expect(query).toHaveBeenCalledTimes(1);
    expect(out).toEqual([{ aId: "!a", bId: "!b", hop: 0 }]);
  });
});
