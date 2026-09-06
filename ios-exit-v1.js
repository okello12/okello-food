(() => {
  'use strict';

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isiPhone = /iPhone|iPod/i.test(navigator.userAgent);
  if (!standalone || !isiPhone) return;

  const style = document.createElement('style');
  style.textContent = `
    @media(max-width:700px){
      .app-shell{padding-bottom:calc(146px + env(safe-area-inset-bottom))!important}
      .tabs{bottom:calc(30px + env(safe-area-inset-bottom))!important}
    }
    .ios-exit-cue{position:fixed;left:0;right:0;bottom:0;z-index:790;height:calc(24px + env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:center;padding-top:4px;pointer-events:none;color:#657067;font-size:.68rem;font-weight:800;background:linear-gradient(to top,rgba(250,248,243,.98),rgba(250,248,243,.72),transparent)}
    .ios-exit-cue span{display:inline-flex;align-items:center;gap:6px;opacity:.9}
    .ios-exit-cue .gesture-bar{width:42px;height:4px;border-radius:999px;background:#14231c;opacity:.55}
    .ios-exit-sheet[hidden]{display:none!important}
    .ios-exit-sheet{position:fixed;inset:0;z-index:1500;background:rgba(10,18,14,.58);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .ios-exit-panel{width:min(560px,100%);background:#faf8f3;border-radius:22px;padding:18px;border:1px solid #ddd6c7;box-shadow:0 22px 70px rgba(0,0,0,.25)}
    .ios-exit-panel h3{margin:0 0 7px;color:#1e4235}.ios-exit-panel p{margin:0 0 12px;color:#657067;line-height:1.45}
    .ios-exit-demo{border:1px solid #ddd6c7;border-radius:16px;background:#fff;padding:14px;text-align:center;margin:10px 0 14px;color:#1e4235;font-weight:800}
    .ios-exit-arrow{display:block;font-size:1.8rem;line-height:1;margin-bottom:5px}
    .ios-exit-actions{display:flex;gap:9px}.ios-exit-actions button{flex:1;min-height:46px;border-radius:13px;border:1px solid #1e4235;background:#1e4235;color:#fff;font-weight:800}.ios-exit-actions .secondary{background:#fff;color:#1e4235}
    .ios-how-exit{margin-left:auto;flex:0 0 auto;min-height:38px;border:1px solid var(--rule);border-radius:999px;background:#fff;color:var(--forest);font-weight:750;padding:7px 11px;font-size:.8rem}
  `;
  document.head.appendChild(style);

  const cue = document.createElement('div');
  cue.className = 'ios-exit-cue';
  cue.setAttribute('aria-hidden','true');
  cue.innerHTML = '<span><span class="gesture-bar"></span> swipe up to leave</span>';
  document.body.appendChild(cue);

  const sheet = document.createElement('div');
  sheet.className = 'ios-exit-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="ios-exit-panel" role="dialog" aria-modal="true" aria-labelledby="iosExitTitle">
      <h3 id="iosExitTitle">Leave Okello Food</h3>
      <p>iPhone does not let an installed web app close itself. Use the iPhone Home gesture instead.</p>
      <div class="ios-exit-demo"><span class="ios-exit-arrow">↑</span>Swipe up from the very bottom edge of the screen.</div>
      <p>To fully force-close it, swipe up and hold to open the app switcher, then swipe the Okello Food card upward.</p>
      <div class="ios-exit-actions"><button id="iosExitDismiss" type="button">Got it</button></div>
    </div>`;
  document.body.appendChild(sheet);

  function show(){ sheet.hidden = false; }
  function hide(){ sheet.hidden = true; }
  document.getElementById('iosExitDismiss')?.addEventListener('click', hide);
  sheet.addEventListener('click', e => { if (e.target === sheet) hide(); });

  const tools = document.querySelector('.hub-tools');
  if (tools && !document.getElementById('iosHowExitBtn')) {
    const b = document.createElement('button');
    b.id = 'iosHowExitBtn';
    b.className = 'ios-how-exit';
    b.type = 'button';
    b.textContent = 'How to exit';
    b.addEventListener('click', show);
    tools.appendChild(b);
  }

  const settings = document.getElementById('tab-settings');
  if (settings && !document.getElementById('iosExitHelpCard')) {
    const card = document.createElement('section');
    card.id = 'iosExitHelpCard';
    card.className = 'card';
    card.innerHTML = '<p class="eyebrow">IPHONE EXIT</p><h3>Leaving the Home Screen app</h3><p class="muted">The bottom navigation is raised slightly so the iPhone Home gesture has a clear area. Swipe up from the very bottom edge to leave Okello Food.</p><button id="iosShowExitHelp" class="secondary-btn" type="button">Show gesture</button>';
    settings.appendChild(card);
    document.getElementById('iosShowExitHelp')?.addEventListener('click', show);
  }
})();
