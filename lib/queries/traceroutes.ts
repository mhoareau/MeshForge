// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
import { pool } from "../db";
import { snapToGrid } from "../privacy";
import type {
  NodeTraceroute,
  RawMeshtasticPacket,
  TracerouteInfo,
} from "../../types";

const INSERT_SEGMENT = `
  INSERT INTO traceroute_segments (
    packet_id, channel, source_node, target_node, gateway_id,
    direction, step, from_node, to_node, snr, raw
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
`;

// Enregistre chaque saut d'un traceroute (aller + retour) -> reconstruction fine.
// Tous les segments d'un même traceroute sont insérés dans UNE transaction :
//  - atomicité (pas de trajet tronqué si un INSERT échoue) ;
//  - received_at (DEFAULT NOW() = transaction_timestamp()) IDENTIQUE pour tous
//    les segments, sinon le regroupement par instant (toNodeTraceroutes) peut
//    fragmenter un même relevé si les INSERT chevauchent une bordure de ms.
export async function insertTracerouteSegments(
  info: TracerouteInfo,
  gatewayId: string | null,
  channel: string,
  raw: RawMeshtasticPacket,
): Promise<void> {
  const rawJson = JSON.stringify(raw);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of info.segments) {
      await client.query(INSERT_SEGMENT, [
        info.packetId,
        channel,
        info.sourceNode,
        info.targetNode,
        gatewayId,
        s.direction,
        s.step,
        s.fromNode,
        s.toNode,
        s.snr,
        rawJson,
      ]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

interface SegmentRow {
  packetId: number | null;
  sourceNode: string;
  targetNode: string;
  receivedAt: Date;
  direction: "forward" | "back";
  step: string | number;
  fromNode: string;
  fromName: string | null;
  fromLat: number | null;
  fromLon: number | null;
  fromIsMobile: boolean | null;
  toNode: string;
  toName: string | null;
  toLat: number | null;
  toLon: number | null;
  toIsMobile: boolean | null;
  snr: string | number | null;
}

// Regroupe les segments par traceroute (packet_id + extrémités + instant) et
// construit chaque trajet, avec le nœud « en face » du node consulté.
export function toNodeTraceroutes(
  rows: SegmentRow[],
  nodeId: string,
): NodeTraceroute[] {
  const byKey = new Map<string, NodeTraceroute>();
  for (const r of rows) {
    const iso = r.receivedAt.toISOString();
    const key = `${r.packetId}|${r.sourceNode}|${r.targetNode}|${iso}`;
    let t = byKey.get(key);
    if (!t) {
      t = {
        sourceNode: r.sourceNode,
        targetNode: r.targetNode,
        otherNode: r.sourceNode === nodeId ? r.targetNode : r.sourceNode,
        receivedAt: iso,
        hops: [],
      };
      byKey.set(key, t);
    }
    const fromPos =
      r.fromLat != null && r.fromLon != null && r.fromIsMobile !== false
        ? snapToGrid(r.fromLat, r.fromLon)
        : { lat: r.fromLat, lon: r.fromLon };
    const toPos =
      r.toLat != null && r.toLon != null && r.toIsMobile !== false
        ? snapToGrid(r.toLat, r.toLon)
        : { lat: r.toLat, lon: r.toLon };
    t.hops.push({
      direction: r.direction,
      step: Number(r.step),
      fromNode: r.fromNode,
      fromName: r.fromName,
      fromLat: fromPos.lat,
      fromLon: fromPos.lon,
      toNode: r.toNode,
      toName: r.toName,
      toLat: toPos.lat,
      toLon: toPos.lon,
      snr: r.snr == null ? null : Math.round(Number(r.snr) * 10) / 10,
    });
  }
  return [...byKey.values()];
}

// Dernier traceroute par paire source/target impliquant ce node, puis segments
// ordonnés (aller/retour, étape). Évite de charger tout l'historique 30 j.
const SELECT_TRACEROUTES = `
  WITH latest AS (
    SELECT DISTINCT ON (source_node, target_node)
      source_node,
      target_node,
      received_at,
      packet_id
    FROM traceroute_segments
    WHERE (source_node = $1 OR target_node = $1)
      AND received_at > NOW() - INTERVAL '30 days'
    ORDER BY source_node, target_node, received_at DESC
  )
  SELECT
    ts.packet_id                          AS "packetId",
    ts.source_node                        AS "sourceNode",
    ts.target_node                        AS "targetNode",
    ts.received_at                        AS "receivedAt",
    ts.direction, ts.step,
    ts.from_node                          AS "fromNode",
    COALESCE(fn.short_name, fn.long_name) AS "fromName",
    fn.last_lat                           AS "fromLat",
    fn.last_lon                           AS "fromLon",
    fn.is_mobile                          AS "fromIsMobile",
    ts.to_node                            AS "toNode",
    COALESCE(tn.short_name, tn.long_name) AS "toName",
    tn.last_lat                           AS "toLat",
    tn.last_lon                           AS "toLon",
    tn.is_mobile                          AS "toIsMobile",
    ts.snr
  FROM traceroute_segments ts
  JOIN latest l
    ON l.source_node = ts.source_node
   AND l.target_node = ts.target_node
   AND l.received_at = ts.received_at
   AND l.packet_id IS NOT DISTINCT FROM ts.packet_id
  LEFT JOIN nodes fn ON fn.node_id = ts.from_node
  LEFT JOIN nodes tn ON tn.node_id = ts.to_node
  ORDER BY ts.received_at DESC, ts.direction, ts.step
`;

export async function getNodeTraceroutes(nodeId: string): Promise<NodeTraceroute[]> {
  const { rows } = await pool.query<SegmentRow>(SELECT_TRACEROUTES, [nodeId]);
  return toNodeTraceroutes(rows, nodeId);
}
