// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
import { pool } from "../db";
import type { ReachEdge } from "../../types";

interface ReachRow {
  aId: string;
  bId: string;
  hop: string | number;
}

export function toReachEdges(rows: ReachRow[]): ReachEdge[] {
  return rows.map((r) => ({ aId: r.aId, bId: r.bId, hop: Number(r.hop) }));
}

// Arêtes d'atteignabilité pour enrichir le survol d'un nœud sur la carte :
//  - NeighborInfo : reporter ↔ voisin, 0 hop (lien radio direct) ;
//  - Traceroute   : origine ↔ destination, hop = nb de sauts aller (min).
// Paire non-orientée (LEAST/GREATEST), MIN hop toutes sources confondues.
// PRIVACY : uniquement entre nodes affichables (localisés, non exclus).
const SELECT_REACH = `
  WITH edges AS (
    SELECT node_id AS a, neighbor_id AS b, 0 AS hop
    FROM node_neighbors
    WHERE received_at > NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT t.source_node AS a, t.target_node AS b, t.fwd AS hop
    FROM (
      SELECT source_node, target_node, packet_id, received_at,
             COUNT(*) FILTER (WHERE direction = 'forward') AS fwd
      FROM traceroute_segments
      WHERE received_at > NOW() - INTERVAL '30 days'
      GROUP BY source_node, target_node, packet_id, received_at
    ) t
    WHERE t.fwd > 0
  )
  SELECT
    LEAST(e.a, e.b)    AS "aId",
    GREATEST(e.a, e.b) AS "bId",
    MIN(e.hop)         AS "hop"
  FROM edges e
  JOIN nodes na ON na.node_id = e.a
  JOIN nodes nb ON nb.node_id = e.b
  WHERE e.a <> e.b
    AND na.last_lat IS NOT NULL AND na.last_lon IS NOT NULL
    AND nb.last_lat IS NOT NULL AND nb.last_lon IS NOT NULL
    AND NOT na.excluded AND NOT nb.excluded
  GROUP BY LEAST(e.a, e.b), GREATEST(e.a, e.b)
`;

export async function getNodeReach(): Promise<ReachEdge[]> {
  const { rows } = await pool.query<ReachRow>(SELECT_REACH);
  return toReachEdges(rows);
}
