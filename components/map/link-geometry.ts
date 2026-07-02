// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
//
// Géométrie (en pixels écran) des liens directs courbés. Purement mathématique
// (aucune dépendance MapLibre) -> testable. Le contrôleur projette les ancres
// géo en pixels, appelle ces fonctions, puis re-projette les points en lng/lat.
//
// Pourquoi des arcs : deux pastilles quasi superposées (nœuds "empilés")
// donneraient un trait de longueur nulle, invisible. Un arc quadratique bombe
// perpendiculairement à la corde -> lien + badge (au sommet) visibles, et deux
// liens partant d'une même pile s'écartent naturellement.

export interface Pt {
  x: number;
  y: number;
}

// Point de contrôle de la bézier quadratique : milieu de [a,b] décalé
// perpendiculairement à la corde d'une amplitude `offsetPx`. Corde quasi nulle
// (pile) -> éventail : angle et rayon indexés pour séparer plusieurs liens.
export function controlPoint(a: Pt, b: Pt, offsetPx: number, index = 0): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    const angle = -Math.PI / 2 + index * 0.7;
    const radius = offsetPx + index * 7;
    return { x: mx + Math.cos(angle) * radius, y: my + Math.sin(angle) * radius };
  }
  // Normale unitaire (corde tournée de 90°).
  const nx = -dy / len;
  const ny = dx / len;
  return { x: mx + nx * offsetPx, y: my + ny * offsetPx };
}

// Échantillonne la bézier quadratique a→(c)→b en n+1 points (n segments).
export function quadBezier(a: Pt, c: Pt, b: Pt, n = 14): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    });
  }
  return pts;
}

// Sommet de l'arc (t = 0,5), où ancrer le badge compteur : décalé hors de la
// corde (donc hors d'une éventuelle pile) -> lisible.
export function bezierApex(a: Pt, c: Pt, b: Pt): Pt {
  return {
    x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x,
    y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y,
  };
}
