import { describe, it, expect } from "vitest";
import { neighborReports } from "./neighbor-info";

describe("neighborReports", () => {
  it("extrait les voisins (SNR conservé, null inclus)", () => {
    expect(
      neighborReports(0xf669cf14, [
        { node_id: 0x11111111, snr: 6.5 },
        { node_id: 0x22222222 }, // SNR absent -> null
      ]),
    ).toEqual([
      { neighborId: "!11111111", snr: 6.5 },
      { neighborId: "!22222222", snr: null },
    ]);
  });

  it("exclut broadcast et soi-même", () => {
    expect(
      neighborReports(0xf669cf14, [
        { node_id: 0xffffffff, snr: 1 },
        { node_id: 0xf669cf14, snr: 1 },
        { node_id: 0x33333333, snr: 4 },
      ]).map((n) => n.neighborId),
    ).toEqual(["!33333333"]);
  });

  it("dédoublonne (garde la première occurrence)", () => {
    const out = neighborReports(0xf669cf14, [
      { node_id: 0x44444444, snr: 3 },
      { node_id: 0x44444444, snr: -9 },
    ]);
    expect(out).toEqual([{ neighborId: "!44444444", snr: 3 }]);
  });

  it("ignore un voisin sans node_id numérique", () => {
    expect(neighborReports(0xf669cf14, [{ snr: 5 }, { node_id: 0x55555555, snr: 2 }])).toEqual([
      { neighborId: "!55555555", snr: 2 },
    ]);
  });

  it("reporter invalide (0) -> liste vide", () => {
    expect(neighborReports(0, [{ node_id: 1, snr: 1 }])).toEqual([]);
  });

  it("neighbors undefined -> liste vide", () => {
    expect(neighborReports(0xf669cf14, undefined)).toEqual([]);
  });
});
