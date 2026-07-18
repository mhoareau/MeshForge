-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Robin Lebon — La Forge Numérique
-- Répare les positions courantes invalides depuis le dernier paquet valide.
-- Idempotente : les nodes déjà valides ne sont jamais modifiés.

WITH latest_valid AS (
    SELECT DISTINCT ON (node_id)
        node_id,
        lat,
        lon
    FROM packets
    WHERE lat IS NOT NULL
      AND lon IS NOT NULL
      AND NOT (lat = 0 AND lon = 0)
      AND lat BETWEEN -90 AND 90
      AND lon BETWEEN -180 AND 180
    ORDER BY node_id, received_at DESC
)
UPDATE nodes AS n
SET last_lat = v.lat,
    last_lon = v.lon
FROM latest_valid AS v
WHERE n.node_id = v.node_id
  AND (
    (n.last_lat IS NULL) <> (n.last_lon IS NULL)
    OR (n.last_lat = 0 AND n.last_lon = 0)
    OR n.last_lat NOT BETWEEN -90 AND 90
    OR n.last_lon NOT BETWEEN -180 AND 180
  );

UPDATE nodes
SET last_lat = NULL,
    last_lon = NULL
WHERE (last_lat IS NULL) <> (last_lon IS NULL)
   OR (last_lat = 0 AND last_lon = 0)
   OR last_lat NOT BETWEEN -90 AND 90
   OR last_lon NOT BETWEEN -180 AND 180;
