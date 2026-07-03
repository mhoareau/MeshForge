"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { NodeNeighbor, NodeTraceroute, TracerouteHop } from "@/types";
import { signalColor } from "@/components/map/signal-color";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SUBJECT_COLOR = "#2563eb";

type Props = {
  node: { nodeId: string; name: string; lat: number | null; lon: number | null };
  neighbors: NodeNeighbor[];
  traceroutes: NodeTraceroute[];
};

const shortId = (id: string) => id.replace(/^!/, "").slice(-4);
const label = (id: string, name: string | null) => name?.trim() || shortId(id);
const fmtSnr = (s: number | null) => (s == null ? "— dB" : `${s} dB`);

export default function NodeNeighborhood({ node, neighbors, traceroutes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const located = neighbors.filter((n) => n.lat != null && n.lon != null);
  const canMap = node.lat != null && node.lon != null && located.length > 0;

  // Liens sujet -> voisin, colorés par SNR ; `dim` = estompé si un autre est survolé.
  const buildLinks = (hoveredId: string | null): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: located.map((n) => ({
      type: "Feature",
      properties: {
        color: signalColor(n.snr),
        dim: hoveredId != null && hoveredId !== n.nodeId,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [node.lon as number, node.lat as number],
          [n.lon as number, n.lat as number],
        ],
      },
    })),
  });

  const buildNodes = (): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "subject", label: label(node.nodeId, node.name), color: SUBJECT_COLOR },
        geometry: { type: "Point", coordinates: [node.lon as number, node.lat as number] },
      },
      ...located.map((n) => ({
        type: "Feature" as const,
        properties: { kind: "neighbor", nodeId: n.nodeId, label: label(n.nodeId, n.name), color: signalColor(n.snr) },
        geometry: { type: "Point" as const, coordinates: [n.lon as number, n.lat as number] },
      })),
    ],
  });

  // Init carte (une fois). fitBounds sur sujet + voisins localisés.
  useEffect(() => {
    if (!containerRef.current || !canMap) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [node.lon as number, node.lat as number],
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource("nb-links", { type: "geojson", data: buildLinks(null) });
      map.addSource("nb-nodes", { type: "geojson", data: buildNodes() });
      map.addLayer({
        id: "nb-links",
        type: "line",
        source: "nb-links",
        layout: { "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "dim"], 1.5, 3],
          "line-opacity": ["case", ["get", "dim"], 0.2, 0.9],
        },
      });
      map.addLayer({
        id: "nb-nodes",
        type: "circle",
        source: "nb-nodes",
        paint: {
          "circle-radius": ["case", ["==", ["get", "kind"], "subject"], 8, 6],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "nb-labels",
        type: "symbol",
        source: "nb-nodes",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
        },
        paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([node.lon as number, node.lat as number]);
      located.forEach((n) => bounds.extend([n.lon as number, n.lat as number]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });

      map.on("mousemove", "nb-nodes", (e) => {
        const p = e.features?.[0]?.properties;
        if (p?.kind === "neighbor" && typeof p.nodeId === "string") {
          map.getCanvas().style.cursor = "pointer";
          setHovered(p.nodeId);
        }
      });
      map.on("mouseleave", "nb-nodes", () => {
        map.getCanvas().style.cursor = "";
        setHovered(null);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canMap]);

  // Survol -> estompe les liens non concernés.
  useEffect(() => {
    const src = mapRef.current?.getSource("nb-links") as maplibregl.GeoJSONSource | undefined;
    src?.setData(buildLinks(hovered));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  if (neighbors.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Aucun voisin direct connu (aucun paquet NeighborInfo reçu sur 30 j).
      </p>
    );
  }

  const trace =
    hovered != null
      ? traceroutes.find((t) => t.otherNode === hovered) ?? null
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {canMap ? (
          <div
            ref={containerRef}
            className="isolate h-64 w-full overflow-hidden rounded-lg border border-black/10 sm:h-80 dark:border-white/15"
          />
        ) : (
          <p className="rounded-lg border border-black/10 p-4 text-sm text-zinc-400 dark:border-white/15">
            Carte indisponible : ce nœud ou ses voisins n&apos;ont pas de position connue.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
          <LegendDot color={SUBJECT_COLOR} text="Ce nœud" />
          <LegendDot color="#00ff00" text="Bon (> −7 dB)" />
          <LegendDot color="#ffe600" text="Moyen" />
          <LegendDot color="#f7931a" text="Faible (< −15 dB)" />
          <LegendDot color="#9ca3af" text="SNR inconnu" />
        </div>
      </div>

      <div className="min-w-0">
        <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {neighbors.map((n) => (
            <li
              key={n.nodeId}
              onMouseEnter={() => setHovered(n.nodeId)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 text-sm ${
                hovered === n.nodeId ? "bg-black/5 dark:bg-white/10" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-none rounded-full ring-1 ring-black/20"
                  style={{ background: signalColor(n.snr) }}
                />
                <a href={`/node/${encodeURIComponent(n.nodeId)}`} className="truncate hover:underline">
                  {label(n.nodeId, n.name)}
                </a>
              </span>
              <span className="flex-none font-mono text-xs text-zinc-500">{fmtSnr(n.snr)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
          <h4 className="mb-2 text-xs font-semibold text-zinc-500">Traceroute</h4>
          {trace ? (
            <TraceroutePath trace={trace} />
          ) : (
            <p className="text-xs text-zinc-400">
              {hovered
                ? "Aucun traceroute disponible pour ce voisin (traceroute passif : dépend des relevés qui ont circulé)."
                : "Survolez un voisin pour voir le chemin traceroute (si disponible)."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ background: color }} />
      {text}
    </span>
  );
}

function TraceroutePath({ trace }: { trace: NodeTraceroute }) {
  const forward = trace.hops.filter((h) => h.direction === "forward");
  const back = trace.hops.filter((h) => h.direction === "back");
  return (
    <div className="space-y-2">
      <HopList title="Aller" hops={forward} />
      {back.length > 0 && <HopList title="Retour" hops={back} />}
    </div>
  );
}

function HopList({ title, hops }: { title: string; hops: TracerouteHop[] }) {
  if (hops.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-medium text-zinc-400">{title}</div>
      <ul className="mt-1 space-y-0.5">
        {hops.map((h) => (
          <li key={`${h.direction}-${h.step}`} className="flex items-center justify-between gap-2 font-mono text-xs">
            <span className="truncate">
              {label(h.fromNode, h.fromName)} <span className="text-zinc-400">→</span>{" "}
              {label(h.toNode, h.toName)}
            </span>
            <span className="flex-none text-zinc-500">{fmtSnr(h.snr)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
