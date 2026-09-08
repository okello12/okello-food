(() => {
  'use strict';

  const VERSION = '45';
  const scripts = [
    'storage-migration-v1.js?v=45',
    'ghana-foods.js?v=45',
    'world-foods.js?v=45',
    'smart-support.js?v=45',
    'meal-data-contract-v1.js?v=45',
    'food-data-layer-v1.js?v=45',
    'amount-quality-v2.js?v=45',
    'product-data-v1.js?v=45',
    'category-rules-v1.js?v=45',
    'app.js?v=45',
    'meal-catalog-facade-v1.js?v=45',
    'food-intelligence-v1.js?v=45',
    'personal-food-memory-v1.js?v=45',
    'piece-entry-v41.js?v=45',
    'piece-usual-v41.js?v=45',
    'smart-portion-output-v41.js?v=45',
    'piece-sheet-contract-v41.js?v=45',
    'piece-sheet-v41.js?v=45',
    'scanner.js?v=45',
    'ux-v2.js?v=45',
    'scanner-launch-v1.js?v=45',
    'shopping-v1.js?v=45',
    'personal-shelf-v1.js?v=45',
    'world-library-v1.js?v=45',
    'template-engine-v41.js?v=45',
    'features-v1.js?v=45',
    'template-runtime-v41.js?v=45',
    'quick-add-piece-v41.js?v=45',
    'catalog-ui-v41.js?v=45',
    'day-forecast-v1.js?v=45',
    'smart-meal-fit-v41.js?v=45',
    'smart-meal-guard-v42.js?v=45',
    'smart-v3.js?v=45',
    'smart-meal-runtime-v41.js?v=45',
    'search-intelligence-v1.js?v=45',
    'recipe-assistant-v1.js?v=45',
    'activity-v1.js?v=45',
    'beta-feedback-v43.js?v=45',
    'backup-v2.js?v=45',
    'update-v1.js?v=45',
    'app-chrome-v1.js?v=45',
    'ios-exit-v1.js?v=45',
    'interaction-v1.js?v=45',
    'first-run-v44.js?v=45',
    'countable-servings-v45.js?v=45'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.body.appendChild(s);
    });
  }

  function controllerVersion(timeout = 700) {
    return new Promise(resolve => {
      const controller = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!controller) return resolve(null);
      const channel = new MessageChannel();
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        resolve(value || null);
      };
      channel.port1.onmessage = e => finish(e.data && e.data.version);
      try {
        controller.postMessage({type:'GET_VERSION'}, [channel.port2]);
      } catch (_) {
        finish(null);
      }
      setTimeout(() => finish(null), timeout);
    });
  }

  function waitForControllerChange(timeout = 7000) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', finish);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', finish, {once:true});
      setTimeout(finish, timeout);
    });
  }

  async function ensureCurrentWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      let version = await controllerVersion();
      const reg = await navigator.serviceWorker.register('./service-worker.js?v=45', {updateViaCache:'none'});
      try { await reg.update(); } catch (_) {}

      const promote = worker => {
        if (!worker) return;
        try { worker.postMessage({type:'SKIP_WAITING'}); } catch (_) {}
      };
      promote(reg.waiting);
      if (reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.installing && reg.installing.state === 'installed') promote(reg.installing);
          if (reg.waiting) promote(reg.waiting);
        });
      }

      if (version !== VERSION) {
        await waitForControllerChange();
        version = await controllerVersion();
      }
    } catch (err) {
      console.warn('PWA update check failed; continuing online.', err);
    }
  }

  async function boot() {
    await ensureCurrentWorker();
    for (const src of scripts) {
      try { await loadScript(src); }
      catch (err) { console.error(err); }
    }
    document.documentElement.dataset.okelloVersion = VERSION;
  }

  boot();
})();