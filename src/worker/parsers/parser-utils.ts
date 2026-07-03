// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
//
// Petits utilitaires partagés par les parsers (conversion NodeNum, garde des
// NodeNum réservés, décodage SNR traceroute). Volontairement minimal : la
// logique NeighborInfo et Traceroute vit dans leurs modules dédiés.

// NodeNum réservés : 0 (inconnu) et 0xFFFFFFFF (broadcast).
export const BROADCAST_NUM = 0xffffffff;

// Traceroute : SNR en int8 ×4 (0,25 dB) ; INT8_MIN = « inconnu ».
export const SNR_UNKNOWN = -128;

// NodeNum entier -> NodeID hex "!xxxxxxxx" (`>>> 0` = non signé).
export function toNodeId(num: number): string {
  return "!" + (num >>> 0).toString(16).padStart(8, "0");
}

export function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function isRealNode(num: number): boolean {
  return Number.isFinite(num) && num !== 0 && (num >>> 0) !== BROADCAST_NUM;
}

// SNR traceroute (int8 ×4 -> dB ; INT8_MIN -> null). Aligné sur l'index des sauts.
export function decodeTraceSnr(list: number[] | undefined): (number | null)[] {
  if (!Array.isArray(list)) return [];
  return list.map((v) => {
    const n = numOrNull(v);
    return n === null || n === SNR_UNKNOWN ? null : n / 4;
  });
}
