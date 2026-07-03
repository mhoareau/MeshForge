import { describe, it, expect } from "vitest";
import { parseMqttPacket } from "./index";

const CHANNELS = ["Fr_Balise"];
const JSON_TOPIC = "msh/EU_868/2/json/Fr_Balise/!aabbccdd";

function buf(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj));
}

// parseMqttPacket : aiguillage par topic -> une trame (ou null). NeighborInfo/
// Traceroute attachent leurs données diagnostiques à la trame de base.
describe("parseMqttPacket", () => {
  it("renvoie null pour un topic non géré", () => {
    expect(parseMqttPacket("msh/EU_868/2/other/x", Buffer.from(""), CHANNELS)).toBeNull();
  });

  it("JSON simple -> une trame", () => {
    const out = parseMqttPacket(
      JSON_TOPIC,
      buf({ from: 1, sender: "!aabbccdd", type: "position" }),
      CHANNELS,
    );
    expect(out?.packetType).toBe("position");
  });

  it("JSON sur canal privé -> null", () => {
    expect(
      parseMqttPacket(
        "msh/EU_868/2/json/Secret/!aabbccdd",
        buf({ from: 1, sender: "!aabbccdd", type: "position" }),
        CHANNELS,
      ),
    ).toBeNull();
  });

  it("JSON NeighborInfo : voisins attachés à la trame", () => {
    const out = parseMqttPacket(
      JSON_TOPIC,
      buf({
        from: 0xf669cf14,
        sender: "!aabbccdd",
        type: "neighborinfo",
        payload: { neighbors: [{ node_id: 0x11111111, snr: 5 }] },
      }),
      CHANNELS,
    );
    expect(out?.packetType).toBe("neighborinfo");
    expect(out?.neighbors).toEqual([{ neighborId: "!11111111", snr: 5 }]);
  });

  it("branche /map/ : report invalide -> null", () => {
    expect(
      parseMqttPacket("msh/EU_868/2/map/Fr_Balise/!gw", Buffer.alloc(0), CHANNELS),
    ).toBeNull();
  });

  it("branche /e/ : envelope indécodable -> null", () => {
    expect(
      parseMqttPacket("msh/EU_868/2/e/Fr_Balise/!gw", Buffer.alloc(0), CHANNELS),
    ).toBeNull();
  });
});
