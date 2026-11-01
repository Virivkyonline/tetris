/* Retro Hry – menu, navigácia (#kocky, #formulky, #liska), hlavná slučka. */
'use strict';

(function (R) {
  const $ = (s) => document.querySelector(s);
  const screens = { menu: $('#menu'), brick: $('#brick'), eggs: $('#eggs'), racer: $('#racer'), octo: $('#octo'), battle: $('#battle') };
  const ROUTES = { kocky: ['brick', 'blocks'], formulky: ['racer', null], liska: ['eggs', null], chobotnica: ['octo', null], armada: ['battle', null] };

  let pushedFromMenu = false;
  const app = {
    goMenu() {
      if (pushedFromMenu) {
        pushedFromMenu = false;
        try { history.back(); return; } catch (e) { /* nič */ }
      }
      setHash('');
    }
  };

  const brick = R.BrickConsole(screens.brick, app);
  const devices = {
    brick,
    eggs: R.EggsGame(screens.eggs, app),
    racer: R.RacerGame(screens.racer, app),
    octo: R.OctopusGame(screens.octo, app),
    battle: R.BattleGame(screens.battle, app)
  };
  R.devices = devices;
  let current = null;

  function setHash(h) {
    try {
      if (h) location.hash = h;
      else if (location.hash) {
        // späť do menu bez prázdneho "#" v adrese, ak sa dá
        try { history.replaceState(null, '', location.pathname + location.search); route(); }
        catch (e) { location.hash = ''; }
      }
    } catch (e) { route(); }
  }

  function show(name) {
    for (const k in screens) screens[k].hidden = k !== name;
  }

  function route() {
    const h = (location.hash || '').replace(/^#/, '');
    const r = ROUTES[h];
    if (current) { current.leave(); current = null; }
    if (!r) {
      pushedFromMenu = false;
      show('menu');
      refreshMenu();
      wake(false);
      return;
    }
    show(r[0]);
    current = devices[r[0]];
    current.enter(r[1]);
    wake(true);
  }

  // ---------------------------------------------------------------- menu
  document.querySelectorAll('[data-route]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      R.sound.unlock();
      pushedFromMenu = true;
      location.hash = a.dataset.route;
    });
  });

  function refreshMenu() {
    document.querySelectorAll('[data-hi]').forEach((el) => {
      el.textContent = R.hi.get(el.dataset.hi).toLocaleString('sk-SK');
    });
    syncPrefs();
  }

  const prefSound = $('#pref-sound'), prefVib = $('#pref-vibrate');
  function syncPrefs() {
    prefSound.setAttribute('aria-pressed', String(R.sound.on));
    prefVib.setAttribute('aria-pressed', String(R.haptics.on));
  }
  prefSound.addEventListener('click', () => { R.sound.toggle(); syncPrefs(); });
  prefVib.addEventListener('click', () => { if (R.haptics.toggle()) R.haptics.buzz(30); syncPrefs(); });
  R.sound.onChange(syncPrefs);
  if (!('vibrate' in navigator)) prefVib.hidden = true;

  // inštalácia ako apka (Android/Chrome) a rada pre iPhone
  let installEvt = null;
  const prefInstall = $('#pref-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvt = e;
    prefInstall.hidden = false;
  });
  prefInstall.addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch (e) { /* nič */ }
    installEvt = null;
    prefInstall.hidden = true;
  });
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inNativeShell = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isIOS && !standalone && !inNativeShell && window.top === window) $('#ios-hint').hidden = false;

  // ---------------------------------------------------------------- náhľady v menu
  const previews = Array.from(document.querySelectorAll('[data-preview]')).map((c) => ({ c, ctx: c.getContext('2d'), kind: c.dataset.preview }));
  const mini = new Uint8Array(200);
  let previewT = 0, previewAcc = 1000;
  function drawPreviews(dt) {
    previewT += dt;
    previewAcc += dt;
    if (previewAcc < 90) return;
    previewAcc = 0;
    for (const p of previews) {
      const r = p.c.getBoundingClientRect();
      if (!r.width) continue;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (p.c.width !== w || p.c.height !== h) { p.c.width = w; p.c.height = h; }
      const ctx = p.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      R.lcdBackground(ctx, w, h);
      if (p.kind === 'eggs') {
        R.drawEggsPreview(ctx, w, h, previewT);
      } else if (p.kind === 'racer') {
        R.drawRacerPreview(ctx, w, h, previewT);
      } else if (p.kind === 'octo') {
        R.drawOctoPreview(ctx, w, h, previewT);
      } else if (p.kind === 'battle') {
        R.drawBattlePreview(ctx, w, h, previewT);
      } else {
        mini.fill(0);
        R.games[p.kind].demo(previewT, mini);
        const s = Math.floor((h - 8 * dpr) / 20);
        R.drawMiniMatrix(ctx, Math.round((w - s * 10) / 2), Math.round((h - s * 20) / 2), s, mini, 10, 20);
      }
    }
  }

  // ---------------------------------------------------------------- slučka
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(100, Math.max(0, now - last));
    last = now;
    if (current) current.frame(dt);
    else drawPreviews(dt);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- systém
  let wakeLock = null;
  async function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (current) current.pause(); }
    else if (current) wake(true);
  });

  window.addEventListener('keydown', (e) => { if (current) current.keydown(e); });
  window.addEventListener('keyup', (e) => { if (current) current.keyup(e); });
  window.addEventListener('hashchange', route);

  let rsTimer = null;
  function onResize() {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => { if (current) current.resize(); }, 60);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(onResize);
    document.querySelectorAll('.lcd-holder').forEach((h) => ro.observe(h));
  }

  // dvojité ťuknutie nesmie zväčšovať stránku počas hry
  document.addEventListener('dblclick', (e) => { if (current) e.preventDefault(); }, { passive: false });

  // offline podpora (len na webe; v Android apke netreba)
  if (!window.RETRO_EMBED && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !inNativeShell) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* napr. v náhľade bez SW */ });
    });
  }

  route();
  requestAnimationFrame(loop);
})(window.Retro);
