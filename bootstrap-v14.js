(() => {
  'use strict';

  const VERSION = '29';
  const scripts = [
    'storage-migration-v1.js?v=29',
    'ghana-foods.js?v=29',
    'world-foods.js?v=29',
    'food-data-layer-v1.js?v=29',
    'amount-quality-v2.js?v=29',
    'app.js?v=29',
    'food-intelligence-v1.js?v=29',
    'personal-food-memory-v1.js?v=29',
    'scanner.js?v=29',
    'ux-v2.js?v=29',
    'world-library-v1.js?v=29',
    'features-v1.js?v=29',
    'day-forecast-v1.js?v=29',
    'smart-support.js?v=29',
    'smart-v3.js?v=29',
    'search-intelligence-v1.js?v=29',
    'recipe-assistant-v1.js?v=29',
    'activity-v1.js?v=29',
    'backup-v2.js?v=29',
    'update-v1.js?v=29',
    'app-chrome-v1.js?v=29',
    'ios-exit-v1.js?v=29'
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
      const reg = await navigator.serviceWorker.register('./service-worker.js?v=29', {updateViaCache:'none'});
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