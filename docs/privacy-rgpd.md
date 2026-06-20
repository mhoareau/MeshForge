# Privacy & RGPD — politique d'affichage

> Décision de cap (juin 2026). Remplace l'ancienne règle « opt-in strict ». Source de vérité pour
> tout affichage de position/identité. Réunion = France = **RGPD applicable**.

## La décision : public par défaut, consentement respecté à la source

On aligne MeshForge sur la **norme de l'écosystème Meshtastic** (carte officielle, MeshMap, Gaulix) :
un node qui **uplinke** vers un broker MQTT public est diffusé largement — y compris quand il est
**relayé par le gateway d'un voisin** sans l'avoir lui-même activé. On **n'exige donc pas** d'opt-in
explicite par node pour apparaître.

**MAIS** — et c'est ce qui nous distingue de Gaulix qui balance tout brut — on respecte le
**consentement à la source** et on offre un **droit de retrait**. On ne montre jamais plus que ce que
la personne a **choisi** de diffuser.

### Pourquoi ce pivot

- L'opt-in strict rendait toutes les visus carte (toile, heatmap) **vides** tant qu'aucun contributeur
  n'avait opté → outil inutilisable au lancement.
- La donnée *existe* déjà (les nodes diffusent leur position sur un MQTT public de leur plein gré, ou
  via un gateway qui les relaie) — c'est la norme du milieu.
- On garde une **vraie** posture privacy, mais **pragmatique** : respecter les réglages + retrait,
  plutôt qu'exclure tout le monde.

## Les règles (OBLIGATOIRE)

1. **Respecter `precision_bits`** (réglage natif Meshtastic, présent dans le payload position).
   Le propriétaire choisit la précision qu'il partage **sur son appareil**. On n'affiche **jamais**
   plus précis. → consentement honoré à la source, même pour un paquet relayé.
2. **Respecter `ok_to_mqtt = false`** si le flag est présent dans le paquet → node **exclu** de
   l'affichage (à vérifier dans nos `raw`).
3. **Nodes mobiles** (`is_mobile = true`) → position **snappée sur une cellule ~1,5 km constante**.
   - ⚠️ **Flou CONSTANT, jamais re-randomisé.** Un offset aléatoire tiré à chaque trame se **moyenne**
     sur N trames (moyenne d'un bruit → 0) et **révèle** la vraie position. Plus le node émet, pire
     c'est. Le snap-to-grid (même cellule à chaque fois) est, lui, **impossible à moyenner**.
4. **`Fr_EMCOM`** (urgence) + canaux privés/chiffrés → contenu ET positions **jamais** exposés
   (peut contenir des infos médicales/détresse).
5. **Opt-out + droit de suppression en un clic** (RGPD, art. 17). NodeID anonymisable.

## Le différenciateur, reframé

| | Gaulix | MeshForge |
| --- | --- | --- |
| Positions | tout brut, précision max | respecte `precision_bits`, snap mobiles |
| Retrait | — | opt-out + suppression 1 clic |
| Canaux sensibles | exposés | `Fr_EMCOM`/privés exclus |
| Diagnostic | points | toile 0-hop (portée réelle) |

« Privacy by design » = on respecte les réglages du node + droit de retrait, pas « on cache tout ».

## Caveats honnêtes

- **Le sous-cas vraiment sensible** : un node relayé à son insu par un gateway voisin. Respecter
  `precision_bits`/`ok_to_mqtt` couvre son **choix appareil** ; le droit de retrait couvre le reste.
- Ceci **n'est pas un avis juridique**. « Tout le monde consent implicitement » n'est pas une base
  légale RGPD solide ; notre base = consentement à la source (réglages diffusés) + intérêt légitime
  (cartographie d'un réseau communautaire) + retrait. À faire valider si déploiement large.

## Implications d'implémentation (à faire)

- `getPublicNodes` / requêtes carte : passer de `WHERE share_on_map = TRUE` à **public par défaut**,
  en appliquant : exclusion `ok_to_mqtt = false`, snap si `is_mobile`, exclusion canaux sensibles.
- Capturer/exposer `precision_bits` et `ok_to_mqtt` (vérifier présence dans `raw`, sinon adapter le parser).
- Fonction de **snap géographique** (cellule ~1,5 km déterministe) — logique pure, **testée** (TDD).
- Mécanisme d'opt-out + suppression (Phase 5).
- `share_on_map` : sémantique à revoir (devient un opt-**out** explicite plutôt qu'opt-in).
