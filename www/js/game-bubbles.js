/* Retro Hry – ĽADOVÉ BUBLINY: kanón dole strieľa farebné bubliny, tri a viac rovnakých
   pri sebe prasknú, odtrhnuté bubliny spadnú, strop sa postupne spúšťa. */
'use strict';

(function (R) {
  const COLS = 8;
  const DEATH = 12;          // bublina v 12. rade = koniec
  const ROWS = DEATH + 2;    // riadkov v mriežke
  const SQ3 = Math.sqrt(3);
  const PALETTE = [
    ['#ff8a80', '#e53935', '#8e1b17'], // červená
    ['#82b1ff', '#2f6fe8', '#163c9c'], // modrá
    ['#b9f6ca', '#2fb35a', '#14632e'], // zelená
    ['#fff59d', '#f2c230', '#9a7408'], // žltá
    ['#e1bee7', '#9c4dcc', '#4a1a6b'], // fialová
    ['#ffcc80', '#fb8c00', '#8a4300']  // oranžová
  ];

  function rowLen(i) { return i % 2 ? COLS - 1 : COLS; }
  function neighbors(i, j) {
    const odd = i % 2;
    const d = odd
      ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    const out = [];
    for (const [a, b] of d) {
      const ii = i + a, jj = j + b;
      if (ii >= 0 && ii < ROWS && jj >= 0 && jj < rowLen(ii)) out.push([ii, jj]);
    }
    return out;
  }

  // vzhľad bubliny (predkreslený pre každú farbu a veľkosť)
  const cache = {};
  function bubbleSprite(c, size, frozen) {
    const key = c + ':' + size + ':' + (frozen ? 1 : 0);
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const r = size / 2;
    const P = frozen ? ['#f4fbff', '#a9cfe6', '#5f86a3'] : PALETTE[c];
    const gr = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    gr.addColorStop(0, P[0]);
    gr.addColorStop(0.55, P[1]);
    gr.addColorStop(1, P[2]);
    g.fillStyle = gr;
    g.beginPath(); g.arc(r, r, r * 0.96, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.ellipse(r * 0.68, r * 0.55, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = Math.max(1, size * 0.03);
    g.beginPath(); g.arc(r, r, r * 0.9, 0.2 * Math.PI, 0.7 * Math.PI); g.stroke();
    if (frozen) {
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = Math.max(1, size * 0.04);
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = k * Math.PI / 3;
        g.moveTo(r - Math.cos(a) * r * 0.45, r - Math.sin(a) * r * 0.45);
        g.lineTo(r + Math.cos(a) * r * 0.45, r + Math.sin(a) * r * 0.45);
      }
      g.stroke();
    }
    cache[key] = cv;
    return cv;
  }

  R.BubblesGame = function (root, app) {
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const hudLevel = root.querySelector('[data-bb="level"]');
    const hudScore = root.querySelector('[data-bb="score"]');
    const panels = {
      start: root.querySelector('[data-panel="start"]'),
      win: root.querySelector('[data-panel="win"]'),
      lose: root.querySelector('[data-panel="lose"]')
    };
    let dpr = 1, Wpx = 1, Hpx = 1;
    let r = 10, left = 0, top = 0, rowH = 10, boardW = 0, shooterX = 0, shooterY = 0, deathY = 0;

    let st = 'off'; // off | ready | aim | fly | win | lose
    let grid = [];  // grid[i][j] = farba alebo -1
    let drop = 0;   // o koľko radov je strop spustený
    let shots = 0, shotsPerDrop = 8;
    let level = 1, score = 0, colors = 4;
    let cur = 0, next = 0, angle = Math.PI / 2, aiming = false;
    let fly = null;
    let falling = [], pops = [], t = 0, freezeT = 0, shake = 0;

    // ------------------------------------------------------------ rozmery
    function resize() {
      const rc = root.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      Wpx = Math.max(1, Math.floor(rc.width * dpr));
      Hpx = Math.max(1, Math.floor(rc.height * dpr));
      canvas.width = Wpx; canvas.height = Hpx;
      canvas.style.width = rc.width + 'px';
      canvas.style.height = rc.height + 'px';
      const hud = 64 * dpr;
      // šírka 8 bublín, výška 12 radov + priestor pre kanón
      r = Math.floor(Math.min((Wpx - 24 * dpr) / (COLS * 2 + 0.6), (Hpx - hud - 12 * dpr) / (DEATH * SQ3 + 7)));
      rowH = r * SQ3;
      boardW = COLS * 2 * r;
      left = Math.round((Wpx - boardW) / 2);
      const total = (DEATH * SQ3 + 7) * r;
      top = Math.round(hud + Math.max(4 * dpr, (Hpx - hud - total) / 2));
      deathY = top + DEATH * rowH + r * 0.2;
      shooterX = left + boardW / 2;
      shooterY = deathY + r * 3.4;
    }

    function cellX(i, j) { return left + r + j * 2 * r + (i % 2 ? r : 0); }
    function cellY(i) { return top + (i + drop) * rowH + r; }

    // ------------------------------------------------------------ úroveň
    function makeLevel() {
      colors = Math.min(6, 3 + Math.ceil(level / 2));
      const rows = Math.min(9, 4 + Math.ceil(level / 2));
      grid = [];
      for (let i = 0; i < ROWS; i++) grid.push(new Array(rowLen(i)).fill(-1));
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < rowLen(i); j++) {
          // zhluky rovnakých farieb, aby sa dalo dobre trafiť
          let c = R.randInt(0, colors - 1);
          if (Math.random() < 0.45) {
            const nb = neighbors(i, j).filter(([a, b]) => grid[a][b] >= 0);
            if (nb.length) { const [a, b] = nb[R.randInt(0, nb.length - 1)]; c = grid[a][b]; }
          }
          grid[i][j] = c;
        }
      }
      drop = 0; shots = 0;
      shotsPerDrop = Math.max(5, 9 - Math.floor(level / 2));
      falling = []; pops = []; fly = null; freezeT = 0;
      cur = pickColor(); next = pickColor();
    }

    function present() {
      const set = new Set();
      for (const row of grid) for (const c of row) if (c >= 0) set.add(c);
      return Array.from(set);
    }
    function pickColor() {
      const p = present();
      return p.length ? p[R.randInt(0, p.length - 1)] : R.randInt(0, colors - 1);
    }

    function start(keepScore) {
      if (!keepScore) { score = 0; level = 1; }
      makeLevel();
      hud();
      showPanel(null);
      st = 'aim';
      R.sound.sfx.start();
    }

    function hud() {
      hudLevel.textContent = 'Úroveň ' + level;
      hudScore.textContent = score.toLocaleString('sk-SK');
    }

    function showPanel(name) { for (const k in panels) panels[k].hidden = k !== name; }

    // ------------------------------------------------------------ streľba
    function shoot() {
      if (st !== 'aim') return;
      fly = { x: shooterX, y: shooterY, vx: Math.cos(angle), vy: -Math.sin(angle), c: cur };
      cur = next;
      next = pickColor();
      st = 'fly';
      R.sound.tone(500, 0.06, { to: 1200, vol: 0.5 });
    }

    function snap() {
      const f = fly;
      let best = null, bd = 1e9;
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < rowLen(i); j++) {
          if (grid[i][j] >= 0) continue;
          const attached = i === 0 || neighbors(i, j).some(([a, b]) => grid[a][b] >= 0);
          if (!attached) continue;
          const d = Math.hypot(cellX(i, j) - f.x, cellY(i) - f.y);
          if (d < bd) { bd = d; best = [i, j]; }
        }
      }
      fly = null;
      if (!best) { st = 'aim'; return; }
      const [i, j] = best;
      grid[i][j] = f.c;
      R.sound.tone(900, 0.02, { vol: 0.4 });
      // zhluk rovnakej farby
      const same = cluster(i, j, (a, b) => grid[a][b] === f.c);
      let gained = 0;
      if (same.length >= 3) {
        for (const [a, b] of same) {
          pops.push({ x: cellX(a, b), y: cellY(a), c: grid[a][b], t: 0 });
          grid[a][b] = -1;
        }
        gained += same.length * 10;
        // bubliny, ktoré už nič nedrží, spadnú
        const held = new Set();
        const stack = [];
        for (let b = 0; b < rowLen(0); b++) if (grid[0][b] >= 0) { stack.push([0, b]); held.add('0,' + b); }
        while (stack.length) {
          const [a, b] = stack.pop();
          for (const [x, y] of neighbors(a, b)) {
            const k = x + ',' + y;
            if (grid[x][y] >= 0 && !held.has(k)) { held.add(k); stack.push([x, y]); }
          }
        }
        let n = 0;
        for (let a = 0; a < grid.length; a++) for (let b = 0; b < rowLen(a); b++) {
          if (grid[a][b] >= 0 && !held.has(a + ',' + b)) {
            falling.push({ x: cellX(a, b), y: cellY(a), c: grid[a][b], vy: -r * 2 * Math.random(), vx: (Math.random() - 0.5) * r * 4 });
            grid[a][b] = -1;
            n++;
          }
        }
        gained += n * 20 * (n > 3 ? 2 : 1);
        R.sound.melody([['E6', 1], ['G6', 1], ['C7', 1]].slice(0, 1 + Math.min(2, Math.floor(same.length / 3))), { beat: 40 });
        if (n) R.sound.tone(1400, 0.25, { to: 300, vol: 0.45, at: 0.1 });
        R.haptics.buzz(15);
      }
      score += gained;
      shots++;
      if (shots % shotsPerDrop === 0) {
        drop++;
        shake = 0;
        R.sound.tone(120, 0.12, { vol: 0.9 });
        R.haptics.buzz(60);
      }
      hud();
      if (!present().length) return win();
      if (lowest() + drop >= DEATH) return lose();
      if (!present().includes(cur)) cur = pickColor();
      if (!present().includes(next)) next = pickColor();
      st = 'aim';
    }

    function cluster(i, j, ok) {
      const seen = new Set([i + ',' + j]);
      const out = [[i, j]];
      for (let k = 0; k < out.length; k++) {
        for (const [a, b] of neighbors(out[k][0], out[k][1])) {
          const key = a + ',' + b;
          if (!seen.has(key) && ok(a, b)) { seen.add(key); out.push([a, b]); }
        }
      }
      return out;
    }

    function lowest() {
      let lo = -1;
      for (let i = 0; i < grid.length; i++) if (grid[i].some((c) => c >= 0)) lo = i;
      return lo;
    }

    function win() {
      st = 'win';
      score += 500 + level * 100;
      hud();
      R.hi.submit('bubbles', score);
      panels.win.querySelector('[data-bb="winscore"]').textContent = score.toLocaleString('sk-SK');
      R.sound.melody([['C6', 1], ['E6', 1], ['G6', 1], ['C7', 2], ['G6', 1], ['C7', 4]], { beat: 90 });
      setTimeout(() => { if (st === 'win') showPanel('win'); }, 500);
    }

    function lose() {
      st = 'lose';
      freezeT = 0;
      R.hi.submit('bubbles', score);
      panels.lose.querySelector('[data-bb="losescore"]').textContent = score.toLocaleString('sk-SK');
      R.sound.sfx.gameOver();
      R.haptics.buzz([80, 60, 160]);
      setTimeout(() => { if (st === 'lose') showPanel('lose'); }, 1400);
    }

    // ------------------------------------------------------------ pohyb
    function update(dt) {
      t += dt;
      if (st === 'fly' && fly) {
        const speed = r * 46;
        let dist = speed * dt;
        const stepLen = r * 0.3;
        while (dist > 0 && fly) {
          const s = Math.min(stepLen, dist);
          dist -= s;
          fly.x += fly.vx * s;
          fly.y += fly.vy * s;
          if (fly.x < left + r) { fly.x = left + r; fly.vx = Math.abs(fly.vx); R.sound.tone(700, 0.01, { vol: 0.3 }); }
          if (fly.x > left + boardW - r) { fly.x = left + boardW - r; fly.vx = -Math.abs(fly.vx); R.sound.tone(700, 0.01, { vol: 0.3 }); }
          if (fly.y <= top + drop * rowH + r) { snap(); break; }
          let hitB = false;
          for (let i = 0; i < grid.length && !hitB; i++) {
            const y = cellY(i);
            if (Math.abs(y - fly.y) > 2 * r) continue;
            for (let j = 0; j < rowLen(i); j++) {
              if (grid[i][j] < 0) continue;
              if (Math.hypot(cellX(i, j) - fly.x, y - fly.y) < r * 1.75) { hitB = true; break; }
            }
          }
          if (hitB) { snap(); break; }
        }
      }
      for (let k = falling.length - 1; k >= 0; k--) {
        const f = falling[k];
        f.vy += r * 60 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y > Hpx + r * 2) { falling.splice(k, 1); }
      }
      for (let k = pops.length - 1; k >= 0; k--) { pops[k].t += dt; if (pops[k].t > 0.3) pops.splice(k, 1); }
      if (st === 'lose') freezeT += dt;
      // varovanie pred spustením stropu
      shake = (st === 'aim' || st === 'fly') && shotsPerDrop - (shots % shotsPerDrop) <= 1 ? Math.sin(t * 40) * r * 0.06 : 0;
    }

    // ------------------------------------------------------------ kreslenie
    function render() {
      const g = ctx;
      // pozadie – ľadová noc
      const bg = g.createLinearGradient(0, 0, 0, Hpx);
      bg.addColorStop(0, '#0d2340');
      bg.addColorStop(1, '#1d4f7a');
      g.fillStyle = bg;
      g.fillRect(0, 0, Wpx, Hpx);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let k = 0; k < 40; k++) {
        const x = ((k * 97.3 + t * 8 * (1 + (k % 3))) % Wpx);
        const y = ((k * 53.7 + t * 22 * (1 + (k % 4))) % Hpx);
        g.beginPath(); g.arc(x, y, (1 + (k % 3)) * dpr * 0.8, 0, Math.PI * 2); g.fill();
      }
      // hracia plocha
      const bx = left - r * 0.5, bw = boardW + r;
      g.fillStyle = 'rgba(190,230,255,0.12)';
      g.fillRect(bx, top, bw, shooterY + r * 2 - top);
      // ľadové steny
      const wall = g.createLinearGradient(0, 0, r * 0.5, 0);
      wall.addColorStop(0, '#e8f6ff'); wall.addColorStop(1, '#8cc4e8');
      g.fillStyle = wall;
      g.fillRect(bx - r * 0.35, top - r * 0.2, r * 0.35, shooterY + r * 2.2 - top);
      g.fillRect(bx + bw, top - r * 0.2, r * 0.35, shooterY + r * 2.2 - top);
      // strop (lis) – rastie so spúšťaním
      const ceilH = drop * rowH;
      const cg = g.createLinearGradient(0, top, 0, top + ceilH + r * 0.4);
      cg.addColorStop(0, '#5f7f9c'); cg.addColorStop(1, '#a9c7de');
      g.fillStyle = cg;
      g.fillRect(bx, top - r * 0.2 + shake, bw, ceilH + r * 0.2);
      g.fillStyle = '#d7ecfa';
      g.fillRect(bx, top + ceilH - r * 0.1 + shake, bw, r * 0.18);
      // čiara smrti
      g.strokeStyle = 'rgba(255,120,120,0.55)';
      g.setLineDash([r * 0.4, r * 0.3]);
      g.lineWidth = Math.max(1, dpr * 1.5);
      g.beginPath(); g.moveTo(bx, deathY); g.lineTo(bx + bw, deathY); g.stroke();
      g.setLineDash([]);

      // bubliny
      const size = Math.round(r * 2);
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < rowLen(i); j++) {
          const c = grid[i][j];
          if (c < 0) continue;
          const frozen = st === 'lose' && (i * 8 + j) * 0.03 < freezeT;
          g.drawImage(bubbleSprite(c, size, frozen), cellX(i, j) - r, cellY(i) - r + shake, size, size);
        }
      }
      for (const f of falling) g.drawImage(bubbleSprite(f.c, size, false), f.x - r, f.y - r, size, size);
      for (const p of pops) {
        const k = p.t / 0.3;
        g.globalAlpha = 1 - k;
        g.strokeStyle = PALETTE[p.c][0];
        g.lineWidth = r * 0.25 * (1 - k);
        g.beginPath(); g.arc(p.x, p.y, r * (1 + k * 0.8), 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }

      // mieridlo
      if (st === 'aim' || st === 'fly') {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        let x = shooterX, y = shooterY, vx = Math.cos(angle), vy = -Math.sin(angle);
        for (let k = 0; k < 26; k++) {
          x += vx * r * 0.9; y += vy * r * 0.9;
          if (x < left + r) { x = left + r; vx = -vx; }
          if (x > left + boardW - r) { x = left + boardW - r; vx = -vx; }
          if (y < top + drop * rowH + r) break;
          if (k % 2 === 0) { g.beginPath(); g.arc(x, y, r * 0.12, 0, Math.PI * 2); g.fill(); }
        }
      }
      // kanón
      g.save();
      g.translate(shooterX, shooterY);
      g.fillStyle = '#c9e6fa';
      g.beginPath(); g.arc(0, r * 0.9, r * 1.7, Math.PI, 0); g.fill();
      g.rotate(-angle + Math.PI / 2);
      const ag = g.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
      ag.addColorStop(0, '#5d84a6'); ag.addColorStop(0.5, '#e9f6ff'); ag.addColorStop(1, '#5d84a6');
      g.fillStyle = ag;
      g.beginPath();
      g.moveTo(-r * 0.45, 0); g.lineTo(-r * 0.3, -r * 2.6); g.lineTo(0, -r * 3.2); g.lineTo(r * 0.3, -r * 2.6); g.lineTo(r * 0.45, 0);
      g.closePath(); g.fill();
      g.restore();
      if (st !== 'lose') g.drawImage(bubbleSprite(cur, size, false), shooterX - r, shooterY - r, size, size);
      // ďalšia bublina
      const nx = shooterX + r * 3.4, ny = shooterY + r * 0.6;
      g.drawImage(bubbleSprite(next, Math.round(r * 1.4), false), nx - r * 0.7, ny - r * 0.7, r * 1.4, r * 1.4);
      g.fillStyle = 'rgba(220,240,255,0.8)';
      g.font = `700 ${Math.round(r * 0.55)}px Rubik, Arial, sans-serif`;
      g.textAlign = 'center';
      g.fillText('ďalšia', nx, ny + r * 1.35);
      // výstrely do spustenia stropu
      const leftShots = shotsPerDrop - (shots % shotsPerDrop);
      g.fillText('strop o ' + leftShots, shooterX - r * 3.6, ny + r * 1.35);
      for (let k = 0; k < leftShots; k++) {
        g.beginPath(); g.arc(shooterX - r * 3.6 + (k - (leftShots - 1) / 2) * r * 0.42, ny, r * 0.14, 0, Math.PI * 2); g.fill();
      }
      if (fly) g.drawImage(bubbleSprite(fly.c, size, false), fly.x - r, fly.y - r, size, size);
    }

    // ------------------------------------------------------------ ovládanie
    function aimAt(clientX, clientY) {
      const rc = canvas.getBoundingClientRect();
      const x = (clientX - rc.left) * dpr, y = (clientY - rc.top) * dpr;
      let a = Math.atan2(shooterY - y, x - shooterX);
      if (y > shooterY) a = x < shooterX ? Math.PI * 0.92 : Math.PI * 0.08;
      angle = R.clamp(a, Math.PI * 0.08, Math.PI * 0.92);
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound.unlock();
      if (st !== 'aim' && st !== 'fly') return;
      aiming = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nič */ }
      aimAt(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointermove', (e) => { if (aiming) aimAt(e.clientX, e.clientY); });
    canvas.addEventListener('pointerup', (e) => {
      if (!aiming) return;
      aiming = false;
      aimAt(e.clientX, e.clientY);
      shoot();
    });
    canvas.addEventListener('pointercancel', () => { aiming = false; });

    root.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', () => {
        R.sound.unlock();
        const a = el.dataset.act;
        if (a === 'menu') app.goMenu();
        else if (a === 'sound') { R.sound.toggle(); syncSound(); }
        else if (a === 'play' || a === 'retry') start(false);
        else if (a === 'next') { level++; start(true); }
      });
    });
    const soundBtn = root.querySelector('[data-act="sound"]');
    function syncSound() { soundBtn.setAttribute('aria-pressed', String(R.sound.on)); soundBtn.textContent = R.sound.on ? 'Zvuk zap.' : 'Zvuk vyp.'; }

    let keyTurn = 0;
    return {
      enter() {
        resize();
        level = 1; score = 0;
        makeLevel();
        hud();
        syncSound();
        st = 'ready';
        showPanel('start');
      },
      leave() { st = 'off'; aiming = false; keyTurn = 0; },
      pause() {},
      frame(dt) {
        const s = Math.min(dt, 50) / 1000;
        if (keyTurn && st === 'aim') angle = R.clamp(angle + keyTurn * 1.6 * s, Math.PI * 0.08, Math.PI * 0.92);
        update(s);
        render();
      },
      resize,
      get state() { return { st, level, score, drop, shots, bubbles: grid.reduce((n, row) => n + row.filter((c) => c >= 0).length, 0) }; },
      get world() { return { grid, angle, cur, shooterX, shooterY, cellX, cellY, rowLen, setAngle(a) { angle = a; }, shoot }; },
      keydown(e) {
        if (e.key === 'Escape' || e.key === 'Backspace') { app.goMenu(); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft') { keyTurn = 1; e.preventDefault(); }
        else if (e.key === 'ArrowRight') { keyTurn = -1; e.preventDefault(); }
        else if (e.key === ' ' || e.key === 'ArrowUp') { if (!e.repeat) shoot(); e.preventDefault(); }
        else if (e.key === 'Enter' && (st === 'ready' || st === 'lose')) start(false);
      },
      keyup(e) {
        if (e.key === 'ArrowLeft' && keyTurn > 0) keyTurn = 0;
        if (e.key === 'ArrowRight' && keyTurn < 0) keyTurn = 0;
      }
    };
  };

  R.drawBubblesPreview = function (ctx, w, h) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0d2340'); bg.addColorStop(1, '#1d4f7a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const r = w / 17;
    const rows = [[0, 0, 1, 1, 2, 2, 3, 3], [4, 0, 1, 5, 2, 3, 3], [4, 4, 1, 5, 5, 2, 0, 0], [1, 4, 2, 2, 5, 0, 1]];
    const size = Math.round(r * 2);
    rows.forEach((row, i) => row.forEach((c, j) => {
      ctx.drawImage(bubbleSprite(c, size, false), r * 0.5 + j * 2 * r + (i % 2 ? r : 0), r * 0.4 + i * r * SQ3, size, size);
    }));
    ctx.drawImage(bubbleSprite(3, size, false), w / 2 - r, h - r * 3, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(w / 2 + k * r * 0.5, h - r * 2 - k * r * 0.9, r * 0.15, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  };
})(window.Retro);
