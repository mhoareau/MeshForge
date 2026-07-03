import type { LineLayerSpecification } from "maplibre-gl";

export const MESH_DIRECT_LAYER: LineLayerSpecification = {
  id: "mesh-direct",
  type: "line",
  source: "mesh",
  filter: ["==", ["get", "hop"], 0],
  layout: { "line-cap": "round" },
  paint: { "line-color": "#22c55e", "line-width": 3, "line-opacity": 0.9 },
};

export const MESH_RELAY_LAYER: LineLayerSpecification = {
  id: "mesh-relay",
  type: "line",
  source: "mesh",
  filter: ["!=", ["get", "hop"], 0],
  layout: { "line-cap": "round" },
  paint: {
    "line-color": [
      "interpolate",
      ["linear"],
      ["get", "hop"],
      1,
      "#eab308",
      2,
      "#f97316",
      3,
      "#ef4444",
    ],
    "line-width": 1.5,
    "line-dasharray": [1.5, 1.5],
    "line-opacity": 0.85,
  },
};
