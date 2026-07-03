import { describe, it, expect } from "vitest";
import {
  gatewayRows,
  heardRows,
  sortRows,
  defaultDir,
  fmtSnr,
  hopLabel,
  fmtDist,
  fmtDate,
  type LinkRow,
} from "./node-links-data";
import type { NodeGatewayLink, NodeHeardLink } from "../types";

const gw = (o: Partial<NodeGatewayLink>): NodeGatewayLink => ({
  gatewayId: "!gw",
  gatewayName: "GW",
  snr: 1,
  bestHop: 0,
  packets: 5,
  distanceKm: 8,
  lastHeard: "2026-06-30T08:00:00.000Z",
  ...o,
});
const hn = (o: Partial<NodeHeardLink>): NodeHeardLink => ({
  nodeId: "!nd",
  nodeName: "ND",
  snr: 2,
  bestHop: 1,
  packets: 3,
  lastHeard: "2026-06-30T09:00:00.000Z",
  distanceKm: 12,
  hasPosition: true,
  ...o,
});
const row = (o: Partial<LinkRow>): LinkRow => ({
  id: "!x",
  name: "X",
  snr: 0,
  hop: 0,
  distanceKm: 0,
  packets: 0,
  lastHeard: "2026-06-30T00:00:00.000Z",
  hasPosition: true,
  ...o,
});

describe("gatewayRows / heardRows", () => {
  it("mappe un gateway en LinkRow (hasPosition toujours vrai)", () => {
    expect(gatewayRows([gw({ gatewayId: "!g1", gatewayName: null })])).toEqual([
      {
        id: "!g1",
        name: null,
        snr: 1,
        hop: 0,
        distanceKm: 8,
        packets: 5,
        lastHeard: "2026-06-30T08:00:00.000Z",
        hasPosition: true,
      },
    ]);
  });

  it("mappe un node entendu en LinkRow (hasPosition remonté)", () => {
    expect(
      heardRows([hn({ nodeId: "!n1", hasPosition: false, distanceKm: null })]),
    ).toEqual([
      {
        id: "!n1",
        name: "ND",
        snr: 2,
        hop: 1,
        distanceKm: null,
        packets: 3,
        lastHeard: "2026-06-30T09:00:00.000Z",
        hasPosition: false,
      },
    ]);
  });
});

describe("sortRows", () => {
  const a = row({ id: "!a", name: "Alpha", snr: -5, hop: 2, distanceKm: 30, packets: 4, lastHeard: "2026-06-01T00:00:00Z" });
  const b = row({ id: "!b", name: "Bravo", snr: 3, hop: 0, distanceKm: 8, packets: 20, lastHeard: "2026-06-03T00:00:00Z" });
  const c = row({ id: "!c", name: "Charlie", snr: null, hop: null, distanceKm: null, packets: 1, lastHeard: "2026-06-02T00:00:00Z" });

  it("ne mute pas l'entrée", () => {
    const input = [a, b];
    sortRows(input, "snr", -1);
    expect(input).toEqual([a, b]);
  });

  it("trie par SNR décroissant, nulls en dernier", () => {
    expect(sortRows([a, b, c], "snr", -1).map((r) => r.id)).toEqual(["!b", "!a", "!c"]);
  });

  it("trie par SNR croissant, nulls TOUJOURS en dernier", () => {
    expect(sortRows([a, b, c], "snr", 1).map((r) => r.id)).toEqual(["!a", "!b", "!c"]);
  });

  it("trie par nom (français) — retombe sur l'id si le nom est nul", () => {
    // l'id (préfixe « ! ») trie avant les lettres : comportement déterministe.
    const noName = row({ id: "!z", name: null });
    expect(sortRows([b, a, noName], "name", 1).map((r) => r.id)).toEqual(["!z", "!a", "!b"]);
  });

  it("trie par date (dernier paquet)", () => {
    expect(sortRows([a, b, c], "lastHeard", -1).map((r) => r.id)).toEqual(["!b", "!c", "!a"]);
  });

  it("trie par hop et par paquets", () => {
    expect(sortRows([a, b, c], "hop", 1).map((r) => r.id)).toEqual(["!b", "!a", "!c"]);
    expect(sortRows([a, b, c], "packets", -1).map((r) => r.id)).toEqual(["!b", "!a", "!c"]);
  });

  it("deux nulls sur la même colonne restent stables (cmp 0)", () => {
    const c2 = row({ id: "!c2", snr: null });
    expect(sortRows([c, c2], "snr", -1).map((r) => r.id)).toEqual(["!c", "!c2"]);
  });

  it("null en second argument passe en dernier (branche bv null)", () => {
    // nul en tête d'entrée -> le tri par insertion compare (non-nul, nul).
    expect(sortRows([c, b], "snr", -1).map((r) => r.id)).toEqual(["!b", "!c"]);
  });
});

describe("defaultDir", () => {
  it("croissant pour le nom, décroissant sinon", () => {
    expect(defaultDir("name")).toBe(1);
    expect(defaultDir("snr")).toBe(-1);
    expect(defaultDir("lastHeard")).toBe(-1);
  });
});

describe("formatteurs", () => {
  it("fmtSnr", () => {
    expect(fmtSnr(null)).toBe("—");
    expect(fmtSnr(-3.5)).toBe("-3.5 dB");
  });
  it("hopLabel : direct / n hop(s) / —", () => {
    expect(hopLabel(null)).toBe("—");
    expect(hopLabel(0)).toBe("direct");
    expect(hopLabel(1)).toBe("1 hop");
    expect(hopLabel(3)).toBe("3 hops");
  });
  it("fmtDist", () => {
    expect(fmtDist(null)).toBe("—");
    expect(fmtDist(8)).toBe("8 km");
  });
  it("fmtDate : — si null, sinon une date non vide", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("2026-06-30T08:00:00.000Z")).not.toBe("—");
  });
});
