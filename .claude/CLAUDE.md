# Instructions projet — MeshForge

> Dashboard open source de monitoring pour réseaux Meshtastic — carte de couverture temps réel + historique time-series pour le réseau LoRa de La Réunion.

> **Note** : ce projet hérite des règles globales définies dans `~/.claude/CLAUDE.md` (walkthrough pré-commit, exécution des commandes, préférences générales). Ce fichier contient uniquement les règles spécifiques au projet.

## Environnement du projet

- **Serveur de dev** : `yarn dev` — lancé par l'utilisateur uniquement, ne jamais le démarrer
- **Gestionnaire de paquets** : `yarn` (cohérent avec `yarn.lock`, pas de mélange npm/pnpm)
- **Infra locale** : `docker compose up -d` (TimescaleDB + Mosquitto) — lancé par l'utilisateur uniquement

## Règles projet

### Workflow Git — OBLIGATOIRE

- **Jamais de commit direct sur `main`** — la branche est protégée
- **Toujours créer une nouvelle branche** avant tout changement :
  - `feat/...` pour une nouvelle fonctionnalité
  - `fix/...` pour un bugfix
  - `chore/...` pour maintenance, CI, deps, docs
  - `refactor/...` pour refactoring sans changement de comportement
- **Toujours passer par une Pull Request** (`gh pr create --fill --base main`) pour merger dans `main`
- **La CI doit être verte** avant merge
- Après merge, supprimer la branche locale et distante

### Avant CHAQUE commit — OBLIGATOIRE

1. Vérifier si les changements touchent : schéma DB, pipeline MQTT, routes API, ou features frontend
2. Si oui → mettre à jour `architecture.md` ET `.claude/CLAUDE.md` AVANT de commit. Mettre à jour le fichier `docs/` concerné si applicable.
3. Si bugfix mineur ou refactoring interne → pas de mise à jour doc

- toujours faire des réponses concises avec les explications nécessaire pour que ce soit compréhensible , mais on essaie dêtre le plus concis possible.

