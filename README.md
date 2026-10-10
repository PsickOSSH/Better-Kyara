# Better Kyara

Extension de navigateur pour **Chrome** et **Firefox** qui améliore la page **Ma collection** de [Kyara](https://kyara.games/).

Les cartes que tu n'as pas encore obtenues apparaissent normalement comme des cases « ? ». Better Kyara affiche leur nom et un aperçu visuel directement dans ta collection, permet d'actualiser tes cartes sans perdre tes filtres, et te ramène à la collection avec tes filtres depuis la page d'une carte. Elle ne modifie pas ton compte et ne débloque aucune carte.

> Projet non officiel, sans lien avec Kyara.

## Télécharger

| Navigateur | Installation |
|---|---|
| Firefox | [Disponible sur Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/better-kyara/) |
| Chrome | [Disponible sur le Chrome Web Store](https://chromewebstore.google.com/detail/better-kyara/placeholder) |

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
  - Mythique : dégradé multicolore, identique à celui des cartes mythiques possédées
- Ajoute un badge **NON DÉBLOQUÉE**
- Charge uniquement les cartes visibles à l'écran
- Reste compatible avec les filtres, le tri et les changements d'univers

### Bouton « ↻ Actualiser »

Un bouton **↻ Actualiser** est ajouté à droite des filtres de rareté. Il recharge ta collection pour afficher les cartes que tu viens de débloquer, **sans recharger la page et sans réinitialiser tes filtres**.

Les éléments suivants sont conservés :

- la recherche
- la rareté sélectionnée
- l'univers
- le filtre « Cartes » (toutes, possédées, manquantes, doublons, envies)
- le tri
- la vue « Cartes » ou « Albums »
- ta position de défilement

### Bouton « ← Retour à la collection »

Quand tu ouvres une carte depuis ta collection, un bouton **← Retour à la collection** apparaît en haut de sa page. Il te ramène à la collection **en retrouvant exactement tes filtres**, ce que la flèche de retour du navigateur ne permet pas : celle-ci recrée la page et réinitialise les filtres.

Si tu arrives sur la page d'une carte par un autre chemin (Marché, lien partagé, recherche), le bouton n'apparaît pas.

## Fonctionnement

**Aperçu.** Pour chaque case manquante visible, l'extension consulte en arrière-plan la fiche publique associée sur `kyara.games/wiki/{id}`, comme lorsque tu ouvres la case manuellement. Elle récupère le nom et l'aperçu de la carte, puis les affiche dans la grille.

**Actualisation.** Le bouton mémorise tes filtres, effectue une navigation interne du site (vers une autre page puis retour sur la collection) pour forcer le rechargement des données, puis restaure tes filtres. La page du navigateur n'est jamais rechargée.

**Retour à la collection.** Quand tu cliques sur une carte depuis la collection, l'extension mémorise l'état de tes filtres. Le bouton de retour revient à la collection par une navigation interne, puis les restaure. Si ce retour échoue, la page se recharge et les filtres sont restaurés au chargement.

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
- Pour restaurer tes filtres, leur état est gardé temporairement dans le stockage de session de ton onglet (`sessionStorage`). Il disparaît à la fermeture de l'onglet ou après 30 minutes, et ne quitte jamais ton navigateur.
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
