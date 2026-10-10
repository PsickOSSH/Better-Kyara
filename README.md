# Better Kyara

Extension de navigateur pour **Chrome** et **Firefox** qui améliore la page **Ma collection** de [Kyara](https://kyara.games/).

Les cartes que tu n'as pas encore obtenues apparaissent normalement comme des cases « ? ». Better Kyara affiche leur nom et un aperçu visuel directement dans ta collection, et permet d'actualiser tes cartes sans perdre tes filtres. Elle ne modifie pas ton compte et ne débloque aucune carte.

> Projet non officiel, sans lien avec Kyara.

## Télécharger

| Navigateur | Installation |
|---|---|
| Firefox | [Disponible sur Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/better-kyara/) |
| Chrome | [Disponible sur le Chrome Web Store](https://chromewebstore.google.com/detail/better-kyara/phdicjjgabfikoocojlgbenllemdplli) |

> Les liens des stores sont temporaires et seront remplacés après validation des publications.

## Fonctionnalités

### Aperçu des cartes manquantes

- Affiche le nom du personnage sur chaque carte manquante
- Affiche un aperçu de la carte, assombri pour la distinguer des cartes possédées
- Ajoute un contour de la couleur de la rareté :
  - Commune : gris
  - Peu commune : vert
  - Rare : bleu
  - Épique : violet
  - Légendaire : jaune
  - Mythique : orange
- Ajoute un badge **NON DÉBLOQUÉE**
- Charge uniquement les cartes visibles à l'écran
- Reste compatible avec les filtres, le tri et les changements d'univers

### Bouton « ↻ Actualiser »

Un bouton **↻ Actualiser** est ajouté sous les boutons « Cartes / Albums ». Il recharge ta collection pour afficher les cartes que tu viens de débloquer, **sans recharger la page et sans réinitialiser tes filtres**.

Les éléments suivants sont conservés :

- la recherche
- la rareté sélectionnée
- l'univers
- le filtre « Cartes » (toutes, possédées, manquantes, doublons, envies)
- le tri
- la vue « Cartes » ou « Albums »
- ta position de défilement

## Fonctionnement

**Aperçu.** Pour chaque case manquante visible, l'extension consulte en arrière-plan la fiche publique associée sur `kyara.games/wiki/{id}`, comme lorsque tu ouvres la case manuellement. Elle récupère le nom et l'aperçu de la carte, puis les affiche dans la grille.

**Actualisation.** Le bouton mémorise tes filtres, effectue une navigation interne du site (vers une autre page puis retour sur la collection) pour forcer le rechargement des données, puis restaure tes filtres. La page du navigateur n'est jamais rechargée.

Les cartes restent non débloquées : Better Kyara ne modifie pas ton inventaire, ton compte, tes ressources, ni les données du jeu.

## Installation manuelle

### Chrome, Edge et Brave

1. Télécharge ou clone ce dépôt.
2. Ouvre `chrome://extensions`.
3. Active le **Mode développeur**.
4. Clique sur **Charger l'extension non empaquetée**.
5. Sélectionne le dossier `better-kyara`.
6. Recharge la page Collection de Kyara.

### Firefox

1. Ouvre `about:debugging#/runtime/this-firefox`.
2. Clique sur **Charger un module complémentaire temporaire**.
3. Sélectionne le fichier `manifest.json`.
4. Recharge la page Collection de Kyara.

## Confidentialité

- Aucune donnée personnelle n'est collectée.
- Aucune donnée n'est envoyée à l'auteur ni à un serveur tiers.
- L'extension effectue uniquement des requêtes vers `https://kyara.games/`.
- Aucune donnée n'est conservée : l'extension n'utilise ni cache ni stockage local.
- L'extension ne s'exécute que sur `https://kyara.games/*`.

## Structure du projet

```text
better-kyara/
├── manifest.json
├── content.js
├── README.md
├── LICENSE
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon64.png
    └── icon128.png
```

## Licence

Distribué sous licence [MIT](LICENSE).
