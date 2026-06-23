"use client";

import { useState } from "react";

interface Creds {
  username: string;
  password: string;
}

interface MqttOnboarding {
  mobileBroker: string;
  webBroker: string;
  rootTopic: string;
  encryptionEnabled: boolean;
  jsonOutputEnabled: boolean;
  tlsEnabled: boolean;
  mapReportEnabled: boolean;
}

const inputCls =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white/[0.02] p-3 dark:border-white/15">
      <div className="mb-1 text-xs text-zinc-500">{label}</div>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 select-all break-all text-sm font-normal [font-family:Arial,sans-serif]">
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-black/15 px-2 py-1 text-xs dark:border-white/20"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

function InlineCopy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border border-black/15 px-1.5 py-0.5 text-xs text-zinc-800 dark:border-white/20 dark:text-zinc-100"
    >
      {copied ? "copié" : value}
    </button>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-black">
          {n}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export default function RegisterForm({
  onboarding,
}: {
  onboarding: MqttOnboarding;
}) {
  const [relayName, setRelayName] = useState("");
  const [email, setEmail] = useState("");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, nodeName: relayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      setCreds(data as Creds);
    } catch {
      setError("Réseau indisponible.");
    } finally {
      setLoading(false);
    }
  }

  if (creds) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <strong>À copier maintenant.</strong> Le mot de passe MQTT ne sera
          plus jamais affiché après avoir quitté cette page.
        </div>

        <Step n={1} title="Identifiants MQTT">
          <CopyValue label="Nom d’utilisateur" value={creds.username} />
          <CopyValue label="Mot de passe" value={creds.password} />
        </Step>

        <Step n={2} title="Connexion au broker MeshForge">
          <p>
            Dans l’app Meshtastic, va dans <strong>Settings</strong>, puis{" "}
            <strong>Réglages du module</strong>, et active le module MQTT.
          </p>
          <p>Renseigne l’adresse du broker MQTT dans l’app Meshtastic.</p>
          <div className="grid gap-2">
            <CopyValue label="Adresse" value={onboarding.mobileBroker} />
            <CopyValue label="Sujet principal" value={onboarding.rootTopic} />
          </div>
          <p className="text-xs text-zinc-500">
            Si l’interface refuse l’adresse DNS ou signale une valeur trop
            longue, utilise l’adresse IP{" "}
            <InlineCopy value={onboarding.webBroker} />.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              {onboarding.encryptionEnabled ? "Active" : "Désactive"}{" "}
              <strong>Chiffrement activé</strong>.
            </li>
            <li>
              {onboarding.jsonOutputEnabled ? "Active" : "Désactive"}{" "}
              <strong>Sortie JSON activée</strong>.
            </li>
            <li>
              {onboarding.tlsEnabled ? "Active" : "N’active pas"}{" "}
              <strong>TLS</strong>.
            </li>
          </ul>
        </Step>

        <Step n={3} title="Rapport cartographique">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              {onboarding.mapReportEnabled ? "Active" : "Désactive"}{" "}
              <strong>Rapport cartographique</strong>.
            </li>
            <li>Accepte les conditions affichées par l’application.</li>
            <li>Choisis l’intervalle de rapport selon ton usage.</li>
            <li>Choisis la précision de localisation que tu veux partager.</li>
          </ul>
        </Step>

        <p className="text-sm text-zinc-500">
          En cas de perte du mot de passe, il faudra refaire une inscription.
          L’ancien compte pourra être révoqué par un admin.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        value={relayName}
        onChange={(e) => setRelayName(e.target.value)}
        placeholder="Nom de ton relais (ex : Relais Piton)"
        required
        className={inputCls}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (contact, jamais affiché)"
        required
        className={inputCls}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Création…" : "Obtenir mes identifiants MQTT"}
      </button>
    </form>
  );
}
