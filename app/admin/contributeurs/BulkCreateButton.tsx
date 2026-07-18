"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildBulkContributorUsernames,
  validateBulkContributorRequest,
} from "@/lib/bulk-contributors";

const primaryBtnCls =
  "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40";
const secondaryBtnCls =
  "rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20";
const inputCls =
  "mt-1 w-full rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-black/40 dark:border-white/20";

interface CsvResult {
  blob: Blob;
  filename: string;
  count: number;
}

function downloadCsv(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function responseFilename(response: Response): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  return disposition.match(/filename="([^"]+)"/)?.[1] ?? "comptes-mqtt.csv";
}

export default function BulkCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("P");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState("150");
  const [digits, setDigits] = useState("3");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvResult | null>(null);

  const preview = useMemo(() => {
    try {
      const request = validateBulkContributorRequest({
        prefix,
        start: start === "" ? null : Number(start),
        count: count === "" ? null : Number(count),
        digits: digits === "" ? null : Number(digits),
      });
      const usernames = buildBulkContributorUsernames(request);
      return { first: usernames[0], last: usernames.at(-1) };
    } catch {
      return null;
    }
  }, [prefix, start, count, digits]);

  function closeModal() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setResult(null);
  }

  async function createBatch() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/contributors/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          start: Number(start),
          count: Number(count),
          digits: Number(digits),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Création du lot impossible.");
      }

      const csvResult = {
        blob: await response.blob(),
        filename: responseFilename(response),
        count: Number(count),
      };
      setResult(csvResult);
      downloadCsv(csvResult.blob, csvResult.filename);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryBtnCls}>
        Créer en lot
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/70"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-create-title"
            className="relative w-full max-w-lg rounded-lg border border-white/15 bg-background p-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 id="bulk-create-title" className="text-lg font-semibold">
                Créer des comptes MQTT en lot
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                aria-label="Fermer"
                className="rounded px-2 py-1 text-xl leading-none text-muted hover:text-foreground"
              >
                ×
              </button>
            </div>

            {result ? (
              <div className="grid gap-4">
                <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                  {result.count} comptes créés. Le CSV a été téléchargé.
                </p>
                <p className="text-sm text-zinc-400">
                  Les mots de passe ne sont pas conservés en clair. Télécharge à
                  nouveau le fichier maintenant si nécessaire : après fermeture,
                  ils ne pourront plus être récupérés.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCsv(result.blob, result.filename)}
                    className={secondaryBtnCls}
                  >
                    Télécharger à nouveau
                  </button>
                  <button type="button" onClick={closeModal} className={primaryBtnCls}>
                    Terminer
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="text-xs text-zinc-500">
                    Préfixe
                    <input
                      value={prefix}
                      maxLength={28}
                      onChange={(event) => setPrefix(event.currentTarget.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Premier numéro
                    <input
                      type="number"
                      min={0}
                      max={99_999_999}
                      value={start}
                      onChange={(event) => setStart(event.currentTarget.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Quantité
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={count}
                      onChange={(event) => setCount(event.currentTarget.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Chiffres
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={digits}
                      onChange={(event) => setDigits(event.currentTarget.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
                  {preview ? (
                    <>
                      Aperçu : <span className="font-mono">{preview.first}</span>
                      {preview.first !== preview.last && (
                        <>
                          {" "}→ <span className="font-mono">{preview.last}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-red-700 dark:text-red-400">
                      Paramètres invalides.
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-400">
                  Tous les comptes seront actifs avec le rôle USER. Une collision
                  annule entièrement le lot. Le CSV contient les mots de passe en
                  clair et doit être conservé en lieu sûr.
                </p>

                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeModal} className={secondaryBtnCls}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={pending || !preview}
                    onClick={() => void createBatch()}
                    className={primaryBtnCls}
                  >
                    {pending ? "Création…" : `Créer ${count} comptes`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
