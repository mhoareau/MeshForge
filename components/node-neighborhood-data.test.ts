import { describe, it, expect } from "vitest";
import {
  SUBJECT_COLOR,
  buildLinkFeatures,
  buildNodeFeatures,
  fmtSnr,
  locatedNeighbors,
  nodeLabel,
  shortId,
  splitHops,
  type SubjectNode,
} from "./node-neighborhood-data";
import type { NodeNeighbor, TracerouteHop } from "../types";

const node: SubjectNode = { nodeId: "!f669cf14", name: "Piton", lat: -21.1, lon: 55.5 };
const nb = (o: Partial<NodeNeighbor> & { nodeId: string }): NodeNeighbor => ({
  nodeId: o.nodeId,
  name: o.name ?? null,
  snr: o.snr ?? null,
  lat: o.lat ?? null,
  lon: o.lon ?? null,
  lastSeen: o.lastSeen ?? null,
});

describe("formatage", () => {
  it("shortId = 4 derniers hex", () => {
    expect(shortId("!f669cf14")).toBe("cf14");
  });

  it("nodeLabel : nom si présent, sinon short id (nom vide/espaces -> short id)", () => {
    expect(nodeLabel("!f669cf14", "Piton")).toBe("Piton");
    expect(nodeLabel("!f669cf14", "  ")).toBe("cf14");
    expect(nodeLabel("!f669cf14", null)).toBe("cf14");
  });

  it("fmtSnr : null -> tiret, sinon valeur + dB", () => {
    expect(fmtSnr(null)).toBe("— dB");
    expect(fmtSnr(-7)).toBe("-7 dB");
  });
});

describe("locatedNeighbors", () => {
  it("ne garde que les voisins avec lat ET lon", () => {
    const out = locatedNeighbors([
      nb({ nodeId: "!a", lat: -21, lon: 55 }),
      nb({ nodeId: "!b", lat: -21 }), // pas de lon
      nb({ nodeId: "!c" }), // aucune position
    ]);
    expect(out.map((n) => n.nodeId)).toEqual(["!a"]);
  });
});

describe("buildLinkFeatures", () => {
  const located = [
    nb({ nodeId: "!a", snr: 5, lat: -21.2, lon: 55.6 }),
    nb({ nodeId: "!b", snr: -20, lat: -21.3, lon: 55.7 }),
  ];

  it("un lien par voisin, couleur SNR, aucun dim sans survol", () => {
    const fc = buildLinkFeatures(node, located, null);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].properties).toMatchObject({ color: "#00ff00", dim: false });
    expect(fc.features[1].properties).toMatchObject({ color: "#f7931a", dim: false });
    expect((fc.features[0].geometry as GeoJSON.LineString).coordinates).toEqual([
      [55.5, -21.1],
      [55.6, -21.2],
    ]);
  });

  it("survol -> dim sur les AUTRES voisins seulement", () => {
    const fc = buildLinkFeatures(node, located, "!a");
    expect(fc.features[0].properties?.dim).toBe(false);
    expect(fc.features[1].properties?.dim).toBe(true);
  });
});

describe("buildNodeFeatures", () => {
  it("point sujet (kind subject) + un point par voisin", () => {
    const fc = buildNodeFeatures(node, [nb({ nodeId: "!a", name: "Voisin", snr: 5, lat: -21.2, lon: 55.6 })]);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].properties).toMatchObject({ kind: "subject", label: "Piton", color: SUBJECT_COLOR });
    expect(fc.features[1].properties).toMatchObject({ kind: "neighbor", nodeId: "!a", label: "Voisin", color: "#00ff00" });
  });
});

describe("splitHops", () => {
  it("sépare aller / retour", () => {
    const hop = (direction: "forward" | "back", step: number): TracerouteHop => ({
      direction, step, fromNode: "!x", fromName: null, toNode: "!y", toName: null, snr: null,
    });
    const { forward, back } = splitHops([hop("forward", 0), hop("back", 0), hop("forward", 1)]);
    expect(forward).toHaveLength(2);
    expect(back).toHaveLength(1);
  });
});
