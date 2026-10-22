/* =========================================================
   Kyara Lite V2 — rarity-borders.js
   Donne la couleur de rareté (via --kl-rar) à :
   - chaque carte possédée de la collection
   - la carte que tu donnes dans un échange
   La couleur est lue depuis le box-shadow inline posé par le site,
   ce qui garantit la bonne couleur pour chaque rareté.
   ========================================================= */
(function () {
  "use strict";

  function colorFromShadow(shadow) {
    if (!shadow) return null;
    const match = shadow.match(/rgba?\([^)]*\)/);
    return match ? match[0] : null;
  }

  function applyBorders(root) {
    const scope = root || document;

    // Cartes possédées dans la collection
    scope.querySelectorAll(".wrap.body .grid .cell").forEach((cell) => {
      const owned = cell.querySelector(".have");
      if (!owned) { cell.style.removeProperty("--kl-rar"); return; }

      const img = owned.querySelector("img") || cell.querySelector("img");
      const color = colorFromShadow(img && img.style.boxShadow);
      if (color) cell.style.setProperty("--kl-rar", color);
      else cell.style.removeProperty("--kl-rar");
    });

    // Carte que tu donnes dans un échange
    scope.querySelectorAll("a.kyara-lite-give").forEach((card) => {
      const img = card.querySelector("img");
      if (!img) return;
      const color = colorFromShadow(img.style.boxShadow);
      if (color) card.style.setProperty("--kl-rar", color);
    });
  }

  applyBorders(document);

  const observer = new MutationObserver(() => applyBorders(document));
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });
})();
