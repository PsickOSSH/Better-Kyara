(function (root) {
  "use strict";
  const rarityNames = { C: "Commune", U: "Peu commune", R: "Rare", E: "Épique", L: "Légendaire", M: "Mythique" };
  function browsingService(document, core) {
    const extension = root.browser || root.chrome;
    if (!extension?.storage?.local || !root.KyaraPriceCache) return core.createPriceService({ cacheTTL: 86400000, recentSalesRarities: true });
    return root.KyaraPriceCache.createService({ core, storage: extension.storage.local, recentSalesRarities: true,
      subscribe: listener => extension.storage.onChanged.addListener((changes, area) => { if (area === 'local') listener(changes); }),
      lock: action => document.defaultView.navigator.locks?.request ? document.defaultView.navigator.locks.request('kyara-lite:prices', action) : action() });
  }
  function createController({ document, location, core, service = browsingService(document, core), Observer = root.IntersectionObserver, borders = root.KyaraMarketBorders?.createController({ document, location }) }) {
    const entries = new Map(), visible = new Set();
    let active = 0, scanTimer, startTimer, watchTimer, nextStart = 0, refreshButton, destroyed = false;
    const node = (tag, className, content = "") => { const item = document.createElement(tag); item.className = className; item.textContent = content; return item; };
    const idOf = row => core.characterId(row.getAttribute("href")) ?? core.cardImageId(row.querySelector("img")?.getAttribute("src"));
    const extension = root.browser || root.chrome;
    const settings = root.KyaraLitePreferences?.createStore({ storage: extension.storage.local,
      subscribe: listener => extension.storage.onChanged.addListener((changes, area) => { if (area === 'local') listener(changes); }) });
    settings?.onChange(() => schedule());
    const notificationClient = root.KyaraLiteNotificationClient?.createClient({ document, service });
    let notifications;
    const watchlist = settings && root.KyaraWatchlist?.createController({ document, location, core, service, settings, bridge: notificationClient,
      storage: extension.storage.local, key: 'kyara-lite:watchlist:v1',
      controlsForRow: row => row.querySelector('.kyara-lite-card-controls'),
      subscribe: listener => extension.storage.onChanged.addListener((changes, area) => { if (area === 'local') listener(changes); }),
      onChange: () => { if (!destroyed) void notifications?.scan(); } });
    notifications = settings && root.KyaraMarketNotifications?.createController({ document, settings, bridge: notificationClient, service, watchlist, recentSalesRarities: true, onChange: () => schedule() });
    const chatColors = settings && root.KyaraChatColors?.createController({ document, settings });
    const locks = root.KyaraLiteLocks?.createController({ document, location, core });
    const ownedUI = '.kyara-lite-meta, .kyara-lite-card-controls, .kyara-lite-lock, .kyara-lite-lock-notice, .kyaraext-watch-button, .kyaraext-watch-feed, .kyaraext-notification-tools, .kyaraext-notification-buyout, .kyaraext-wish-badge, .kyaraext-chat-legend';
    function surfaces() {
      const cards = new Map(), add = (row, parent, kind, details = true) => { if (parent && row.querySelector("img")) cards.set(row, { row, parent, kind, details }); };
      if (core.isOffersPage(location.href)) {
        for (const row of document.querySelectorAll('.offers .give a.big[href], .offers .want a.thumb[href]')) add(row, row, row.matches('.give a.big') ? 'give' : 'want', !row.matches('.give a.big'));
      }
      const url = new URL(location.href);
      if (/^\/marche\/?$/.test(url.pathname) && url.searchParams.get('onglet') === 'echanges') {
        for (const row of document.querySelectorAll('.trades > .trade .sides .thumbs > a.thumb')) add(row, row, 'market');
        for (const row of document.querySelectorAll('.trades > .trade .trays > .tray .slots > li')) add(row, row, 'unified');
      }
      for (const dialog of document.querySelectorAll('[role="dialog"]')) {
        for (const row of dialog.querySelectorAll('form .cols .picker .res > li > button, form .cols .picker .chosen > li')) add(row, row.querySelector('.nm'), 'friend');
        for (const row of dialog.querySelectorAll('.builder .browse .grid > div')) add(row, row.querySelector('.cap'), 'gallery');
        for (const row of dialog.querySelectorAll('.builder .offer .chips > .chip:not(.ch)')) add(row, row.querySelector('.cn'), 'friend');
        for (const row of dialog.querySelectorAll('.od .grid > button')) add(row, row, 'creator');
        for (const row of dialog.querySelectorAll('form.form .trays > .tray .slots > li, form.form .shelf .grid > li > button.tile, .od .trays > .tray .slots > li, .od .shelf .grid > li > button')) add(row, row, 'unified');
      }
      if (/^\/collection\/?$/.test(url.pathname)) {
        for (const row of document.querySelectorAll('.wrap.body .grid .cell:has(.tcg.r-L, .tcg.r-M)')) add(row, row.querySelector('.mk'), 'collection', false);
      }
      return cards;
    }
    function paint(entry, result) {
      entry.meta.dataset.state = result.status;
      if (entry.name) { entry.name.textContent = result.name || entry.row.querySelector('img')?.alt || entry.row.title || `Carte #${entry.id}`; entry.name.title = entry.name.textContent; }
      if (entry.series) { entry.series.textContent = result.series || (result.status === 'error' ? 'Série indisponible' : 'Série inconnue'); entry.series.title = entry.series.textContent; }
      if (entry.rarity) { entry.rarity.textContent = rarityNames[result.rarity] || 'Rareté inconnue'; entry.rarity.dataset.rarity = result.rarity || ''; }
      if (entry.price) {
        entry.value.textContent = result.status === 'ok' ? `${core.formatPrice(result.value)} ◆` : '— ◆';
        entry.period.textContent = result.status === 'ok' ? result.basis === 'last10' ? `${entry.kind === 'collection' ? '' : 'méd. '}${result.sampleSize} ventes` : `méd. ${result.period} j` : result.status === 'error' ? 'indisp.' : 'méd. inconnue';
        entry.price.title = result.status === 'ok' ? `Médiane des ventes sur ${result.period} jours : ${core.formatPrice(result.value)} chakra. Repère historique, pas un prix de vente garanti.`
          : result.status === 'error' ? `Prix indisponible : ${result.message || 'erreur de lecture'}` : 'Aucune médiane disponible sur 7 ou 30 jours.';
        if (result.basis === 'last10') entry.price.title = result.status === 'ok' ? `Médiane des ${result.sampleSize} dernières ventes terminées : ${core.formatPrice(result.value)} chakra. Repère historique, pas un prix de vente garanti.` : 'Aucune vente récente disponible. Valeur inconnue.';
        if (Number.isFinite(result.fetchedAt)) entry.price.title += ` Relevée le ${new Date(result.fetchedAt).toLocaleString('fr-FR')}. Cache de navigation : ${result.basis === 'last10' ? '1 h' : '24 h'} maximum.`;
        entry.price.setAttribute('aria-label', entry.price.title);
      }
      entry.expiresAt = result.expiresAt || Date.now() + 60000; entry.loaded = true;
    }
    function pump() {
      clearTimeout(startTimer);
      if (destroyed || document.visibilityState !== 'visible') return;
      for (const entry of entries.values()) {
        if (!visible.has(entry) && !entry.row.closest('[role="dialog"] .trays .slots')) continue;
        if (active >= 3) break;
        if (entry.loaded && entry.expiresAt > Date.now() || entry.loading || !entry.row.isConnected || idOf(entry.row) !== entry.id) continue;
        const cached = service.peek(entry.id);
        if (cached) { paint(entry, cached); continue; }
        const delay = nextStart - Date.now();
        if (delay > 0) { startTimer = setTimeout(pump, delay); return; }
        active++; entry.loading = true; nextStart = Date.now() + 250;
        void service.get(entry.id).then(result => {
          if (entries.get(entry.row) === entry && entry.meta.isConnected && idOf(entry.row) === entry.id) paint(entry, result);
        }).catch(() => {
          if (entries.get(entry.row) === entry && entry.meta.isConnected) paint(entry, { status: 'error', message: 'Lecture impossible' });
        }).finally(() => { active--; entry.loading = false; pump(); });
      }
    }
    const intersection = new Observer(changes => {
      for (const change of changes) {
        const entry = entries.get(change.target); if (!entry) continue;
        if (change.isIntersecting) visible.add(entry); else visible.delete(entry);
        if (change.isIntersecting && entry.deferred) {
          for (const old of entry.parent.querySelectorAll(':scope > .kyara-lite-meta')) old.remove();
          entry.meta = node('span', 'kyara-lite-meta'); entry.meta.dataset.state = 'loading';
          entry.price = node('span', 'kyara-lite-price'); entry.value = node('span', 'kyara-lite-value', '… ◆'); entry.period = node('span', 'kyara-lite-period', '10 ventes');
          entry.price.append(entry.value, entry.period); entry.meta.append(entry.price);
          entry.parent.append(entry.meta); entry.deferred = false; entry.row.classList.add('kyara-lite-card', 'kyara-lite-collection');
          const cached = service.peek(entry.id); if (cached) paint(entry, cached);
        }
      }
      pump();
    }, { rootMargin: '0px' });
    function remove(entry) {
      intersection.unobserve(entry.row); visible.delete(entry); entry.meta?.remove();
      entry.row.classList.remove('kyara-lite-card', `kyara-lite-${entry.kind}`); entries.delete(entry.row);
    }
    function scan() {
      if (destroyed) return;
      void notifications?.scan(); chatColors?.scan(); locks?.scan(); watchlist?.scan();
      clearTimeout(scanTimer); borders?.scan(); const cards = surfaces();
      for (const entry of entries.values()) {
        const card = cards.get(entry.row);
        if (!card || card.parent !== entry.parent || card.kind !== entry.kind || idOf(entry.row) !== entry.id || !entry.deferred && entry.meta.parentElement !== card.parent) remove(entry);
      }
      for (const card of cards.values()) {
        const id = idOf(card.row); if (id === null || entries.has(card.row)) continue;
        if (card.kind === 'collection') {
          const entry = { ...card, id, deferred: true, loading: false, loaded: false };
          entries.set(card.row, entry); intersection.observe(card.row); continue;
        }
        // A site render can copy an already decorated row. Keep only the label
        // owned by this controller, instead of appending a second copy.
        for (const old of card.parent.querySelectorAll(':scope > .kyara-lite-meta')) old.remove();
        const meta = node('span', 'kyara-lite-meta'); meta.dataset.state = 'loading';
        const seriesOnly = card.kind === 'unified' && !!card.row.closest('[role="dialog"]');
        let price, value, period;
        if (!seriesOnly) {
          price = node('span', 'kyara-lite-price'); value = node('span', 'kyara-lite-value', '… ◆'); period = node('span', 'kyara-lite-period', 'méd.');
          price.append(value, period); meta.append(price);
        }
        let name, rarity, series;
        if (card.details) {
          if (['want', 'market'].includes(card.kind) || card.kind === 'unified' && !card.row.querySelector('.nm')) { name = node('span', 'kyara-lite-name', card.row.querySelector('img')?.alt || card.row.title || `Carte #${id}`); meta.append(name); }
          if (!seriesOnly) { rarity = node('span', 'kyara-lite-rarity', 'Rareté inconnue'); meta.append(rarity); }
          series = node('span', 'kyara-lite-series', 'Chargement de la série…'); meta.append(series);
        }
        const entry = { ...card, id, meta, price, value, period, name, rarity, series, loading: false, loaded: false };
        entry.deferred = card.kind === 'collection';
        card.row.classList.add('kyara-lite-card', `kyara-lite-${card.kind}`); if (!entry.deferred) card.parent.append(meta); entries.set(card.row, entry);
        const cached = service.peek(id); if (cached) paint(entry, cached);
        intersection.observe(card.row);
      }
      manualRefresh(); pump();
    }
    const offersFiltersKey = `kyara-lite:offers-filters:v1:${location.pathname}${location.search}`;
    let restoringOffersFilters = false;
    let offersFiltersRestored = false;

    function filterButtonKey(button) {
      const copy = button.cloneNode(true);
      copy.querySelectorAll('.n').forEach(element => element.remove());
      return copy.textContent.replace(/\s+/g, ' ').trim();
    }

    function saveOffersFilters(filters) {
      const state = {
        search: filters.querySelector('input[type="search"]')?.value || '',
        buttons: Object.fromEntries(
          [...filters.querySelectorAll('button[aria-pressed]')].map(button => [
            filterButtonKey(button), button.getAttribute('aria-pressed') === 'true'
          ])
        )
      };
      try {
        document.defaultView.sessionStorage.setItem(offersFiltersKey, JSON.stringify(state));
      } catch (error) {
        console.warn('Kyara Lite : sauvegarde des filtres impossible.', error);
      }
    }

    async function restoreOffersFilters() {
      if (restoringOffersFilters || offersFiltersRestored) return;
      let saved;
      try {
        const raw = document.defaultView.sessionStorage.getItem(offersFiltersKey);
        if (!raw) { offersFiltersRestored = true; return; }
        saved = JSON.parse(raw);
        if (!saved || typeof saved.search !== 'string' || !saved.buttons || typeof saved.buttons !== 'object') {
          document.defaultView.sessionStorage.removeItem(offersFiltersKey);
          offersFiltersRestored = true;
          return;
        }
      } catch (error) {
        console.warn('Kyara Lite : lecture des filtres impossible.', error);
        offersFiltersRestored = true;
        return;
      }
      const findFilters = () => document.querySelector('.board .filters');
      const filters = findFilters();
      if (!filters?.querySelector('input[type="search"]')) return;
      const availableKeys = new Set(
        [...filters.querySelectorAll('button[aria-pressed]')].map(filterButtonKey)
      );
      if (Object.keys(saved.buttons).some(key => !availableKeys.has(key))) return;
      restoringOffersFilters = true;
      const view = document.defaultView;
      const nextRender = () => new Promise(resolve => view.setTimeout(resolve, 0));
      try {
        for (const [key, pressed] of Object.entries(saved.buttons)) {
          const currentFilters = findFilters();
          const button = [...(currentFilters?.querySelectorAll('button[aria-pressed]') || [])]
            .find(item => filterButtonKey(item) === key);
          if (!button || button.disabled) return;
          const isPressed = button.getAttribute('aria-pressed') === 'true';
          if (isPressed !== pressed) { button.click(); await nextRender(); }
        }
        const input = findFilters()?.querySelector('input[type="search"]');
        if (!input) return;
        input.value = saved.search;
        input.dispatchEvent(new view.Event('input', { bubbles: true }));
        input.dispatchEvent(new view.Event('change', { bubbles: true }));
        offersFiltersRestored = true;
        view.sessionStorage.removeItem(offersFiltersKey);
      } catch (error) {
        console.warn('Kyara Lite : restauration des filtres impossible.', error);
      } finally {
        restoringOffersFilters = false;
      }
    }

    function manualRefresh() {
      const board = core.isOffersPage(location.href) ? document.querySelector('.board') : null;
      if (!board) { refreshButton?.remove(); refreshButton = null; return; }
      void restoreOffersFilters();
      const native = [...board.querySelectorAll('button')].find(button =>
        button !== refreshButton && /^↻ Actualiser$/.test(button.textContent.trim())
      );
      if (native) { refreshButton?.remove(); refreshButton = null; return; }
      if (refreshButton?.isConnected) return;
      refreshButton = node('button', 'kyara-lite-refresh', '↻ Actualiser');
      refreshButton.type = 'button';
      refreshButton.title = 'Recharger la page en conservant la recherche et les filtres.';
      refreshButton.addEventListener('click', async () => {
        const filters = document.querySelector('.board .filters');
        if (filters) saveOffersFilters(filters);
        refreshButton.disabled = true;
        try { await service.flush?.(); }
        catch (error) { console.warn('Kyara Lite : écriture du cache impossible.', error); }
        finally { location.reload(); }
      });
      (board.querySelector('.filters') || board.firstElementChild)?.after(refreshButton);
    }
    const schedule = () => { if (destroyed) return; clearTimeout(scanTimer); scanTimer = setTimeout(scan, 100); };
    async function watchPulse() {
      if (destroyed) return;
      await watchlist?.check();
      if (!destroyed) watchTimer = setTimeout(watchPulse, 30000);
    }
    const mutation = new document.defaultView.MutationObserver(changes => {
      if (changes.some(change => {
        const target = change.target.nodeType === 1 ? change.target : change.target.parentElement;
        if (target?.closest(ownedUI)) return false;
        if (change.type === 'attributes' && change.attributeName === 'class') {
          return target.matches('.tcg') && !!target.closest('.wrap.body .cell');
        }
        if (change.type === 'childList' && target?.closest('.qty, .chak, a.thumb, .side > .sk, .tray > header h3') && [...change.addedNodes, ...change.removedNodes].some(item => item.nodeType === 3)) return true;
        return change.type === 'characterData' ? !!target?.closest('.delta, .qty, .chak, .thumb, .side > .sk, .tray > header h3') : change.type === 'attributes' || [...change.addedNodes, ...change.removedNodes].some(item => item.nodeType === 1 && !item.matches(ownedUI + ', .kyara-lite-refresh'));
      })) schedule();
    });
    mutation.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'src', 'disabled', 'aria-disabled', 'class', 'aria-pressed'] });
    document.addEventListener('input', schedule);
    document.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', () => { scan(); pump(); });
    root.addEventListener?.('popstate', schedule); root.addEventListener?.('hashchange', schedule);
    void service.ready?.then(() => { if (!destroyed) scan(); });
    scan();
    void watchlist?.loaded.then(watchPulse);
    return { scan, destroy() {
      destroyed = true;
      mutation.disconnect(); intersection.disconnect();
      clearTimeout(scanTimer); clearTimeout(startTimer); clearTimeout(watchTimer);
      watchlist?.destroy(); locks?.destroy();
      for (const entry of entries.values()) remove(entry);
      refreshButton?.remove(); service.destroy?.();
    } };
  }
  const api = { createController };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  if (!root.kyaraLiteRunning) { root.kyaraLiteRunning = true; root.KyaraLite = api; root.kyaraLiteController = createController({ document, location, core: root.KyaraMedianCore }); }
})(globalThis);