- toujours lancer des tests Red Green Refactor avant décrire une fonction ( ne s'applique aps pour les composants frontend mais pour tout ce qui est logique - TDD)

---

## Contexte

Dashboard Meshtastic dédié au réseau de La Réunion (974). Les nodes Meshtastic (Heltec V4) envoient leur télémétrie via MQTT vers un broker privé (Mosquitto). Un worker Node.js ingère ces données dans TimescaleDB pour construire un historique time-series. Le frontend Next.js expose une carte Maplibre GL avec une toile de liaisons depuis les gateways, des courbes historiques, et des alertes.

**Différenciateur vs Gaulix** : **toile de liaisons depuis les gateways** (diagnostic de portée — lien 0-hop = portée radio réelle — et de résilience, pas juste des points), historique 30j sur tout, alertes offline/batterie, UX moderne, privacy by design (on respecte les réglages de partage du node + droit de retrait).

---

## Contraintes

- **TypeScript strict** partout, y compris le worker
- **Uplink only** : le broker ne réinjecte RIEN dans le mesh (downlink OFF)
- **Server Components** par défaut — Client Components uniquement pour la carte et l'interactivité
- Requêtes SQL centralisées dans `lib/db.ts`, jamais inline dans les composants
- Le worker MQTT est un process **séparé** de Next.js — ne jamais le déplacer dans une API route
- Paquets malformés : `try/catch` silencieux (le mesh envoie du bruit)
- Variables d'environnement via `.env.local` (host DB, credentials, broker URL)
- Self-hostable : tout doit tourner via `docker compose up`
- Zéro dépendance cloud propriétaire
- Un seul langage applicatif (TypeScript) côté worker + frontend

### Privacy — OBLIGATOIRE

Politique : **public par défaut** (norme Meshtastic — un node qui uplinke est diffusé largement,
y compris relayé par un gateway voisin), MAIS consentement **respecté à la source** + droit de
retrait. Justification & détails RGPD : [docs/privacy-rgpd.md](docs/privacy-rgpd.md).

- **Respecter `precision_bits`** du node : ne JAMAIS afficher une position plus précise que ce que
  le node diffuse (il règle sa précision sur SON appareil → consentement honoré à la source).
- **Respecter `ok_to_mqtt = false`** (si présent dans le paquet) → node exclu de l'affichage.
- `is_mobile = true` → position **snappée sur une cellule ~1,5 km CONSTANTE** (jamais l'exacte ;
  flou **constant**, surtout pas re-randomisé à chaque trame — un flou aléatoire se moyenne sur N
  trames et **révèle** le vrai point).
- **`Fr_EMCOM`** (urgence) + canaux privés/chiffrés → contenu ET positions **jamais** exposés.
- **Opt-out + droit de suppression en un clic** (RGPD) ; NodeID anonymisable.

### Réseau Meshtastic (compatibilité Réunion/Gaulix)

- Fréquence : **EU_868 MHz**, profil modem : **LONG_MODERATE** (CR 4/8)
- Hop limit : **3 max** (jamais 7 — inonde le mesh)
- `rssi`/`snr` reçu via gateway = qualité du lien **gateway ↔ node entendu** (dernier hop), pas de l'émetteur original — c'est exactement ce que mesure la toile (lien 0-hop = portée radio directe réelle)

---

## Ordre d'implémentation — OBLIGATOIRE

L'ordre est strict : **infra → pipeline données → frontend**. Ne pas toucher à la carte avant que les données arrivent en DB.

1. ✅ **Phase 1 — Infra** : `docker-compose.yml` (Mosquitto + TimescaleDB), `mosquitto/config/mosquitto.conf`, `db/init.sql` (hypertable `packets`, tables `nodes` + `contributors`)
2. ✅ **Phase 2 — Pipeline** : worker MQTT (`src/worker/mqtt-subscriber.ts`), subscribe `msh/+/+/json/#`, parse JSON, INSERT `packets`, upsert `nodes`
3. ✅ **Phase 3 — Frontend carte** : API `/api/nodes` + `/api/stats` + SSE `/api/stream`, `MapView` Maplibre GL (style OpenFreeMap, → Protomaps self-host avant prod), markers nodes, temps réel SSE + Postgres `LISTEN/NOTIFY`. Barrière privacy en SQL ET sur le flux temps réel (`lib/privacy.ts`). Détails : [docs/frontend-carte.md](docs/frontend-carte.md)
4. **Phase 4 — Toile mesh & analytics** : **toile de liaisons depuis les gateways** (différenciateur — survol d'un gateway = sa toile locale ; **lien 0-hop plein** = portée radio directe réelle vs **mesh pointillé** = via relais ; **nœuds-ponts** entendus par ≥2 gateways en surbrillance ; **zones aveugles** ; animation de propagation au survol). Données dérivées de `packets` (gateway × node entendu, `best_hop`, SNR — **pas de table dédiée**, un GROUP BY). Page **Statistiques** ✅, page **détail node** (courbes 30j), filtres. **Heatmap SNR abandonnée** (peu lisible + vide tant que peu de nodes). Détails : [docs/analytics.md](docs/analytics.md)
5. **Phase 5 — Alertes & prod** : détection offline, alertes batterie, **vues listes nodes** (actifs / batterie faible / mal configurés), **page debug « Trames »** (flux brut, derrière l'auth admin), auth MQTT (`mosquitto-go-auth`), inscription contributors, opt-in carte publique, RGPD

---

## À implémenter plus tard

### Messagerie — onglet messages par canal (façon Gaulix)

> Feature **hors plan 5 phases**, à faire en branche dédiée APRÈS la Phase 2. Ne pas la mélanger au commit du pipeline télémétrie.

**Pourquoi** : différenciateur UX vs Gaulix — un onglet listant les canaux publics et leurs derniers messages (ex : 7 derniers jours). Donne vie au dashboard au-delà de la télémétrie.

**État actuel** : les paquets `type: "text"` sur un canal public sont **déjà captés** dans `packets.raw.payload.text` (le worker ne filtre que par canal, pas par type). La donnée arrive ; il manque l'extraction dédiée + l'UI.

**Comment l'implémenter** :

1. **Schéma** : table `messages` **séparée** de `packets` (≠ rétention). Colonnes : `received_at`, `node_id`, `channel`, `text`, `raw`. Hypertable TimescaleDB sur `received_at`.
2. **Rétention courte et bornée** : `add_retention_policy('messages', INTERVAL '7 days')` — drop auto. C'est LE point clé : 1 table = 1 politique de rétention. La télémétrie garde son historique long (30j+), les messages s'effacent vite. Mélanger dans `packets` rendrait ça impossible.
3. **Worker** : sur `type === "text"`, INSERT aussi dans `messages` (en plus de `packets`).
4. **API** : `GET /api/messages?channel=...` (derniers N jours).
5. **Frontend** : onglet "Messages" listant les canaux + fil de discussion.

**Privacy — OBLIGATOIRE pour cette feature** :
- **Exclure `Fr_EMCOM`** (urgence) du stockage ET de l'affichage messages : peut contenir des infos perso/médicales/localisation en détresse.
- Message = donnée personnelle (RGPD) : rétention courte (7j), mention d'info, droit de suppression.
- Ne jamais exposer les canaux privés (déjà filtrés en amont par l'allowlist `MQTT_PUBLIC_CHANNELS`).

---

## Références techniques

Vue d'ensemble stack + structure fichiers : [architecture.md](architecture.md)

Détails par sujet :

| Sujet                                                      | Fichier                                                |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Schéma DB (TimescaleDB, hypertable, index, requêtes types) | [docs/schema-db.md](docs/schema-db.md)                 |
| Pipeline MQTT (worker, format données, uplink only)        | [docs/pipeline-mqtt.md](docs/pipeline-mqtt.md)         |
| Frontend carte (Maplibre GL, heatmap, temps réel)          | [docs/frontend-carte.md](docs/frontend-carte.md)       |
| Analytiques (Recharts, historiques, stats)                 | [docs/analytics.md](docs/analytics.md)                 |
| Alertes & production (auth MQTT, inscription)              | [docs/alertes.md](docs/alertes.md)                     |
| Spécifications réseau Meshtastic                           | [docs/reseau-meshtastic.md](docs/reseau-meshtastic.md) |
| Privacy & RGPD                                             | [docs/privacy-rgpd.md](docs/privacy-rgpd.md)           |
| Déploiement Docker (self-hosting, env vars)                | [docs/deploiement.md](docs/deploiement.md)             |
