# Better Kyara

Extension de navigateur (Chrome et Firefox, Manifest V3) qui améliore la page **Ma collection** de [kyara.games](https://kyara.games/).

Les cartes non obtenues apparaissent normalement comme de simples cases « ? ». Better Kyara y ajoute le nom du personnage et un aperçu de la carte, pour que tu saches ce qu'il te manque sans cliquer sur chaque case.

> Projet non officiel, sans lien avec Kyara.

## Fonctionnalités

- Nom du personnage affiché sur chaque carte manquante
- Aperçu de la carte, assombri pour la distinguer des cartes possédées
- Contour et badge de la couleur de la rareté (commune, peu commune, rare, épique, légendaire, mythique)
- Badge « NON DÉBLOQUÉE »
- Chargement à la demande : seules les cartes visibles à l'écran sont chargées
- Compatible avec les filtres, le tri et le changement d'univers

## Fonctionnement

Pour chaque case manquante visible, l'extension charge en arrière-plan la fiche publique de la carte (`/wiki/{id}`), exactement comme si tu cliquais dessus, puis lit le nom et l'image de la carte pour les afficher dans la grille.

Les cartes restent non débloquées : rien n'est modifié sur ton compte.

## Installation

### Chrome / Edge / Brave

1. Télécharge ou clone ce dépôt.
2. Ouvre `chrome://extensions` et active le **mode développeur**.
3. Clique sur **Charger l'extension non empaquetée**.
4. Sélectionne le dossier du projet.
5. Recharge la page Collection de Kyara.

### Firefox

1. Ouvre `about:debugging#/runtime/this-firefox`.
2. Clique sur **Charger un module complémentaire temporaire**.
3. Sélectionne le fichier `manifest.json`.

## Confidentialité

- Aucune donnée personnelle collectée
- Aucune requête vers un serveur tiers : seules des requêtes vers `kyara.games` sont envoyées
- Un cache local (nom et image des cartes) est stocké dans le `localStorage` de ton navigateur
- L'extension ne s'exécute que sur `https://kyara.games/*`

## Structure
