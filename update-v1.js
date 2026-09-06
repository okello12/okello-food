(() => {
  'use strict';

  const APP_VERSION = 'v27';
  const UPDATE_KEY = 'okello_last_update_check';
  const RELOAD_KEY = 'okello_controller_reload';

  const toast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  };

  async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.getRegistration(); }
    catch (_) { return null; }
  }

  async function checkForUpdates(manual=false) {
    const reg = await getRegistration();
    if (!reg) {
      if (manual) location.reload();
      return;
    }
    try {
      if (manual) toast('Checking for the latest version…');
      await reg.update();
      localStorage.setItem(UPDATE_KEY, String(Date.now()));
      if (reg.waiting) {
        reg.waiting.postMessage({type:'SKIP_WAITING'});
      } else if (manual) {
        setTimeout(() => location.reload(), 900);
      }
    } catch (_) {
      if (manual) location.reload();
    }
  }

  function addRefreshControls() {
    const tools = document.querySelector('.hub-tools');
    if (tools && !document.getElementById('hubRefreshBtn')) {
      const btn = document.createElement('button');
      btn.id = 'hubRefreshBtn';
      btn.type = 'button';
      btn.className = 'hub-tool';
      btn.textContent = '↻ Refresh app';
      btn.addEventListener('click', () => checkForUpdates(true));
      tools.appendChild(btn);
    }

    const settings = document.getElementById('tab-settings');
    if (settings && !document.getElementById('updateCard')) {
      const card = document.createElement('section');
      card.id = 'updateCard';
      card.className = 'card';
      card.innerHTML = `
        <p class="eyebrow">APP UPDATE</p>
        <h3>Refresh Okello Food</h3>
        <p class="muted">Home Screen apps on iPhone do not have Safari's normal reload button. Use this whenever an update seems slow to appear.</p>
        <div class="button-row">
          <button id="settingsRefreshBtn" class="primary-btn" type="button">Check & refresh</button>
        </div>
        <p class="tiny-note">Current app bundle: ${APP_VERSION}</p>`;
      const firstCard = settings.querySelector('.card');
      if (firstCard) firstCard.insertAdjacentElement('afterend', card);
      else settings.appendChild(card);
      document.getElementById('settingsRefreshBtn')?.addEventListener('click', () => checkForUpdates(true));
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sessionStorage.getItem(RELOAD_KEY) === APP_VERSION) return;
      sessionStorage.setItem(RELOAD_KEY, APP_VERSION);
      toast('Update installed. Refreshing…');
      setTimeout(() => location.reload(), 350);
    });

    const last = Number(localStorage.getItem(UPDATE_KEY) || 0);
    if (Date.now() - last > 15 * 60 * 1000) {
      setTimeout(() => checkForUpdates(false), 1800);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const currentLast = Number(localStorage.getItem(UPDATE_KEY) || 0);
      if (Date.now() - currentLast > 15 * 60 * 1000) checkForUpdates(false);
    });
  }

  addRefreshControls();
})();