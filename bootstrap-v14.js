(() => {
  'use strict';

  const VERSION = '43';
  const scripts = [
    'storage-migration-v1.js?v=43',
    'ghana-foods.js?v=43',
    'world-foods.js?v=43',
    'smart-support.js?v=43',
    'meal-data-contract-v1.js?v=43',
    'food-data-layer-v1.js?v=43',
    'amount-quality-v2.js?v=43',
    'product-data-v1.js?v=43',
    'category-rules-v1.js?v=43',
    'app.js?v=43',
    'meal-catalog-facade-v1.js?v=43',
    'food-intelligence-v1.js?v=43',
    'personal-food-memory-v1.js?v=43',
    'piece-entry-v41.js?v=43',
    'piece-usual-v41.js?v=43',
    'smart-portion-output-v41.js?v=43',
    'piece-sheet-contract-v41.js?v=43',
    'piece-sheet-v41.js?v=43',
    'scanner.js?v=43',
    'ux-v2.js?v=43',
    'scanner-launch-v1.js?v=43',
    'shopping-v1.js?v=43',
    'personal-shelf-v1.js?v=43',
    'world-library-v1.js?v=43',
    'template-engine-v41.js?v=43',
    'features-v1.js?v=43',
    'template-runtime-v41.js?v=43',
    'quick-add-piece-v41.js?v=43',
    'catalog-ui-v41.js?v=43',
    'day-forecast-v1.js?v=43',
    'smart-meal-fit-v41.js?v=43',
    'smart-meal-guard-v42.js?v=43',
    'smart-v3.js?v=43',
    'smart-meal-runtime-v41.js?v=43',
    'search-intelligence-v1.js?v=43',
    'recipe-assistant-v1.js?v=43',
    'activity-v1.js?v=43',
    'beta-feedback-v43.js?v=43',
    'backup-v2.js?v=43',
    'update-v1.js?v=43',
    'app-chrome-v1.js?v=43',
    'ios-exit-v1.js?v=43',
    'interaction-v1.js?v=43'
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
      const reg = await navigator.serviceWorker.register('./service-worker.js?v=43', {updateViaCache:'none'});
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