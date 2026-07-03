// Logique pure des tableaux de liens de la fiche node (onglets + tri). Séparée
// du composant pour être testée à 100 % (vitest ne résout pas l'alias @/ ->
// imports relatifs). Les deux onglets partagent le MÊME jeu de colonnes.
import type { NodeGatewayLink, NodeHeardLink } from "../types";

export interface LinkRow {
  id: string; // node/gateway id (clé + lien /node/[id])
  name: string | null;
  snr: number | null;
  hop: number | null; // 0 = direct
  distanceKm: number | null;
  packets: number;
  lastHeard: string | null; // ISO 8601
  hasPosition: boolean; // false -> badge « sans position »
}

export type SortKey =
  | "name"
  | "snr"
  | "hop"
  | "distanceKm"
  | "packets"
  | "lastHeard";
export type SortDir = 1 | -1;

// Gateways qui ont capté le sujet -> lignes. Un gateway a toujours une position
// connue de son côté (hasPosition = true) ; distanceKm peut néanmoins être null.
export function gatewayRows(gateways: NodeGatewayLink[]): LinkRow[] {
  return gateways.map((g) => ({
    id: g.gatewayId,
    name: g.gatewayName,
    snr: g.snr,
    hop: g.bestHop,
    distanceKm: g.distanceKm,
    packets: g.packets,
    lastHeard: g.lastHeard,
    hasPosition: true,
  }));
}

// Nodes captés par le sujet -> lignes (miroir). hasPosition remonté tel quel.
export function heardRows(heard: NodeHeardLink[]): LinkRow[] {
  return heard.map((h) => ({
    id: h.nodeId,
    name: h.nodeName,
    snr: h.snr,
    hop: h.bestHop,
    distanceKm: h.distanceKm,
    packets: h.packets,
    lastHeard: h.lastHeard,
    hasPosition: h.hasPosition,
  }));
}

// Tri (copie, ne mute pas). Les valeurs nulles finissent TOUJOURS en dernier,
// quel que soit le sens. `name` compare le nom (ou l'id à défaut) en français.
export function sortRows(
  rows: LinkRow[],
  key: SortKey,
  dir: SortDir,
): LinkRow[] {
  const val = (r: LinkRow): string | number | null =>
    key === "name" ? (r.name ?? r.id) : r[key];
  return [...rows].sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    let cmp: number;
    if (key === "name") cmp = String(av).localeCompare(String(bv), "fr");
    else if (key === "lastHeard")
      cmp = new Date(av as string).getTime() - new Date(bv as string).getTime();
    else cmp = (av as number) - (bv as number);
    return cmp * dir;
  });
}

// Sens de tri par défaut au clic sur une colonne : alphabétique croissant pour
// le nom, décroissant (meilleur/plus grand/plus récent d'abord) pour le reste.
export const defaultDir = (key: SortKey): SortDir => (key === "name" ? 1 : -1);

export const fmtSnr = (v: number | null): string => (v === null ? "—" : `${v} dB`);
export const hopLabel = (h: number | null): string =>
  h === null ? "—" : h === 0 ? "direct" : `${h} hop${h > 1 ? "s" : ""}`;
export const fmtDist = (v: number | null): string => (v === null ? "—" : `${v} km`);
export const fmtDate = (iso: string | null): string =>
  iso === null ? "—" : new Date(iso).toLocaleString("fr-FR");
