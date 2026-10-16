(() => {
  "use strict";
  if (window.__betterKyara) return;
  window.__betterKyara = true;

  const css = document.createElement("style");
  css.textContent = `
    a.slot:has(.miss){
      border:2px solid var(--kyara-rarity)!important
    }

    a.slot:has(.miss) .miss{
      border:0!important
    }

    /* Contour mythique : même dégradé que .r-M du site (version "calm", sans animation) */
    a.slot[data-bk-rarity="mythique"]:has(.miss){
      position:relative!important;
      border-color:transparent!important;
      box-shadow:0 6px 14px #00000073!important
    }

    a.slot[data-bk-rarity="mythique"]:has(.miss)::before{
      content:"";
      position:absolute;
      inset:-4px;
      padding:4px;
      border-radius:inherit;
      pointer-events:none;
      background:conic-gradient(from 0deg,#ff4d2e,#f5c518,#3fbf7f,#4dd6ff,#b072ff,#ff4d9e,#ff4d2e);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
      -webkit-mask-composite:xor;
      mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
      mask-composite:exclude
    }

    .kyara-peek-img{
      display:block!important;
      position:absolute!important;
      z-index:1!important;
      left:50%!important;
      top:50%!important;
      width:100%!important;
      height:100%!important;
      transform:translate(-50%,-50%)!important;
      object-fit:cover!important;
      object-position:center center!important;
      opacity:.45!important;
      filter:grayscale(.75) brightness(.65)!important;
      pointer-events:none!important
    }

    .kyara-peek-name{
      position:absolute!important;
      z-index:3!important;
      left:8px!important;
      right:8px!important;
      top:02%!important;
      color:#fff!important;
      font:700 13px/1.1 system-ui,sans-serif!important;
      text-align:center!important;
      text-shadow:0 2px 4px #000,0 0 8px #000,0 0 12px #000!important;
      pointer-events:none!important
    }

    .kyara-peek-badge{
      position:absolute!important;
      z-index:4!important;
      left:50%!important;
      bottom:5px!important;
      transform:translateX(-50%)!important;
      padding:3px 7px!important;
      border-radius:999px!important;
      background:var(--kyara-rarity)!important;
      color:#111!important;
      font:700 9px/1 system-ui,sans-serif!important;
      white-space:nowrap!important;
      pointer-events:none!important
    }
	
	/* Badge mythique : même dégradé que le contour */
	a.slot[data-bk-rarity="mythique"] .kyara-peek-badge{
	background:linear-gradient(90deg,#ff4d2e,#f5c518,#3fbf7f,#4dd6ff,#b072ff)!important
	}

    /* Bouton juste après Mythique, dans les filtres de rareté */
    .chips > #bk-refresh{
      margin-left:326px!important;
      flex:0 0 auto!important;
      align-self:center!important;
      white-space:nowrap!important;
      border-radius:999px!important;

      /* Désactive le déplacement au survol/clic */
      transform:none!important;
      transition:
        color .0s ease,
        border-color .0s ease,
        background .0s ease!important
    }

    .chips > #bk-refresh:hover,
    .chips > #bk-refresh:active,
    .chips > #bk-refresh:focus{
      transform:none!important
    }

    .chips > #bk-refresh:disabled{
      opacity:.55!important;
      cursor:wait!important
    }
	
	/* Version mobile : bouton dans .row1, après Cartes / Albums */
	.row1 > #bk-refresh{
	margin:0 0 0 8px!important;
	flex:0 0 auto!important;
	align-self:center!important;
	white-space:nowrap!important;
	border-radius:999px!important;
	transform:none!important;
	transition:none!important
	}

	.row1 > #bk-refresh:hover,
	.row1 > #bk-refresh:active,
	.row1 > #bk-refresh:focus{
	transform:none!important
	}

	.row1 > #bk-refresh:disabled{
	opacity:.55!important;
	cursor:wait!important
	}

    /* Bouton « Retour à la collection » sur la page d'une carte */
    #bk-back{
      display:inline-flex!important;
      margin:0 0 14px!important;
      white-space:nowrap!important;
      transform:none!important;
      transition:none!important
    }

    #bk-back:hover,
    #bk-back:active,
    #bk-back:focus{
      transform:none!important
    }

    #bk-back.bk-floating{
      position:fixed!important;
      top:84px!important;
      left:16px!important;
      z-index:60!important;
      margin:0!important;
      background:rgba(14,13,18,.92)!important
    }

    #bk-overlay{
      position:fixed;
      inset:0;
      z-index:99999;
      display:grid;
      place-items:center;
      background:rgba(14,13,18,.92);
      color:#fff;
      font:600 15px system-ui,sans-serif
    }
  `;

  document.documentElement.appendChild(css);

  const jobs = [];
  let active = 0;

  function rarityColor(a) {
    const r = (a.querySelector(".r")?.textContent || "")
      .trim()
      .toLowerCase();

    return r === "mythique" ? "#ff4d2e" :
      r === "légendaire" ? "#f5c518" :
      r === "épique" ? "#b072ff" :
      r === "rare" ? "#4d9bff" :
      r === "peu commune" ? "#3fbf7f" :
      "#5a5662";
  }

  const clean = s => s
    .replace(/\s*[—-]\s*carte\s+.*$/i, "")
    .replace(/\s*·\s*Kyara.*$/i, "")
    .trim();

  async function read(url) {
    const r = await fetch(url, {
      credentials: "include",
      cache: "no-store"
    });

    const doc = new DOMParser().parseFromString(
      await r.text(),
      "text/html"
    );

    const id = new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .pop();

    const x = doc.querySelector(
      '.tcg .art img[src*="/cards/"],.art img[src*="/cards/"]'
    );

    let image = x?.getAttribute("src") || `/cards/lg/${id}.webp`;

    image = new URL(image, location.origin).href.replace(
      /\.(png|jpe?g)(?=($|[?#]))/i,
      ".webp"
    );

    const card = doc.querySelector(".tcg-name")?.textContent.trim() || "";
    const og = doc.querySelector('meta[property="og:title"]')?.content || "";
    const title = doc.querySelector("title")?.textContent || "";

    return {
      name: clean(card || og || title),
      image
    };
  }

  function paint(a, d) {
    const box = a.querySelector(".miss");

    if (!box || box.dataset.bk || !d) return;

    box.dataset.bk = "1";

    a.style.setProperty(
      "--kyara-rarity",
      rarityColor(a)
    );

    a.dataset.bkRarity = (a.querySelector(".r")?.textContent || "").trim().toLowerCase();

    box.style.cssText +=
      ";position:relative!important;overflow:hidden!important;min-height:240px!important";

    const im = new Image();
    im.className = "kyara-peek-img";
    im.src = d.image;
    im.alt = "";

    const n = document.createElement("div");
    n.className = "kyara-peek-name";
    n.textContent = d.name;

    const b = document.createElement("div");
    b.className = "kyara-peek-badge";
    b.textContent = "NON DÉBLOQUÉE";

    box.insertBefore(im, box.firstChild);
    box.append(n, b);
  }

  function run() {
    if (active >= 3 || !jobs.length) return;

    active++;

    const j = jobs.shift();

    read(j.url)
      .then(d => paint(j.a, d))
      .catch(() => {})
      .finally(() => {
        active--;
        setTimeout(run, 150);
        run();
      });
  }

  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const a = entry.target;

      io.unobserve(a);

      jobs.push({
        a,
        url: new URL(
          a.getAttribute("href"),
          location.href
        ).href
      });

      run();
      run();
      run();
    }
  }, {
    rootMargin: "600px"
  });

  function scan() {
    document.querySelectorAll('a.slot[href^="/wiki/"]').forEach(a => {
      if (a.querySelector(".miss") && !a.dataset.bkq) {
        a.dataset.bkq = "1";
        io.observe(a);
      }
    });
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function waitFor(test, timeout = 10000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        if (test()) return true;
      } catch (_) {}

      await sleep(80);
    }

    return false;
  }

  function readState() {
    const sel = {};

    document.querySelectorAll(".selects label").forEach(label => {
      const key = label.querySelector("span")?.textContent.trim();
      const select = label.querySelector("select");

      if (key && select) {
        sel[key] = select.value;
      }
    });

    return {
      q: document.querySelector("#q")?.value || "",
      sel,
      chip: [...document.querySelectorAll(".chips .chip")]
        .findIndex(c => c.getAttribute("aria-pressed") === "true"),
      view: [...document.querySelectorAll(".views button")]
        .findIndex(b => b.getAttribute("aria-pressed") === "true"),
      y: window.scrollY
    };
  }

  async function restoreState(state) {
    const views = [...document.querySelectorAll(".views button")];

    if (
      state.view >= 0 &&
      views[state.view]?.getAttribute("aria-pressed") !== "true"
    ) {
      views[state.view].click();
      await sleep(120);
    }

    const chips = [...document.querySelectorAll(".chips .chip")];

    if (
      state.chip >= 0 &&
      chips[state.chip]?.getAttribute("aria-pressed") !== "true"
    ) {
      chips[state.chip].click();
      await sleep(120);
    }

    for (const label of document.querySelectorAll(".selects label")) {
      const key = label.querySelector("span")?.textContent.trim();
      const select = label.querySelector("select");

      if (select && key in state.sel && select.value !== state.sel[key]) {
        select.value = state.sel[key];

        select.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        select.dispatchEvent(
          new Event("change", { bubbles: true })
        );

        await sleep(120);
      }
    }

    const q = document.querySelector("#q");

    if (q && state.q && q.value !== state.q) {
      q.value = state.q;

      q.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      await sleep(120);
    }

    window.scrollTo(0, state.y);
  }

  let refreshing = false;

  const PENDING_KEY = "bk-pending-state";
  const FROM_KEY = "bk-from-collection";
  const FROM_TTL = 30 * 60 * 1000;

  async function goToCollection() {
    // Réessaie le clic jusqu'à ce que l'URL soit /collection
    for (let attempt = 0; attempt < 4; attempt++) {
      document.querySelector('a.navlink[href="/collection"]')?.click();

      if (await waitFor(() => location.pathname === "/collection", 6000)) {
        return true;
      }
    }

    return false;
  }

  async function refreshCollection(btn) {
    if (refreshing) return;

    const via =
      document.querySelector('footer a[href="/raretes"]') ||
      document.querySelector('a.navlink[href="/marche"]');

    if (!via || !document.querySelector('a.navlink[href="/collection"]')) {
      return;
    }

    refreshing = true;
    btn.disabled = true;

    const state = readState();

    // Sauvegarde de secours, utilisée seulement si la page doit se recharger
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ t: Date.now(), state })
    );

    const overlay = document.createElement("div");
    overlay.id = "bk-overlay";
    overlay.textContent = "Actualisation de la collection…";
    document.body.appendChild(overlay);

    try {
      via.click();

      // Attend d'avoir réellement quitté la collection...
      await waitFor(() => location.pathname !== "/collection", 8000);

      // ...puis laisse la page intermédiaire finir de s'afficher
      await waitFor(() => !document.querySelector(".toolbar"), 8000);
      await sleep(500);

      let ok = await goToCollection();

      // Secours 1 : retour arrière dans l'historique du navigateur
      if (!ok) {
        history.back();
        ok = await waitFor(() => location.pathname === "/collection", 6000);
      }

      // Secours 2 : rechargement complet ; les filtres seront restaurés au chargement
      if (!ok) {
        location.href = "/collection";
        return;
      }

      await waitFor(
        () => document.querySelector("#q") && document.querySelector(".grid .cell"),
        15000
      );

      await sleep(150);
      await restoreState(state);

      sessionStorage.removeItem(PENDING_KEY);
    } finally {
      overlay.remove();
      refreshing = false;
      btn.disabled = false;
    }
  }

  // Restaure les filtres si la page a dû être rechargée pendant l'actualisation
  async function restorePending() {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw || location.pathname !== "/collection") return;

    sessionStorage.removeItem(PENDING_KEY);

    let saved;
    try { saved = JSON.parse(raw); } catch (_) { return; }

    // Ignore une sauvegarde ancienne (plus de 30 secondes)
    if (!saved?.state || Date.now() - saved.t > 30000) return;

    const ready = await waitFor(
      () => document.querySelector("#q") && document.querySelector(".grid .cell"),
      15000
    );

    if (ready) {
      await sleep(200);
      await restoreState(saved.state);
    }
  }

  /* ---------- Retour à la collection avec les filtres ---------- */

  // Quand on clique sur une carte depuis la collection, on mémorise les filtres.
  document.addEventListener("click", event => {
    if (location.pathname !== "/collection") return;

    const link = event.target.closest?.(
      'a.slot[href^="/wiki/"], a.wiki[href^="/wiki/"]'
    );
    if (!link) return;

    sessionStorage.setItem(
      FROM_KEY,
      JSON.stringify({ t: Date.now(), state: readState() })
    );
  }, true);

  function readFrom() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FROM_KEY) || "null");

      if (!saved?.state || Date.now() - saved.t > FROM_TTL) {
        sessionStorage.removeItem(FROM_KEY);
        return null;
      }

      return saved;
    } catch (_) {
      sessionStorage.removeItem(FROM_KEY);
      return null;
    }
  }

  // Nettoie la mémoire quand on n'est plus dans le parcours collection → carte.
  function syncRoute() {
    const path = location.pathname;

    if (path !== "/collection" && !path.startsWith("/wiki/")) {
      sessionStorage.removeItem(FROM_KEY);
    }

    if (path !== "/wiki" && !path.startsWith("/wiki/")) {
      document.querySelector("#bk-back")?.remove();
    }
  }

  let returning = false;

  async function backToCollection(btn) {
    if (returning) return;

    const saved = readFrom();
    if (!saved || !document.querySelector('a.navlink[href="/collection"]')) return;

    returning = true;
    btn.disabled = true;

    const overlay = document.createElement("div");
    overlay.id = "bk-overlay";
    overlay.textContent = "Retour à la collection…";
    document.body.appendChild(overlay);

    try {
      const ok = await goToCollection();

      if (!ok) {
        // Secours : rechargement complet, filtres restaurés au chargement
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ t: Date.now(), state: saved.state })
        );
        location.href = "/collection";
        return;
      }

      await waitFor(
        () => document.querySelector("#q") && document.querySelector(".grid .cell"),
        15000
      );

      await sleep(200);
      await restoreState(saved.state);

      await sleep(150);
      window.scrollTo(0, saved.state.y);

      sessionStorage.removeItem(FROM_KEY);
    } finally {
      overlay.remove();
      returning = false;
      btn.disabled = false;
    }
  }

  function injectBackButton() {
    if (!location.pathname.startsWith("/wiki/")) return;
    if (document.querySelector("#bk-back")) return;
    if (!readFrom()) return;

    const btn = document.createElement("button");

    btn.id = "bk-back";
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm";
    btn.textContent = "← Retour à la collection";
    btn.setAttribute("aria-label", "Retour à la collection avec les filtres");

    btn.addEventListener("click", () => backToCollection(btn));

    const crumbs = document.querySelector(".hero-in .crumbs");

    if (crumbs?.parentElement) {
      crumbs.parentElement.insertBefore(btn, crumbs);
    } else {
      btn.classList.add("bk-floating");
      document.body.appendChild(btn);
    }
  }

	const MOBILE_MQ = window.matchMedia("(max-width: 720px)");

	function injectButton() {
	  if (location.pathname !== "/collection") return;

	  const row1 = document.querySelector(".toolbar .row1");
	  const chips = document.querySelector(".toolbar .row2 .chips");
	  if (!row1 || !chips) return;

	  let btn = document.querySelector("#bk-refresh");

	  if (!btn) {
		btn = document.createElement("button");
		btn.id = "bk-refresh";
		btn.type = "button";
		btn.className = "btn btn-ghost btn-sm";
		btn.textContent = "↻ Actualiser";
		btn.setAttribute("aria-label", "Actualiser la collection");
		btn.addEventListener("click", () => refreshCollection(btn));
	  }

	  // Mobile : dans .row1 après Cartes / Albums. Ordinateur : après Mythique.
	  const target = MOBILE_MQ.matches ? row1 : chips;

	  if (btn.parentElement !== target) {
		target.appendChild(btn);
	  }
	}

	MOBILE_MQ.addEventListener?.("change", injectButton);

  function tick() {
    syncRoute();
    scan();
    injectButton();
    injectBackButton();
	restorePending();
  }

  restorePending();
  tick();

  new MutationObserver(tick).observe(document.body, {
    childList: true,
    subtree: true
  });
})();
