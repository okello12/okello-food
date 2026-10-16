(() => {
  'use strict';

  const VERSION = '50';
  const scripts = [
    'storage-migration-v1.js?v=50',
    'state-repository-v46.js?v=50',
    'count-unit-migration-v46.js?v=50',
    'ghana-foods.js?v=50',
    'world-foods.js?v=50',
    'smart-support.js?v=50',
    'catalog-storage-v46.js?v=50',
    'meal-data-contract-v1.js?v=50',
    'food-data-layer-v2.js?v=50',
    'amount-quality-v3.js?v=50',
    'product-data-v2.js?v=50',
    'category-rules-v1.js?v=50',
    'app.js?v=50',
    'target-safety-v46.js?v=50',
    'meal-catalog-facade-v1.js?v=50',
    'food-intelligence-v1.js?v=50',
    'personal-food-memory-v1.js?v=50',
    'piece-entry-v41.js?v=50',
    'piece-usual-v41.js?v=50',
    'smart-portion-output-v41.js?v=50',
    'piece-sheet-contract-v41.js?v=50',
    'piece-sheet-v41.js?v=50',
    'scanner.js?v=50',
    'ux-v2.js?v=50',
    'scanner-launch-v1.js?v=50',
    'shopping-v1.js?v=50',
    'personal-shelf-v1.js?v=50',
    'world-library-v1.js?v=50',
    'template-engine-v41.js?v=50',
    'features-v1.js?v=50',
    'template-runtime-v41.js?v=50',
    'quick-add-piece-v41.js?v=50',
    'catalog-ui-v41.js?v=50',
    'day-forecast-v1.js?v=50',
    'reflection-v50.js?v=50',
    'smart-meal-fit-v41.js?v=50',
    'smart-meal-guard-v42.js?v=50',
    'speech-guard-v46.js?v=50',
    'smart-v3.js?v=50',
    'smart-meal-runtime-v41.js?v=50',
    'search-intelligence-v1.js?v=50',
    'recipe-assistant-v1.js?v=50',
    'activity-v1.js?v=50',
    'activity-safety-v46.js?v=50',
    'beta-feedback-v43.js?v=50',
    'beta-metrics-v46.js?v=50',
    'backup-v3.js?v=50',
    'update-v1.js?v=50',
    'app-chrome-v1.js?v=50',
    'ios-exit-v1.js?v=50',
    'interaction-v1.js?v=50',
    'first-run-v44.js?v=50',
    'countable-servings-v46.js?v=50',
    'nutrition-integrity-v46.js?v=50',
    'evidence-review-v46.js?v=50',
    'build-my-meal-v46.js?v=50',
    'meal-text-preprocessor-v46.js?v=50',
    'global-first-v47.js?v=50',
    'trust-v46.js?v=50'
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
      const reg = await navigator.serviceWorker.register('./service-worker.js?v=50', {updateViaCache:'none'});
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