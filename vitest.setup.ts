// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Robin Lebon — La Forge Numérique
//
// Chargé pour TOUS les tests, node comme jsdom. Il doit donc rester inoffensif
// sans DOM : les matchers jest-dom et le nettoyage de Testing Library exigent un
// document, on ne les branche que lorsqu'il en existe un. Sans cette garde, les
// centaines de tests de logique pure qui tournent en environnement node
// échoueraient au chargement du setup.
//
// `export {}` : le fichier n'a que des imports DYNAMIQUES, donc TypeScript ne le
// tiendrait pas pour un module et refuserait le `await` de premier niveau
// (TS1375). Cet export vide le qualifie sans rien exporter.
export {};

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  const { afterEach } = await import("vitest");

  // Testing Library ne nettoie automatiquement que si `globals: true`. On garde
  // les globals désactivés (les tests existants importent describe/it/expect
  // explicitement) et on démonte donc à la main entre deux tests, sans quoi les
  // rendus s'accumulent dans le même document et les requêtes deviennent
  // ambiguës.
  afterEach(() => cleanup());
}
