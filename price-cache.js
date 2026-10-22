(function (root) {
  "use strict";
  const KEY = "kyaraext:prices:v1", DAY = 86400000, LIMIT = 3000;
  // Persist public quotes only. Inventory, account details and tokens are never
  // part of this schema. MAIN-world automation does not load this display cache.
  function sanitize(id, value, now = Date.now()) {
    if (!Number.isSafeInteger(id) || id < 1 || !value || !["ok", "empty", "error"].includes(value.status)
      || !Number.isSafeInteger(value.fetchedAt) || value.fetchedAt < 1 || value.fetchedAt > now + 60000
      || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt <= value.fetchedAt
      || value.expiresAt > value.fetchedAt + DAY || typeof value.name !== "string" || !value.name.trim() || value.name.length > 200
      || !(value.series === null || typeof value.series === "string" && value.series.length <= 300)) return null;
    const finite = n => n === null || typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
    if (!finite(value.median7d ?? null) || !finite(value.median30d ?? null)) return null;
    const recent = value.basis === "last10" && value.period === null && Number.isSafeInteger(value.sampleSize) && value.sampleSize >= 0 && value.sampleSize <= 10;
    if (value.status === "ok" && (!finite(value.value) || value.value === null || !(recent && value.sampleSize > 0
      || [7, 30].includes(value.period) && value.value === (value.period === 7 ? value.median7d : value.median30d)))) return null;
    if (value.status !== "ok" && value.value !== null) return null;
    const quote = { status: value.status, value: value.value, period: value.status === "ok" ? value.period : null,
      median7d: value.median7d ?? null, median30d: value.median30d ?? null, name: value.name.trim(), series: value.series,
      fetchedAt: value.fetchedAt, expiresAt: value.expiresAt };
    if (/^[CURELM]$/.test(value.rarity)) quote.rarity = value.rarity;
    if (recent) { quote.basis = "last10"; quote.sampleSize = value.sampleSize; quote.expiresAt = Math.min(quote.expiresAt, quote.fetchedAt + 3600000); if (quote.expiresAt <= now) return null; }
    for (const field of ["sales7d", "sales30d"]) if (Number.isSafeInteger(value[field]) && value[field] >= 0) quote[field] = value[field];
    if (value.status === "error") quote.message = typeof value.message === "string" ? value.message.slice(0, 200) : "Lecture indisponible";
    return quote;
  }
  function decode(value, now) {
    const records = new Map();
    if (value?.version !== 1 || !Array.isArray(value.records) || value.records.length > LIMIT) return records;
    for (const row of value.records) {
      if (!Array.isArray(row) || row.length !== 2) continue;
      const quote = sanitize(row[0], row[1], now);
      if (quote && (!records.has(row[0]) || records.get(row[0]).fetchedAt < quote.fetchedAt)) records.set(row[0], quote);
    }
    return records;
  }
  function createService({ core, storage, subscribe = () => {}, now = Date.now, lock = action => action(), recentSalesRarities = false }) {
    const engine = core.createPriceService({ cacheTTL: DAY, maxEntries: LIMIT, recentSalesRarities, now });
    const records = new Map(), dirty = new Map(); let timer, writing = null, error = "";
    function merge(incoming) {
      for (const [id, quote] of incoming) {
        const current = records.get(id);
        if (!current || quote.fetchedAt >= current.fetchedAt) { records.set(id, quote); engine.adopt(id, quote); }
      }
      while (records.size > LIMIT) records.delete(records.keys().next().value);
    }
    subscribe(changes => { if (changes[KEY]) merge(decode(changes[KEY].newValue, now())); });
    const ready = Promise.resolve().then(() => storage.get(KEY)).then(data => merge(decode(data?.[KEY], now()))).catch(() => { error = "Cache local indisponible ; lecture publique utilisée."; });
    async function flush() {
      clearTimeout(timer); if (writing) { await writing; if (dirty.size) return flush(); return; }
      if (!dirty.size) return;
      const batch = new Map(dirty); dirty.clear();
      writing = lock(async () => {
        const stored = decode((await storage.get(KEY))?.[KEY], now());
        for (const [id, quote] of batch) if (!stored.has(id) || stored.get(id).fetchedAt <= quote.fetchedAt) stored.set(id, quote);
        const rows = [...stored].filter(([id, quote]) => sanitize(id, quote, now())).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, LIMIT);
        await storage.set({ [KEY]: { version: 1, records: rows } }); error = "";
      }).catch(() => { error = "Cache non enregistré ; les prix restent disponibles dans cet onglet."; }).finally(() => { writing = null; });
      await writing;
    }
    function remember(id, value) {
      const quote = sanitize(id, { ...records.get(id), ...value }, now());
      if (!quote) return;
      const current = records.get(id); if (current && (current.fetchedAt > quote.fetchedAt || JSON.stringify(current) === JSON.stringify(quote))) return;
      records.set(id, quote); dirty.set(id, quote);
      while (records.size > LIMIT) records.delete(records.keys().next().value);
      clearTimeout(timer); timer = setTimeout(() => { void flush(); }, 1000);
    }
    async function get(id) { await ready; const result = await engine.get(id); remember(id, result); return result; }
    async function refresh(id) { await ready; const result = await engine.refresh(id); remember(id, result); return result; }
    function adopt(id, result) {
      const value = result?.status === "ok" ? { ...result, expiresAt: result.fetchedAt + (result.basis === "last10" ? core.RECENT_TTL : DAY) } : result;
      const quote = sanitize(id, { ...records.get(id), ...value }, now());
      if (!engine.adopt(id, quote || value)) return false;
      remember(id, quote || value); return true;
    }
    return { ready, get, refresh, adopt, flush, peek: engine.peek, get error() { return error; },
      knownIds: () => [...records.keys()].filter(id => engine.peek(id)),
      async getFresh(id, maxAge = core.CACHE_TTL) { await ready; const quote = engine.peek(id); return quote && now() - quote.fetchedAt <= maxAge ? quote : refresh(id); },
      destroy() { clearTimeout(timer); } };
  }
  function ingest(service, core, prices, catalogue, at = Date.now()) {
    const cards = new Map(catalogue.map(card => [card.id, card]));
    for (const price of prices) {
      const card = cards.get(price.id); if (!card) continue;
      try {
        const quote = core.normalizePrices({ characterId: price.id, median7d: price.median7d ?? null, median30d: price.median30d ?? null, sales7d: price.sales7d, sales30d: price.sales30d }, price.id);
        service.adopt(price.id, { ...quote, name: card.name, series: card.series || null, rarity: card.rarity, fetchedAt: at, expiresAt: at + (quote.status === "ok" ? DAY : core.EMPTY_TTL) });
      } catch { /* Do not turn malformed bulk data into a usable quote. */ }
    }
  }
  const api = { KEY, DAY, LIMIT, sanitize, decode, createService, ingest };
  if (typeof module === "object" && module.exports) module.exports = api; else root.KyaraPriceCache = api;
})(globalThis);
