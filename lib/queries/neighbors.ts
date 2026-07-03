// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
import { pool } from "../db";
import type { NeighborReport, NodeNeighbor } from "../../types";

const INSERT_NEIGHBOR = `
  INSERT INTO node_neighbors (node_id, neighbor_id, snr, gateway_id, channel)
  VALUES ($1, $2, $3, $4, $5)
`;

// Enregistre les voisins directs déclarés par un node (paquet NeighborInfo).
export async function insertNodeNeighbors(
  nodeId: string,
  neighbors: NeighborReport[],
  gatewayId: string | null,
  channel: string,
): Promise<void> {
  for (const n of neighbors) {
    await pool.query(INSERT_NEIGHBOR, [nodeId, n.neighborId, n.snr, gatewayId, channel]);
  }
}

// pg : AVG(snr) en number|string, date -> Date.
interface NeighborRow {
  nodeId: string;
  name: string | null;
  snr: string | number | null;
  lat: number | null;
  lon: number | null;
  lastSeen: Date | null;
}

export function toNodeNeighbors(rows: NeighborRow[]): NodeNeighbor[] {
  return rows.map((r) => ({
    nodeId: r.nodeId,
    name: r.name,
    snr: r.snr == null ? null : Math.round(Number(r.snr) * 10) / 10,
    lat: r.lat,
    lon: r.lon,
    lastSeen: r.lastSeen ? r.lastSeen.toISOString() : null,
  }));
}

// Voisins directs d'un node sur 30 j : dernier SNR moyen + position (pour la
// mini-carte). LEFT JOIN nodes -> nom + position ; un voisin sans position
// (jamais localisé) sort quand même (lat/lon null -> non tracé côté carte).
// PRIVACY : les voisins exclus (opt-out) sont retirés.
const SELECT_NEIGHBORS = `
  SELECT
    nn.neighbor_id                        AS "nodeId",
    COALESCE(n.long_name, n.short_name)   AS "name",
    AVG(nn.snr)                           AS "snr",
    n.last_lat                            AS "lat",
    n.last_lon                            AS "lon",
    MAX(nn.received_at)                   AS "lastSeen"
  FROM node_neighbors nn
  LEFT JOIN nodes n ON n.node_id = nn.neighbor_id
  WHERE nn.node_id = $1
    AND nn.received_at > NOW() - INTERVAL '30 days'
    AND (n.node_id IS NULL OR NOT n.excluded)
  GROUP BY nn.neighbor_id, n.long_name, n.short_name, n.last_lat, n.last_lon
  ORDER BY "lastSeen" DESC
`;

export async function getNodeNeighbors(nodeId: string): Promise<NodeNeighbor[]> {
  const { rows } = await pool.query<NeighborRow>(SELECT_NEIGHBORS, [nodeId]);
  return toNodeNeighbors(rows);
}
