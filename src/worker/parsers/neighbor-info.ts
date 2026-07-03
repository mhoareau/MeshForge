// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
//
// Décodage NeighborInfo (portnum 71) : un node diffuse la liste de ses voisins
// DIRECTS (0 hop) avec le SNR de réception. On en extrait des `NeighborReport`
// (voisin + SNR) ; le worker les enregistre dans `node_neighbors` pour le
// diagnostic « Voisinage réseau » de la fiche node.
import type { NeighborReport } from "../../../types";
import { isRealNode, numOrNull, toNodeId } from "./parser-utils";

// Forme décodée d'un paquet NeighborInfo (protobuf ou JSON).
export interface RawNeighbor {
  node_id?: number;
  snr?: number;
}

// Voisins valides rapportés par `reporterNum` : exclut broadcast / soi-même,
// dédoublonne (garde le premier SNR vu). reporter invalide -> liste vide.
export function neighborReports(
  reporterNum: number,
  neighbors: RawNeighbor[] | undefined,
): NeighborReport[] {
  if (!isRealNode(reporterNum)) return [];
  const out: NeighborReport[] = [];
  const seen = new Set<string>();
  for (const n of neighbors ?? []) {
    const num = numOrNull(n?.node_id);
    if (num === null || !isRealNode(num) || (num >>> 0) === (reporterNum >>> 0)) {
      continue;
    }
    const id = toNodeId(num);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ neighborId: id, snr: numOrNull(n?.snr) });
  }
  return out;
}
