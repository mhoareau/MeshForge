# Analytics & toile mesh (Phase 4)

Enrichissement au-delà de la carte temps réel : **toile de liaisons depuis les gateways**
(diagnostic de portée/résilience), statistiques réseau, historique par node. S'appuie sur les
données **déjà captées** en Phase 2/3 (`packets` + `nodes`) — aucun changement worker obligatoire.

> **Heatmap SNR : abandonnée.** Peu lisible (blobs), et vide tant que peu de nodes opt-in. Remplacée
> par la toile mesh, plus visuelle ET plus utile (vrai instrument de diagnostic).

## Périmètre Phase 4

| Bloc | Contenu |
| ---- | ------- |
| **Toile mesh gateways** | Le différenciateur. Survol d'un gateway → sa toile. Voir ci-dessous. |
| **Page Statistiques** | ✅ implémentée. KPI réseau + répartitions en barres + filtres. |
| **Page détail node** | Courbes 30j (SNR, batterie, paquets/jour) pour un node. |
| **Filtres** | Temporels (fenêtre) + carte (hop, rôle, recherche node). |

**Déplacé en Phase 5** : vues listes nodes (actifs / batterie faible / mal configurés), page debug
« Trames » (derrière auth admin), tiers d'opt-in + snap mobiles ~1,5 km (cf. privacy).

**Hors périmètre** : messagerie (branche dédiée), envoyer une trame (uplink only), décodeurs.

## Toile mesh depuis les gateways — le cœur

Visualisation de **« qui entend qui »** centrée sur les **gateways** (les relais MQTT = nos capteurs).
Trois états de lecture :

1. **Survol d'un gateway → sa toile locale.** Traits vers tous les nodes que CE gateway entend. Là
   où la toile s'arrête, le signal meurt faute de relais. Animation : les liens se tracent
   progressivement depuis le gateway (le tracé = la propagation, esthétique *et* sens).
2. **Vue d'ensemble → nœuds-ponts en surbrillance.** Un node entendu par **≥2 gateways** est un
   point critique de résilience (s'il tombe, deux zones se déconnectent).
3. **Zones aveugles.** Deux toiles de gateways géographiquement proches sans aucun nœud commun →
   pointillé « relais manquant ici ».

### La distinction qui rend l'outil crédible

- **Lien plein, épais → `hop_count = 0`** : le gateway entend ce node **en direct**. C'est la **vraie
  portée radio du terrain** (relief inclus), la seule info exploitable pour décider où poser un relais.
- **Lien fin, pointillé → `hop_count > 0`** : connu **via le mesh** (joignable, mais pas à portée directe).

Le terrain donne la réponse gratuitement à travers la donnée — aucune modélisation de propagation.

### Données : tout est déjà dans `packets` (pas de table dédiée)

Le worker stocke déjà `gateway_id` (= `raw.sender`, l'ID du relais MQTT), `node_id`, `snr`, `rssi`,
`hop_count`. Les « observations » = un agrégat :

```sql
SELECT gateway_id, node_id,
       MIN(hop_count) AS best_hop,   -- 0 = lien radio direct réel
       AVG(snr)       AS snr,
       MAX(received_at) AS last_seen
FROM packets
WHERE gateway_id IS NOT NULL AND node_id IS NOT NULL
GROUP BY gateway_id, node_id
```

- **Toile d'un gateway** = `WHERE gateway_id = X`.
- **Nœud-pont** = `node_id` présent pour ≥ 2 `gateway_id`.
- **Zone aveugle** = deux gateways sans `node_id` commun (et proches géographiquement).

Matérialiser une table/vue `observations` reste une **optim plus tard** si le GROUP BY pèse — pas maintenant.

⚠️ Limite honnête : on ne place sur la carte que les gateways/nodes ayant une **position connue**
(paquet position reçu). Pas de position → pas de point. Et c'est du **node → gateway** (réception),
pas du nœud-à-nœud (faute de paquets `neighborinfo`, dont on capte zéro).

## API

| Route | Réponse |
| ----- | ------- |
| `GET /api/observations?since=...` | Arêtes gateway × node entendu (`best_hop`, SNR), privacy-aware |
| `GET /api/nodes/[id]/history?since=...` | Séries 30j d'un node (SNR, batterie, paquets/jour) |

**Page Statistiques** : ✅ implémentée, pas de route — la page `/stats` (Server Component) appelle
`getNetworkStats()` directement. `/api/stats` reste l'endpoint de la barre carte (`getStats`).

## Stats = tout le réseau capté (≠ affichage carte)

Les **agrégats anonymes** (compteurs, répartitions) portent sur **tous** les nodes/paquets captés —
un agrégat n'expose aucun individu. `getNetworkStats` **n'applique PAS** de filtre privacy (divergence
**volontaire**, ne pas réuniformiser). Répartitions en **barres horizontales triées** (Recharts), pas
de camemberts ; `StatsCharts.tsx` replie la traîne au-delà du top 10 en « autres ».

## Privacy (toile + carte)

Politique **public par défaut** mais consentement respecté à la source. Détails : [privacy-rgpd.md](privacy-rgpd.md).
Pour la toile : on respecte `precision_bits` (jamais sur-précis), `is_mobile` → snap ~1,5 km constant,
jamais `Fr_EMCOM`/canaux privés, opt-out + suppression. La toile reste honnête car les liens 0-hop ne
dépendent pas d'une position fine.

## Vérification manuelle

```
docker compose up -d        # TimescaleDB + Mosquitto
yarn worker:dev             # ingestion MQTT
yarn dev                    # http://localhost:3000
```

Survol d'un gateway → sa toile se déploie (0-hop plein, mesh pointillé) ; nœuds-ponts surlignés ;
page stats avec compteurs sur tout le réseau ; détail node sur 30j.
