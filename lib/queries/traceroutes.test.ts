import { describe, it, expect, vi, beforeEach } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../db", () => ({ pool: { query } }));

import {
  toNodeTraceroutes,
  getNodeTraceroutes,
  insertTracerouteSegments,
} from "./traceroutes";
import type { RawMeshtasticPacket, TracerouteInfo } from "../../types";

type Rows = Parameters<typeof toNodeTraceroutes>[0];

describe("toNodeTraceroutes", () => {
  it("groupe les segments par traceroute, calcule otherNode et arrondit le SNR", () => {
    const d = new Date("2026-07-01T10:00:00Z");
    const rows = [
      { packetId: 7, sourceNode: "!a", targetNode: "!d", receivedAt: d, direction: "forward", step: 0, fromNode: "!a", fromName: "A", toNode: "!b", toName: "B", snr: "6.04" },
      { packetId: 7, sourceNode: "!a", targetNode: "!d", receivedAt: d, direction: "forward", step: 1, fromNode: "!b", fromName: "B", toNode: "!d", toName: null, snr: null },
    ] as Rows;
    const out = toNodeTraceroutes(rows, "!a");
    expect(out).toHaveLength(1);
    expect(out[0].otherNode).toBe("!d"); // le node consulté est la source
    expect(out[0].hops).toHaveLength(2);
    expect(out[0].hops[0].snr).toBe(6);
    expect(out[0].hops[1].snr).toBeNull();
  });

  it("otherNode = source quand le node consulté est la destination", () => {
    const d = new Date("2026-07-01T10:00:00Z");
    const rows = [
      { packetId: 1, sourceNode: "!a", targetNode: "!d", receivedAt: d, direction: "forward", step: 0, fromNode: "!a", fromName: null, toNode: "!d", toName: null, snr: null },
    ] as Rows;
    expect(toNodeTraceroutes(rows, "!d")[0].otherNode).toBe("!a");
  });
});

describe("insertTracerouteSegments", () => {
  beforeEach(() => query.mockReset());

  it("insère une ligne par segment (raw sérialisé)", async () => {
    query.mockResolvedValue({});
    const info: TracerouteInfo = {
      sourceNode: "!a",
      targetNode: "!d",
      packetId: 7,
      segments: [{ direction: "forward", step: 0, fromNode: "!a", toNode: "!b", snr: 6 }],
    };
    const raw = { from: 1 } as RawMeshtasticPacket;
    await insertTracerouteSegments(info, "!gw", "Fr_Balise", raw);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([
      7, "Fr_Balise", "!a", "!d", "!gw", "forward", 0, "!a", "!b", 6, JSON.stringify(raw),
    ]);
  });
});

describe("getNodeTraceroutes", () => {
  beforeEach(() => query.mockReset());

  it("interroge par node et reconstruit", async () => {
    const d = new Date("2026-07-01T10:00:00Z");
    query.mockResolvedValue({
      rows: [
        { packetId: 7, sourceNode: "!a", targetNode: "!d", receivedAt: d, direction: "forward", step: 0, fromNode: "!a", fromName: null, toNode: "!d", toName: null, snr: null },
      ],
    });
    const out = await getNodeTraceroutes("!a");
    expect(query).toHaveBeenCalledWith(expect.any(String), ["!a"]);
    expect(out[0].otherNode).toBe("!d");
  });
});
