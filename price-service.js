(function (root) {
  "use strict";

  const ORIGIN = "https://kyara.games";
  const CACHE_TTL = 5 * 60 * 1000;
  const EMPTY_TTL = 60 * 1000;
  const ERROR_TTL = 60 * 1000;
  const MAX_CACHE_ENTRIES = 1000;
  const RECENT_TTL = 60 * 60 * 1000;
  const formatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

  function characterId(href) {
    try {
      const url = new URL(href, ORIGIN);
      if (url.origin !== ORIGIN) return null;
      const match = /^\/wiki\/([1-9]\d*)\/?$/.exec(url.pathname);
      const id = match ? Number(match[1]) : NaN;
      return Number.isSafeInteger(id) ? id : null;
    } catch {
      return null;
    }
  }

  function isOffersPage(href) {
    try {
      const url = new URL(href);
      return url.origin === ORIGIN && /^\/marche\/?$/.test(url.pathname)
        && url.searchParams.get("onglet") === "offres";
    } catch {
      return false;
    }
  }

  function isOpeningPage(href) {
    try {
      const url = new URL(href);
      return url.origin === ORIGIN && /^\/ouvrir\/[^/]+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function cardImageId(src) {
    if (!src) return null;
    try {
      const url = new URL(src, ORIGIN);
      let match = null;
      if (url.origin === ORIGIN) {
        match = /^\/cards\/(?:sm|lg)\/([1-9]\d*)\.webp$/.exec(url.pathname);
      } else if (url.protocol === "https:" && /^s\d+\.anilist\.co$/.test(url.hostname)) {
        // Kyara switches to the original AniList image if its own thumbnail fails.
        match = /^\/file\/anilistcdn\/character\/(?:large|medium|small)\/b?([1-9]\d*)(?:-[^/]+)?\.(?:png|jpe?g|webp)$/.exec(url.pathname);
      }
      const id = match ? Number(match[1]) : NaN;
      return Number.isSafeInteger(id) ? id : null;
    } catch {
      return null;
    }
  }

  function normalizePrices(data, id) {
    if (!data || typeof data !== "object" || Array.isArray(data)
      || data.characterId !== id) {
      throw new Error("Réponse de prix inattendue");
    }
    // Reject an API schema change instead of displaying a made-up value.
    for (const field of ["median7d", "median30d"]) {
      if (!(field in data) || (data[field] !== null
        && (typeof data[field] !== "number" || !Number.isFinite(data[field]) || data[field] < 0))) {
        throw new Error("Réponse de prix inattendue");
      }
    }
    const period = data.median7d !== null ? 7 : data.median30d !== null ? 30 : null;
    return {
      status: period === null ? "empty" : "ok",
      value: period === 7 ? data.median7d : period === 30 ? data.median30d : null,
      period,
      median7d: data.median7d,
      median30d: data.median30d,
      ...(Number.isSafeInteger(data.sales7d) && data.sales7d >= 0 ? { sales7d: data.sales7d } : {}),
      ...(Number.isSafeInteger(data.sales30d) && data.sales30d >= 0 ? { sales30d: data.sales30d } : {})
    };
  }

  function retryDelay(value, now) {
    if (!value) return ERROR_TTL;
    const seconds = Number(value);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
    return Number.isFinite(delay) ? Math.max(ERROR_TTL, delay) : ERROR_TTL;
  }

  function recentPrices(data, id) {
    const official = normalizePrices(data, id);
    if (!Array.isArray(data.lastSales)) throw new Error("Historique des ventes indisponible");
    const sales = data.lastSales.filter(sale => Number.isFinite(sale?.price) && sale.price >= 0
      && typeof sale.at === "string" && Number.isFinite(Date.parse(sale.at)))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 10);
    const values = sales.map(sale => sale.price).sort((a, b) => a - b), n = values.length;
    return { ...official, status: n ? "ok" : "empty", value: n ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2 : null,
      period: null, basis: "last10", sampleSize: n };
  }

  function normalizeCharacter(data, id) {
    if (!data || data.id !== id || typeof data.name !== "string" || !data.name.trim()
      || (data.series != null && typeof data.series !== "string")) {
      throw new Error("Réponse de personnage inattendue");
    }
    return { name: data.name.trim(), series: data.series?.trim() || null, ...(/^[CURELM]$/.test(data.rarity) ? { rarity: data.rarity } : {}) };
  }

  function createPriceService({
    fetchImpl = root.fetch.bind(root),
    now = Date.now,
    wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
    concurrency = 3,
    spacing = 250,
    timeout = 12000,
    cacheTTL = CACHE_TTL,
    maxEntries = MAX_CACHE_ENTRIES,
    recentSalesRarities = false
  } = {}) {
    const cache = new Map();
    const pending = new Map();
    const queue = [];
    const metadata = new Map();
    function rememberMetadata(id, value) {
      if (!recentSalesRarities || !value?.name || !/^[LM]$/.test(value.rarity)) return;
      metadata.delete(id); metadata.set(id, { name: value.name, series: value.series || null, rarity: value.rarity });
      while (metadata.size > maxEntries) metadata.delete(metadata.keys().next().value);
    }
    let active = 0;
    let nextStart = 0;
    let cooldownUntil = 0;
    let starting = false;

    function cached(id) {
      const entry = cache.get(id);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        cache.delete(id);
        return null;
      }
      // Keep recently used entries when the cache reaches its limit.
      cache.delete(id);
      cache.set(id, entry);
      return entry;
    }

    function remember(id, entry) {
      cache.delete(id);
      cache.set(id, entry);
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return entry;
    }

    async function load(id) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      let character = {};
      try {
        async function request(path) {
          const response = await fetchImpl(`${ORIGIN}/api${path}`, {
            method: "GET",
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal
          });
          if (!response.ok) {
            if (response.status === 429 || response.status === 503) {
              cooldownUntil = Math.max(cooldownUntil,
                now() + retryDelay(response.headers.get("Retry-After"), now()));
            }
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        }
        const known = metadata.get(id);
        const data = known ? null : await request(`/characters/${id}`);
        character = known || normalizeCharacter(data, id);
        rememberMetadata(id, character);
        // The public character response normally includes both medians.
        // If omitted, read the same endpoint used by Kyara's price chart.
        const recent = recentSalesRarities && /^[LM]$/.test(character.rarity);
        const prices = data?.prices && (!recent || Array.isArray(data.prices.lastSales)) ? data.prices : await request(`/market/prices/${id}`);
        const result = recent ? recentPrices(prices, id) : normalizePrices(prices, id);
        const fetchedAt = now();
        return remember(id, {
          ...result,
          ...character,
          fetchedAt,
          expiresAt: fetchedAt + (result.status === "empty" ? EMPTY_TTL : recent ? Math.min(cacheTTL, RECENT_TTL) : cacheTTL)
        });
      } catch (error) {
        const fetchedAt = now();
        return remember(id, {
          ...character,
          status: "error",
          value: null,
          period: null,
          message: error.name === "AbortError" ? "Délai de réponse dépassé" : error.message,
          fetchedAt,
          expiresAt: Math.max(fetchedAt + ERROR_TTL, cooldownUntil)
        });
      } finally {
        clearTimeout(timer);
      }
    }

    // Start requests gradually, even when several cards become visible at once.
    async function pump() {
      if (starting) return;
      starting = true;
      try {
        while (queue.length && active < concurrency) {
          const delay = Math.max(nextStart, cooldownUntil) - now();
          if (delay > 0) {
            await wait(delay);
            continue; // A running request may have extended the shared cooldown.
          }
          const task = queue.shift();
          active += 1;
          nextStart = now() + spacing;
          load(task.id).then(task.resolve).finally(() => {
            pending.delete(task.id);
            active -= 1;
            void pump();
          });
        }
      } finally {
        starting = false;
      }
    }

    function get(id) {
      if (!Number.isSafeInteger(id) || id <= 0) return Promise.reject(new Error("Carte invalide"));
      const entry = cached(id);
      if (entry) return Promise.resolve(entry);
      if (pending.has(id)) return pending.get(id);
      const promise = new Promise(resolve => queue.push({ id, resolve }));
      pending.set(id, promise);
      void pump();
      return promise;
    }
    const fresh = new Map();
    function refresh(id) {
      if (!Number.isSafeInteger(id) || id <= 0) return Promise.reject(new Error("Carte invalide"));
      if (fresh.has(id)) return fresh.get(id);
      const promise = (async () => {
        if (pending.has(id)) await pending.get(id);
        // Respect failed-request cooldowns even when an action asks for fresh prices.
        const previous = cached(id);
        if (previous?.status === "error") return previous;
        cache.delete(id); return get(id);
      })().finally(() => fresh.delete(id));
      fresh.set(id, promise); return promise;
    }
    function adopt(id, result) {
      if (Number.isSafeInteger(id) && id > 0) rememberMetadata(id, result);
      if (recentSalesRarities && /^[LM]$/.test(result?.rarity) && result.status !== "error"
        && (result.basis !== "last10" || !Number.isSafeInteger(result.sampleSize) || result.sampleSize < 0 || result.sampleSize > 10)) return false;
      if (!Number.isSafeInteger(id) || id < 1 || !["ok", "empty", "error"].includes(result?.status)
        || !Number.isFinite(result.fetchedAt) || !Number.isFinite(result.expiresAt) || result.expiresAt <= result.fetchedAt
        || result.status === "ok" && (!Number.isFinite(result.value) || result.value < 0
          || !(result.basis === "last10" && result.period === null && Number.isSafeInteger(result.sampleSize) && result.sampleSize >= 1 && result.sampleSize <= 10 || [7, 30].includes(result.period)))
        || result.status !== "ok" && result.value !== null) return false;
      const merged = { ...cache.get(id), ...result };
      if (merged.basis === "last10") merged.expiresAt = Math.min(merged.expiresAt, merged.fetchedAt + RECENT_TTL);
      for (const field of ["sales7d", "sales30d"]) if (!Number.isSafeInteger(result[field]) || result[field] < 0) delete merged[field];
      remember(id, merged); return true;
    }
    return { get, refresh, adopt, peek: cached };
  }

  const api = { characterId, isOffersPage, isOpeningPage, cardImageId, normalizePrices, recentPrices, normalizeCharacter, retryDelay, createPriceService, RECENT_TTL,
    formatPrice: value => formatter.format(value), CACHE_TTL, EMPTY_TTL, ERROR_TTL };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KyaraMedianCore = api;
})(globalThis);
