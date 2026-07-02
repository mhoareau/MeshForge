import { describe, it, expect } from "vitest";
import { toDirectLinks } from "./direct-links";

// pg : médiane (percentile_cont) en number|string, COUNT (bigint) en string.
describe("toDirectLinks — liens directs agrégés", () => {
  it("arrondit le SNR à 0,1 dB et coerce packets en number", () => {
    expect(
      toDirectLinks([{ aId: "!a", bId: "!b", snr: "3.14159", packets: "42" }]),
    ).toEqual([{ aId: "!a", bId: "!b", snr: 3.1, packets: 42 }]);
  });

  it("préserve snr null (lien sans SNR, ex: traceroute JSON)", () => {
    const [link] = toDirectLinks([
      { aId: "!a", bId: "!b", snr: null, packets: 0 },
    ]);
    expect(link.snr).toBeNull();
    expect(link.packets).toBe(0);
  });
});
