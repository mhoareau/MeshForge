import { describe, it, expect, vi, beforeEach } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../db", () => ({ pool: { query } }));

import { toNodeNeighbors, getNodeNeighbors, insertNodeNeighbors } from "./neighbors";

type Rows = Parameters<typeof toNodeNeighbors>[0];

describe("toNodeNeighbors", () => {
  it("arrondit le SNR (0,1), ISO la date", () => {
    const d = new Date("2026-07-01T10:00:00Z");
    expect(
      toNodeNeighbors([
        { nodeId: "!n", name: "N", snr: "3.14", lat: -21, lon: 55, lastSeen: d },
      ] as Rows),
    ).toEqual([
      { nodeId: "!n", name: "N", snr: 3.1, lat: -21, lon: 55, lastSeen: d.toISOString() },
    ]);
  });

  it("préserve snr / lastSeen null", () => {
    const [r] = toNodeNeighbors([
      { nodeId: "!n", name: null, snr: null, lat: null, lon: null, lastSeen: null },
    ] as Rows);
    expect(r.snr).toBeNull();
    expect(r.lastSeen).toBeNull();
  });
});

describe("insertNodeNeighbors", () => {
  beforeEach(() => query.mockReset());

  it("insère une ligne par voisin avec reporter/gateway/canal", async () => {
    query.mockResolvedValue({});
    await insertNodeNeighbors(
      "!rep",
      [{ neighborId: "!a", snr: 5 }, { neighborId: "!b", snr: null }],
      "!gw",
      "Fr_Balise",
    );
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), ["!rep", "!a", 5, "!gw", "Fr_Balise"]);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), ["!rep", "!b", null, "!gw", "Fr_Balise"]);
  });
});

describe("getNodeNeighbors", () => {
  beforeEach(() => query.mockReset());

  it("interroge par node et normalise", async () => {
    const d = new Date("2026-07-01T10:00:00Z");
    query.mockResolvedValue({
      rows: [{ nodeId: "!a", name: "A", snr: 5, lat: -21, lon: 55, lastSeen: d }],
    });
    const out = await getNodeNeighbors("!rep");
    expect(query).toHaveBeenCalledWith(expect.any(String), ["!rep"]);
    expect(out).toEqual([
      { nodeId: "!a", name: "A", snr: 5, lat: -21, lon: 55, lastSeen: d.toISOString() },
    ]);
  });
});
