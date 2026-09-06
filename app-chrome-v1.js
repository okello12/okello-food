(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const shell = document.querySelector('.app-shell');
  if (!shell || $('okelloAppChrome')) return;

  const style = document.createElement('style');
  style.textContent = `
    .ok-app-chrome{position:sticky;top:0;z-index:1200;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:0 -2px 8px;padding:8px 2px;background:rgba(250,248,243,.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--rule)}
    .ok-app-chrome button{min-height:42px;border:1px solid var(--rule);border-radius:999px;background:#fff;color:var(--forest);font:inherit;font-weight:800;padding:8px 13px;box-shadow:0 3px 12px rgba(20,35,28,.04)}
    .ok-app-chrome button:active{transform:translateY(1px)}
    .ok-app-chrome .ok-back{justify-self:start}.ok-app-chrome .ok-home{justify-self:center;background:var(--tint)}.ok-app-chrome .ok-refresh{justify-self:end}
    .ok-app-chrome .ok-refresh.busy{opacity:.7;pointer-events:none}
    .ok-version-pill{font-size:.72rem;color:var(--muted);font-weight:800;white-space:nowrap}
    .global-hub{top:59px!important}
    @media(max-width:700px){.ok-app-chrome{margin-left:0;margin-right:0}.ok-app-chrome button{min-height:40px;padding:7px 11px;font-size:.82rem}.ok-version-pill{display:none}.global-hub{top:57px!important}}
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'okelloAppChrome';
  bar.className = 'ok-app-chrome';
  bar.setAttribute('aria-label','App controls');
  bar.innerHTML = `
    <button id="okBackBtn" class="ok-back" type="button" aria-label="Go back">‹ Back</button>
    <button id="okHomeBtn" class="ok-home" type="button" aria-label="Go to Today">⌂ Today</button>
    <button id="okRefreshBtn" class="ok-refresh" type="button" aria-label="Refresh app">↻ Refresh</button>`;
  shell.insertAdjacentElement('afterbegin', bar);

  const tabStack = [];
  let navigatingBack = false;
  const activeTabName = () => document.querySelector('.tab.active')?.dataset.tab || 'today';

  document.addEventListener('click', e => {
    const tab = e.target.closest('.tab[data-tab]');
    if (!tab || navigatingBack) return;
    const current = activeTabName();
    const next = tab.dataset.tab;
    if (current && next && current !== next) {
      tabStack.push(current);
      if (tabStack.length > 30) tabStack.shift();
    }
  }, true);

  function visible(el){
    if (!el || el.hidden) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }

  function closeOpenLayer(){
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .scanner-sheet, .online-sheet'));
    const open = dialogs.reverse().find(visible);
    if (!open) return false;
    const close = open.querySelector('[aria-label*="Close" i], .scanner-close, .online-close, [data-close]');
    if (close) close.click();
    else open.hidden = true;
    return true;
  }

  function clickTab(name){
    const tab = document.querySelector(`.tab[data-tab="${CSS.escape(name)}"]`);
    if (!tab) return false;
    navigatingBack = true;
    tab.click();
    setTimeout(() => { navigatingBack = false; }, 0);
    window.scrollTo({top:0, behavior:'smooth'});
    return true;
  }

  $('okBackBtn').addEventListener('click', () => {
    if (closeOpenLayer()) return;
    const previous = tabStack.pop();
    if (previous && clickTab(previous)) return;
    if (activeTabName() !== 'today') clickTab('today');
    else window.scrollTo({top:0, behavior:'smooth'});
  });

  $('okHomeBtn').addEventListener('click', () => {
    if (closeOpenLayer()) return;
    if (activeTabName() !== 'today') tabStack.push(activeTabName());
    clickTab('today');
  });

  async function hardRefresh(){
    const btn = $('okRefreshBtn');
    btn.classList.add('busy');
    btn.textContent = '↻ Updating…';
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          try { await reg.update(); } catch (_) {}
          if (reg.waiting) {
            try { reg.waiting.postMessage({type:'SKIP_WAITING'}); } catch (_) {}
            await new Promise(resolve => {
              let done = false;
              const finish = () => { if (done) return; done = true; resolve(); };
              navigator.serviceWorker.addEventListener('controllerchange', finish, {once:true});
              setTimeout(finish, 1800);
            });
          }
        }
      }
    } finally {
      const u = new URL(location.href);
      u.searchParams.set('refresh', Date.now().toString());
      location.replace(u.toString());
    }
  }

  $('okRefreshBtn').addEventListener('click', hardRefresh);

  const settings = $('tab-settings');
  if (settings && !$('openSafariCard')) {
    const card = document.createElement('section');
    card.id = 'openSafariCard';
    card.className = 'card';
    card.innerHTML = `
      <p class="eyebrow">APP CONTROLS</p>
      <h3>Home Screen navigation</h3>
      <p class="muted">The installed iPhone app deliberately has no Safari toolbar. Use Back, Today and Refresh at the top of Okello Food instead.</p>
      <button id="openSafariBtn" class="secondary-btn" type="button">Open current page in Safari</button>`;
    const updateCard = $('updateCard');
    if (updateCard) updateCard.insertAdjacentElement('afterend', card);
    else settings.appendChild(card);
    $('openSafariBtn')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = location.href;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }
})();
