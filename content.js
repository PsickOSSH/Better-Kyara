(() => {
  "use strict";
  if (window.__betterKyara) return;
  window.__betterKyara = true;

  /* ---------- Style ---------- */
  const css = document.createElement("style");
  css.textContent = `
    a.slot:has(.miss){box-shadow:0 0 14px color-mix(in srgb,var(--kyara-rarity) 22%,transparent)!important;border:2px solid var(--kyara-rarity)!important}
    .kyara-peek-img{display:block!important;position:absolute!important;z-index:1!important;left:50%!important;top:50%!important;width:100%!important;height:100%!important;transform:translate(-50%,-50%)!important;object-fit:cover!important;object-position:center center!important;opacity:.45!important;filter:grayscale(.75) brightness(.65)!important;pointer-events:none!important}
    .kyara-peek-name{position:absolute!important;z-index:3!important;left:8px!important;right:8px!important;top:48%!important;color:#fff!important;font:700 13px/1.1 system-ui,sans-serif!important;text-align:center!important;text-shadow:0 2px 4px #000,0 0 8px #000,0 0 12px #000!important;pointer-events:none!important}
    .kyara-peek-badge{position:absolute!important;z-index:4!important;left:50%!important;bottom:5px!important;transform:translateX(-50%)!important;padding:3px 7px!important;border-radius:999px!important;background:var(--kyara-rarity)!important;color:#111!important;font:700 9px/1 system-ui,sans-serif!important;white-space:nowrap!important;pointer-events:none!important}
    #bk-refresh-row{display:flex;justify-content:flex-end;margin:10px 0 0}
    #bk-refresh{white-space:nowrap}
    #bk-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(14,13,18,.92);color:#fff;font:600 15px system-ui,sans-serif}
  `;
  document.documentElement.appendChild(css);

  /* ---------- Aperçu des cartes manquantes ---------- */
  const jobs = [];
  let active = 0;

  function rarityColor(a) {
    const r = (a.querySelector(".r")?.textContent || "").trim().toLowerCase();
    return r === "mythique" ? "#ff4d2e" : r === "légendaire" ? "#f5c518" :
           r === "épique" ? "#b072ff" : r === "rare" ? "#4d9bff" :
           r === "peu commune" ? "#3fbf7f" : "#b5b1bb";
  }
  const clean = s => s.replace(/\s*[—-]\s*carte\s+.*$/i, "").replace(/\s*·\s*Kyara.*$/i, "").trim();

  async function read(url) {
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    const doc = new DOMParser().parseFromString(await r.text(), "text/html");
    const id = new URL(url).pathname.split("/").filter(Boolean).pop();
    const x = doc.querySelector('.tcg .art img[src*="/cards/"],.art img[src*="/cards/"]');
    let image = x?.getAttribute("src") || `/cards/lg/${id}.webp`;
    image = new URL(image, location.origin).href.replace(/\.(png|jpe?g)(?=($|[?#]))/i, ".webp");
    const card = doc.querySelector(".tcg-name")?.textContent.trim() || "";
    const og = doc.querySelector('meta[property="og:title"]')?.content || "";
    const title = doc.querySelector("title")?.textContent || "";
    return { name: clean(card || og || title), image };
  }

  function paint(a, d) {
    const box = a.querySelector(".miss");
    if (!box || box.dataset.bk || !d) return;
    box.dataset.bk = "1";
    a.style.setProperty("--kyara-rarity", rarityColor(a));
    box.style.cssText += ";position:relative!important;overflow:hidden!important;min-height:240px!important";
    const im = new Image();
    im.className = "kyara-peek-img"; im.src = d.image; im.alt = "";
    const n = document.createElement("div");
    n.className = "kyara-peek-name"; n.textContent = d.name;
    const b = document.createElement("div");
    b.className = "kyara-peek-badge"; b.textContent = "NON DÉBLOQUÉE";
    box.insertBefore(im, box.firstChild);
    box.append(n, b);
  }

  function run() {
    if (active >= 3 || !jobs.length) return;
    active++;
    const j = jobs.shift();
    read(j.url).then(d => paint(j.a, d)).catch(() => {}).finally(() => {
      active--; setTimeout(run, 150); run();
    });
  }

  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const a = e.target;
      io.unobserve(a);
      jobs.push({ a, url: new URL(a.getAttribute("href"), location.href).href });
      run(); run(); run();
    }
  }, { rootMargin: "600px" });

  function scan() {
    document.querySelectorAll('a.slot[href^="/wiki/"]').forEach(a => {
      if (a.querySelector(".miss") && !a.dataset.bkq) {
        a.dataset.bkq = "1";
        io.observe(a);
      }
    });
  }

  /* ---------- Bouton « Actualiser » (sans recharger la page) ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function waitFor(test, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (test()) return true; } catch (_) {}
      await sleep(80);
    }
    return false;
  }

  function readState() {
    const sel = {};
    document.querySelectorAll(".selects label").forEach(l => {
      const k = l.querySelector("span")?.textContent.trim();
      const s = l.querySelector("select");
      if (k && s) sel[k] = s.value;
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

  async function restoreState(st) {
    const views = [...document.querySelectorAll(".views button")];
    if (st.view >= 0 && views[st.view]?.getAttribute("aria-pressed") !== "true") {
      views[st.view].click(); await sleep(120);
    }
    const chips = [...document.querySelectorAll(".chips .chip")];
    if (st.chip >= 0 && chips[st.chip]?.getAttribute("aria-pressed") !== "true") {
      chips[st.chip].click(); await sleep(120);
    }
    for (const l of document.querySelectorAll(".selects label")) {
      const k = l.querySelector("span")?.textContent.trim();
      const s = l.querySelector("select");
      if (s && k in st.sel && s.value !== st.sel[k]) {
        s.value = st.sel[k];
        s.dispatchEvent(new Event("input", { bubbles: true }));
        s.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(120);
      }
    }
    const q = document.querySelector("#q");
    if (q && st.q && q.value !== st.q) {
      q.value = st.q;
      q.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(120);
    }
    window.scrollTo(0, st.y);
  }

  let refreshing = false;

  async function refreshCollection(btn) {
    if (refreshing) return;
    const via = document.querySelector('footer a[href="/raretes"]')
             || document.querySelector('a.navlink[href="/marche"]');
    const back = document.querySelector('a.navlink[href="/collection"]');
    if (!via || !back) return;

    refreshing = true;
    btn.disabled = true;
    const st = readState();

    const ov = document.createElement("div");
    ov.id = "bk-overlay";
    ov.textContent = "Actualisation de la collection…";
    document.body.appendChild(ov);

    try {
      via.click();
      await waitFor(() => location.pathname !== "/collection");
      await sleep(150);
      document.querySelector('a.navlink[href="/collection"]').click();
      await waitFor(() => location.pathname === "/collection"
        && document.querySelector("#q")
        && document.querySelector(".grid .cell"));
      await sleep(150);
      await restoreState(st);
    } finally {
      ov.remove();
      refreshing = false;
    }
  }

  function injectButton() {
    if (location.pathname !== "/collection") return;
    const row = document.querySelector(".toolbar .row1");
    if (!row || document.querySelector("#bk-refresh")) return;
    const wrap = document.createElement("div");
    wrap.id = "bk-refresh-row";
    const btn = document.createElement("button");
    btn.id = "bk-refresh";
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm";
    btn.textContent = "↻ Actualiser";
    btn.title = "Recharge ta collection sans réinitialiser les filtres";
    btn.addEventListener("click", () => refreshCollection(btn));
    wrap.appendChild(btn);
    row.insertAdjacentElement("afterend", wrap);
  }

  function tick() { scan(); injectButton(); }
  tick();
  new MutationObserver(tick).observe(document.body, { childList: true, subtree: true });
})();
