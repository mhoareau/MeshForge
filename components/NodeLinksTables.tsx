"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { NodeGatewayLink, NodeHeardLink } from "@/types";
import {
  gatewayRows,
  heardRows,
  sortRows,
  defaultDir,
  fmtSnr,
  hopLabel,
  fmtDist,
  fmtDate,
  type SortKey,
  type SortDir,
} from "./node-links-data";

type Tab = "gateways" | "heard";

const COLUMNS: { key: SortKey; label: string; num: boolean }[] = [
  { key: "name", label: "Nom", num: false },
  { key: "snr", label: "SNR", num: true },
  { key: "hop", label: "Sauts", num: true },
  { key: "distanceKm", label: "Distance", num: true },
  { key: "packets", label: "Paquets", num: true },
  { key: "lastHeard", label: "Dernier paquet", num: true },
];

// Deux tableaux à colonnes identiques, présentés en ONGLETS, avec en-têtes
// cliquables pour trier. Onglet « Signal vers les gateways » = qui a capté ce
// nœud ; onglet « Nœuds entendus » = ce que ce nœud a capté (miroir).
export default function NodeLinksTables({
  gateways,
  heardNodes,
}: {
  gateways: NodeGatewayLink[];
  heardNodes: NodeHeardLink[];
}) {
  const [tab, setTab] = useState<Tab>("gateways");
  const [sortKey, setSortKey] = useState<SortKey>("snr");
  const [sortDir, setSortDir] = useState<SortDir>(-1);

  const rows = tab === "gateways" ? gatewayRows(gateways) : heardRows(heardNodes);
  const sorted = sortRows(rows, sortKey, sortDir);

  const clickHeader = (key: SortKey): void => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(defaultDir(key));
    }
  };

  const desc =
    tab === "gateways"
      ? "Les passerelles MQTT qui ont capté ce nœud : qualité du lien (SNR), nombre de sauts, distance, paquets et dernière réception."
      : "Les nœuds que ce nœud a reçus (il agit alors en récepteur), en direct ou via relais.";

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 border-b border-black/10 dark:border-white/10"
      >
        <TabButton active={tab === "gateways"} onClick={() => setTab("gateways")}>
          Signal vers les gateways{" "}
          <span className="text-zinc-400">({gateways.length})</span>
        </TabButton>
        <TabButton active={tab === "heard"} onClick={() => setTab("heard")}>
          Nœuds entendus{" "}
          <span className="text-zinc-400">({heardNodes.length})</span>
        </TabButton>
      </div>

      <p className="mt-3 mb-2 text-xs text-zinc-500">{desc}</p>

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {tab === "gateways"
            ? "Aucun gateway ne l'a entendu sur 30 j."
            : "Ce nœud n'a relayé aucun autre nœud sur 30 j."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs text-zinc-500 dark:border-white/10">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    aria-sort={
                      sortKey === c.key
                        ? sortDir === 1
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`px-3 py-2 font-medium ${c.num ? "text-right" : "text-left"}`}
                  >
                    <button
                      onClick={() => clickHeader(c.key)}
                      className={`inline-flex items-center gap-1 hover:text-current ${c.num ? "flex-row-reverse" : ""}`}
                    >
                      {c.label}
                      <span className="inline-block w-2 text-emerald-500">
                        {sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/node/${encodeURIComponent(r.id)}`}
                        className="font-medium hover:underline"
                      >
                        {r.name ?? r.id}
                      </Link>
                      {!r.hasPosition && (
                        <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-xs text-zinc-500">
                          sans position
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600 dark:text-zinc-300">
                    {fmtSnr(r.snr)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${r.hop === 0 ? "text-emerald-600" : "text-zinc-600 dark:text-zinc-300"}`}
                  >
                    {hopLabel(r.hop)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${r.hop === 0 ? "text-emerald-600" : "text-zinc-400"}`}
                  >
                    {fmtDist(r.distanceKm)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {r.packets} pqts
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-zinc-400">
                    {fmtDate(r.lastHeard)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-emerald-500 text-current"
          : "border-transparent text-zinc-500 hover:text-current"
      }`}
    >
      {children}
    </button>
  );
}
