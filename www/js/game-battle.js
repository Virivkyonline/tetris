/* Retro Hry – ARMÁDA: modrá armáda beží po moste, prechádza bránami (×2, ÷3, +15, −10),
   zbiera +1, strieľa šípy do sudov a bije sa s červenými hordami. */
'use strict';

(function (R) {
  const W = 5;            // polovica šírky mosta
  const MAXR = 230;       // koľko vojakov sa najviac kreslí
  const SPACING = 0.5;
  const GOLD = 2.39996;
  const CAM_BACK = 6;     // kamera je kúsok za armádou

  // ------------------------------------------------------------------ sprity vojakov
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  }
  function makeSoldier(team, frame) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 96;
    const g = c.getContext('2d');
    const P = team === 'blue' ? ['#9cc4ff', '#2f6fe8', '#163c9c'] : ['#ffa093', '#e2362b', '#8e140e'];
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath(); g.ellipse(32, 89, 19, 6, 0, 0, Math.PI * 2); g.fill();
    const lo = frame ? 5 : -5;
    g.fillStyle = P[2];
    rr(g, 21, 62 + Math.max(0, lo), 10, 25 - Math.abs(lo) * 0.4, 5);
    rr(g, 33, 62 + Math.max(0, -lo), 10, 25 - Math.abs(lo) * 0.4, 5);
    let gr = g.createRadialGradient(25, 44, 3, 32, 54, 26);
    gr.addColorStop(0, P[0]); gr.addColorStop(0.55, P[1]); gr.addColorStop(1, P[2]);
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(32, 52, 17, 20, 0, 0, Math.PI * 2); g.fill();
    // ruky
    g.fillStyle = P[1];
    g.beginPath(); g.ellipse(15, 52, 5, 11, 0.25, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(49, 50, 5, 11, -0.3, 0, Math.PI * 2); g.fill();
    // kopija
    g.strokeStyle = '#7a5a36'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(50, 64); g.lineTo(55, 6); g.stroke();
    g.fillStyle = '#d9dde3';
    g.beginPath(); g.moveTo(55, 0); g.lineTo(59, 10); g.lineTo(51, 10); g.closePath(); g.fill();
    // prilba
    gr = g.createRadialGradient(27, 20, 2, 32, 27, 15);
    gr.addColorStop(0, P[0]); gr.addColorStop(0.6, P[1]); gr.addColorStop(1, P[2]);
    g.fillStyle = gr;
    g.beginPath(); g.arc(32, 27, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = P[2];
    rr(g, 18, 31, 28, 5, 2.5);
    if (team === 'red') { // spredu: tmavý priezor
      g.fillStyle = 'rgba(50,6,4,0.7)';
      rr(g, 24, 24, 16, 6, 3);
    } else { // zozadu: chochol
      g.fillStyle = P[2];
      rr(g, 29, 12, 6, 16, 3);
    }
    return c;
  }
  let SPR = null;
  function sprites() {
    if (!SPR) SPR = { blue: [makeSoldier('blue', 0), makeSoldier('blue', 1)], red: [makeSoldier('red', 0), makeSoldier('red', 1)] };
    return SPR;
  }

  // ------------------------------------------------------------------ úroveň
  function opText(op) { return { '+': '+', '-': '−', 'x': '×', '/': '÷' }[op.k] + op.v; }
  function good(op) { return op.k === '+' || op.k === 'x'; }
  function apply(op, n) {
    if (op.k === '+') return n + op.v;
    if (op.k === '-') return Math.max(0, n - op.v);
    if (op.k === 'x') return Math.min(9999, n * op.v);
    return Math.floor(n / op.v);
  }

  function makeLevel(L) {
    const items = { gates: [], pads: [], barrels: [], squads: [] };
    let z = 26;
    let best = 12; // koľko vojakov sa dá najviac mať pri dobrých voľbách (odhad)
    const N = 5 + L;
    for (let i = 0; i < N; i++) {
      const kind = i % 3;
      if (kind === 0) {
        const goods = [
          { k: '+', v: R.randInt(6, 12) + L * 3 },
          { k: 'x', v: 2 },
          { k: '+', v: R.randInt(15, 25) + L * 4 }
        ];
        if (L >= 3) goods.push({ k: 'x', v: 3 });
        const bads = [
          { k: '-', v: R.randInt(5, 12) + L * 2 },
          { k: '/', v: R.randInt(2, 3) },
          { k: '/', v: R.randInt(4, 7) }
        ];
        const g1 = goods[R.randInt(0, goods.length - 1)];
        let other = Math.random() < 0.65 ? bads[R.randInt(0, bads.length - 1)] : goods[R.randInt(0, goods.length - 1)];
        if (other === g1) other = bads[0];
        const ops = Math.random() < 0.5 ? [g1, other] : [other, g1];
        items.gates.push({ z, ops, passed: false, fade: 0 });
        best = Math.max(apply(ops[0], best), apply(ops[1], best));
        z += 22;
      } else if (kind === 1) {
        const side = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 10; k++) items.pads.push({ z: z + k * 1.5, x: side * (W - 0.8), taken: false });
        const hp = R.randInt(8, 14) + L * 3;
        const reward = Math.round(10 + best * 0.25);
        items.barrels.push({ z: z + 14, x: -side * 2.5, hp, max: hp, reward, alive: true, hit: 0 });
        best += 10 + reward;
        z += 26;
      } else {
        const n = Math.max(8, Math.round(best * (0.5 + Math.random() * 0.25)));
        items.squads.push(newSquad(z + 6, (Math.random() - 0.5) * 4, n));
        best = Math.max(4, best - Math.round(n * 0.75));
        z += 28;
      }
    }
    const boss = Math.max(15, Math.round(best * 0.9));
    items.squads.push(newSquad(z + 10, 0, boss, true));
    return { items, end: z + 26, startN: 10 + Math.min(20, L * 2) };
  }

  function newSquad(z, x, n, boss) {
    return { z, x, n, units: [], state: 'idle', boss: !!boss };
  }

  function formation(i) {
    const r = SPACING * Math.sqrt(i + 0.3);
    const a = i * GOLD;
    return [r * Math.cos(a), r * Math.sin(a) * 0.85];
  }
  function radius(n) { return SPACING * Math.sqrt(Math.min(n, MAXR) + 0.3) + 0.45; }

  // ------------------------------------------------------------------ hra
  R.BattleGame = function (root, app) {
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const hudLevel = root.querySelector('[data-bt="level"]');
    const bar = root.querySelector('[data-bt="bar"]');
    const panels = {
      start: root.querySelector('[data-panel="start"]'),
      win: root.querySelector('[data-panel="win"]'),
      lose: root.querySelector('[data-panel="lose"]')
    };
    let dpr = 1, Wpx = 1, Hpx = 1, F = 1, cx = 0, cy = 0;
    const cam = { z: 0, h: 15, a: 0.8 };
    let ca = Math.cos(cam.a), sa = Math.sin(cam.a);

    let level = Math.max(1, R.store.get('battle.level', 1));
    let st = 'off'; // off | ready | run | win | lose
    let lv = null, items = null;
    const crowd = { x: 0, tx: 0, z: 0, n: 10, units: [], fight: null, fireAcc: 0 };
    let arrows = [], parts = [], floats = [];
    let t = 0, keyDir = 0, sndAcc = 0;

    // ------------------------------------------------------------ projekcia
    function proj(x, y, z) {
      const dz = z - cam.z, dy = y - cam.h;
      const zc = dz * ca - dy * sa;
      const yc = dy * ca + dz * sa;
      return { x: cx + F * x / zc, y: cy - F * yc / zc, s: F / zc, zc };
    }

    function resize() {
      const r = root.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      Wpx = Math.max(1, Math.floor(r.width * dpr));
      Hpx = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = Wpx; canvas.height = Hpx;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      F = Math.min(Wpx * 1.32, Hpx * 0.9);
      cx = Wpx / 2;
      cy = Hpx * 0.4;
    }

    // ------------------------------------------------------------ armáda
    function syncUnits(group, n, team, center) {
      const want = Math.min(n, team === 'blue' ? MAXR : 170);
      while (group.units.length < want) {
        const i = group.units.length;
        group.units.push({ x: center.x, z: center.z, i, ph: Math.random() * 6 });
      }
      while (group.units.length > want) {
        const u = group.units.pop();
        puff(u.x, u.z, team === 'blue' ? '#4a86f0' : '#e2483c');
      }
    }

    function setCount(n) {
      crowd.n = Math.max(0, Math.min(9999, Math.round(n)));
      syncUnits(crowd, crowd.n, 'blue', crowd);
    }

    function puff(x, z, color) {
      if (parts.length > 260) return;
      parts.push({ x, z, y: 0.5, t: 0, life: 0.45, color, kind: 'puff', vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2 });
    }
    function boom(x, z, n, color) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
        parts.push({ x, z, y: 0.8, t: 0, life: 0.5 + Math.random() * 0.4, color: color || (Math.random() < 0.5 ? '#ffd23f' : '#ff8c1a'), kind: 'spark', vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3 + Math.random() * 5 });
      }
    }
    function floatText(text, x, z, color) { floats.push({ text, x, z, t: 0, color }); }

    // ------------------------------------------------------------ priebeh
    function startLevel() {
      lv = makeLevel(level);
      items = lv.items;
      crowd.x = 0; crowd.tx = 0; crowd.z = 0; crowd.units = []; crowd.fight = null; crowd.fireAcc = 0;
      arrows = []; parts = []; floats = [];
      setCount(lv.startN);
      for (const s of items.squads) syncUnits(s, s.n, 'red', s);
      cam.z = crowd.z - CAM_BACK;
      hudLevel.textContent = 'Úroveň ' + level;
      showPanel(null);
      st = 'run';
      R.sound.sfx.start();
    }

    function showPanel(name) {
      for (const k in panels) panels[k].hidden = k !== name;
      if (name === 'start') panels.start.querySelector('[data-bt="startlevel"]').textContent = 'Úroveň ' + level;
    }

    function speed() { return Math.min(11, 7.2 + level * 0.3); }

    function update(dt) {
      t += dt;
      if (st !== 'run') { tickParticles(dt); return; }
      const R0 = radius(crowd.n);
      // riadenie
      if (keyDir) crowd.tx += keyDir * 9 * dt;
      const lim = Math.max(0, W - R0);
      crowd.tx = R.clamp(crowd.tx, -lim, lim);
      crowd.x += (crowd.tx - crowd.x) * Math.min(1, dt * 12);

      // boj zastaví pochod
      if (!crowd.fight) crowd.z += speed() * dt;
      cam.z += (crowd.z - CAM_BACK - cam.z) * Math.min(1, dt * 6);

      // brány
      for (const g of items.gates) {
        if (g.passed) { g.fade = Math.min(1, g.fade + dt * 3); continue; }
        if (crowd.z >= g.z) {
          g.passed = true;
          const side = crowd.x < 0 ? 0 : 1;
          const op = g.ops[side];
          const before = crowd.n;
          setCount(apply(op, crowd.n));
          floatText(opText(op), crowd.x, crowd.z + 1, good(op) ? '#7fd0ff' : '#ff8a80');
          if (good(op)) R.sound.melody([['C6', 1], ['E6', 1], ['G6', 2]], { beat: 45 });
          else { R.sound.tone(220, 0.18, { to: 110, vol: 0.8 }); R.haptics.buzz(60); }
          if (crowd.n <= 0 && before > 0) return lose();
        }
      }
      // +1
      for (const p of items.pads) {
        if (p.taken || crowd.z < p.z) continue;
        if (crowd.z - p.z > 3) { p.taken = true; p.missed = true; continue; }
        if (Math.abs(p.x - crowd.x) < R0 + 0.6) {
          p.taken = true;
          setCount(crowd.n + 1);
          R.sound.tone(1500 + (crowd.n % 5) * 120, 0.03, { vol: 0.35 });
        }
      }
      // sudy
      for (const b of items.barrels) {
        if (!b.alive) continue;
        if (b.hit > 0) b.hit -= dt;
        if (crowd.z + R0 * 0.8 >= b.z - 0.6 && crowd.z < b.z + 1.5 && Math.abs(b.x - crowd.x) < R0 + 0.7) {
          b.alive = false;
          boom(b.x, b.z, 26);
          const loss = Math.min(crowd.n, b.hp);
          setCount(crowd.n - loss);
          floatText('−' + loss, crowd.x, crowd.z + 1, '#ff8a80');
          R.sound.sfx.crash();
          R.haptics.buzz(120);
          if (crowd.n <= 0) return lose();
        } else if (b.z < crowd.z - 2) b.alive = false;
      }
      // hordy
      for (const s of items.squads) {
        if (s.n <= 0) continue;
        const Rs = radius(s.n);
        const gap = s.z - crowd.z;
        if (s.state === 'idle' && gap < 15 + Rs) s.state = 'charge';
        if (s.state === 'charge') {
          s.z -= 4 * dt;
          s.x += R.clamp(crowd.x - s.x, -1, 1) * 3 * dt;
          s.x = R.clamp(s.x, -Math.max(0, W - Rs), Math.max(0, W - Rs));
          if (s.z - crowd.z < (Rs + R0) * 0.75) {
            s.state = 'fight';
            crowd.fight = { s, acc: 0 };
          }
        }
        syncUnits(s, s.n, 'red', s);
      }
      if (crowd.fight) {
        const f = crowd.fight, s = f.s;
        f.acc += dt;
        s.z += ((crowd.z + (radius(s.n) + R0) * 0.5) - s.z) * Math.min(1, dt * 3);
        while (f.acc >= 0.045 && s.n > 0 && crowd.n > 0) {
          f.acc -= 0.045;
          const k = Math.max(1, Math.round(Math.min(s.n, crowd.n) / 14));
          const kk = Math.min(k, s.n, crowd.n);
          s.n -= kk;
          setCount(crowd.n - kk);
          syncUnits(s, s.n, 'red', s);
          sndAcc += 1;
          if (sndAcc % 2 === 0) R.sound.tone(140 + Math.random() * 300, 0.02, { vol: 0.45 });
        }
        if (crowd.n <= 0) return lose();
        if (s.n <= 0) {
          crowd.fight = null;
          s.state = 'dead';
          if (s.boss) floatText('Horda porazená!', crowd.x, crowd.z + 2, '#fff1a8');
          R.haptics.buzz(40);
        }
      }

      // šípy
      fire(dt, R0);
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        a.t += dt;
        if (a.t >= a.dur) {
          arrows.splice(i, 1);
          const tg = a.target;
          if (tg.hp !== undefined) {
            if (tg.alive) {
              tg.hp--; tg.hit = 0.08;
              if (tg.hp <= 0) {
                tg.alive = false;
                boom(tg.x, tg.z, 30);
                setCount(crowd.n + tg.reward);
                floatText('+' + tg.reward, tg.x, tg.z, '#ffe27a');
                R.sound.sfx.bonus();
              }
            }
          } else if (tg.n > 0 && Math.random() < 0.55) {
            tg.n--;
            syncUnits(tg, tg.n, 'red', tg);
            if (tg.n <= 0) { tg.state = 'dead'; if (crowd.fight && crowd.fight.s === tg) crowd.fight = null; }
          }
        }
      }

      // vojaci sa zoraďujú
      moveUnits(crowd, dt, 1);
      for (const s of items.squads) if (s.n > 0) moveUnits(s, dt, -1);
      tickParticles(dt);

      bar.style.transform = `scaleX(${R.clamp(crowd.z / lv.end, 0, 1)})`;
      if (crowd.z >= lv.end && !crowd.fight) win();
    }

    function fire(dt, R0) {
      const rate = Math.min(16, 2 + crowd.n / 6);
      crowd.fireAcc += dt * rate;
      if (crowd.fireAcc < 1) return;
      // najbližší cieľ pred armádou
      let best = null, bestZ = 1e9;
      for (const b of items.barrels) {
        if (!b.alive) continue;
        const dz = b.z - crowd.z;
        if (dz > R0 * 0.5 && dz < 28 && Math.abs(b.x - crowd.x) < R0 + 1.4 && dz < bestZ) { best = b; bestZ = dz; }
      }
      for (const s of items.squads) {
        if (s.n <= 0) continue;
        const dz = s.z - crowd.z;
        if (dz > 0 && dz < 24 && Math.abs(s.x - crowd.x) < R0 + radius(s.n) && dz < bestZ) { best = s; bestZ = dz; }
      }
      if (!best) { crowd.fireAcc = Math.min(crowd.fireAcc, 1); return; }
      while (crowd.fireAcc >= 1) {
        crowd.fireAcc -= 1;
        if (arrows.length > 90) break;
        const u = crowd.units[R.randInt(0, crowd.units.length - 1)];
        if (!u) break;
        let tx = best.x, tz = best.z;
        if (best.units && best.units.length) { const v = best.units[R.randInt(0, best.units.length - 1)]; tx = v.x; tz = v.z; }
        const dist = Math.hypot(tx - u.x, tz - u.z);
        arrows.push({ x0: u.x, z0: u.z, x1: tx, z1: tz, t: 0, dur: Math.max(0.12, dist / 34), target: best });
      }
      if (t - (fire.last || 0) > 0.07) { fire.last = t; R.sound.tone(2600, 0.008, { vol: 0.18 }); }
    }

    function moveUnits(g, dt, dir) {
      const k = Math.min(1, dt * 7);
      // veľká armáda sa na úzkom moste natiahne do dĺžky
      const Rr = radius(g.n);
      const sq = Rr > W - 0.3 ? (W - 0.3) / Rr : 1;
      for (const u of g.units) {
        const [ox, oz] = formation(u.i);
        u.x += (g.x + ox * sq - u.x) * k;
        u.z += (g.z + (oz / sq) * dir - u.z) * k;
        u.ph += dt * 10;
      }
    }

    function tickParticles(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.x += (p.vx || 0) * dt;
        p.z += (p.vz || 0) * dt;
        p.y += p.vy * dt;
        p.vy -= 12 * dt;
        if (p.y < 0) { p.y = 0; p.vy = 0; }
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].t += dt;
        if (floats[i].t > 1.2) floats.splice(i, 1);
      }
    }

    function lose() {
      st = 'lose';
      crowd.fight = null;
      R.sound.sfx.gameOver();
      R.haptics.buzz([80, 60, 160]);
      panels.lose.querySelector('[data-bt="loselevel"]').textContent = 'Úroveň ' + level;
      setTimeout(() => { if (st === 'lose') showPanel('lose'); }, 700);
    }

    function win() {
      st = 'win';
      R.hi.submit('battle', level);
      panels.win.querySelector('[data-bt="wincount"]').textContent = crowd.n;
      panels.win.querySelector('[data-bt="winlevel"]').textContent = 'Úroveň ' + level + ' hotová';
      level++;
      R.store.set('battle.level', level);
      R.sound.melody([['C6', 1], ['E6', 1], ['G6', 1], ['C7', 2], ['G6', 1], ['C7', 4]], { beat: 90 });
      boom(crowd.x, crowd.z + 2, 40, '#7fd0ff');
      setTimeout(() => { if (st === 'win') showPanel('win'); }, 600);
    }

    // ------------------------------------------------------------ kreslenie
    function poly(pts, fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    function drawWorld() {
      // voda
      const gw = ctx.createLinearGradient(0, 0, 0, Hpx);
      gw.addColorStop(0, '#1f6e8c');
      gw.addColorStop(1, '#2b93b3');
      ctx.fillStyle = gw;
      ctx.fillRect(0, 0, Wpx, Hpx);
      const zNear = cam.z - 6, zFar = cam.z + 75;
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.lineWidth = Math.max(1, dpr * 1.2);
      ctx.beginPath();
      for (let z = Math.ceil(zNear / 4) * 4; z < zFar; z += 4) {
        const off = ((z * 7.3) % 5);
        for (const side of [-1, 1]) {
          const a = proj(side * (W + 3 + off), 0, z), b = proj(side * (W + 6 + off), 0, z);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
      }
      ctx.stroke();
      // most – bočné steny (vonkajšia stena do vody)
      for (const side of [-1, 1]) {
        const x0 = side * (W + 1.1), x1 = side * W;
        poly([proj(x0, -1.6, zNear), proj(x0, -1.6, zFar), proj(x0, 0.6, zFar), proj(x0, 0.6, zNear)], '#7f735f');
        poly([proj(x0, 0.6, zNear), proj(x0, 0.6, zFar), proj(x1, 0.6, zFar), proj(x1, 0.6, zNear)], '#b3a586');
        poly([proj(x1, 0.6, zNear), proj(x1, 0.6, zFar), proj(x1, 0, zFar), proj(x1, 0, zNear)], '#948669');
      }
      // dlažba
      poly([proj(-W, 0, zNear), proj(-W, 0, zFar), proj(W, 0, zFar), proj(W, 0, zNear)], '#dccdac');
      ctx.fillStyle = 'rgba(120,96,60,0.10)';
      const z0 = Math.floor(zNear / 1.6) * 1.6;
      for (let z = z0; z < zFar; z += 1.6) {
        const row = Math.round(z / 1.6);
        for (let c = 0; c < 5; c++) {
          if (((row * 31 + c * 17) % 7) > 2) continue;
          const xa = -W + c * 2 + (row % 2 ? 1 : 0);
          const xb = Math.min(W, xa + 2);
          const xa2 = Math.max(-W, xa);
          const q = [proj(xa2, 0, z), proj(xb, 0, z), proj(xb, 0, z + 1.6), proj(xa2, 0, z + 1.6)];
          ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y); ctx.closePath(); ctx.fill();
        }
      }
      ctx.strokeStyle = 'rgba(140,116,80,0.38)';
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      for (let z = z0; z < zFar; z += 1.6) {
        const a = proj(-W, 0, z), b = proj(W, 0, z);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        const row = Math.round(z / 1.6);
        for (let x = -W + (row % 2 ? 1 : 2); x < W; x += 2) {
          const p = proj(x, 0, z), q = proj(x, 0, z + 1.6);
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        }
      }
      ctx.stroke();
      // cieľ
      if (lv) {
        const zf = lv.end;
        if (zf > zNear && zf < zFar) {
          for (let c = 0; c < 10; c++) for (let r = 0; r < 2; r++) {
            const xa = -W + c, za = zf + r * 0.8;
            poly([proj(xa, 0.01, za), proj(xa + 1, 0.01, za), proj(xa + 1, 0.01, za + 0.8), proj(xa, 0.01, za + 0.8)], (c + r) % 2 ? '#222' : '#f6f6f6');
          }
        }
      }
    }

    function drawPad(p) {
      const a = proj(p.x - 0.7, 0.02, p.z - 0.6), b = proj(p.x + 0.7, 0.02, p.z - 0.6);
      const c = proj(p.x + 0.7, 0.02, p.z + 0.6), d = proj(p.x - 0.7, 0.02, p.z + 0.6);
      const used = p.taken && !p.missed;
      poly([a, b, c, d], used ? 'rgba(47,111,232,0.25)' : '#2f6fe8');
      if (used) return;
      const m = proj(p.x, 0.02, p.z);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(m.s * 0.9)}px Rubik, Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+1', m.x, m.y);
    }

    function drawGate(g) {
      const alpha = 1 - g.fade;
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      for (let s = 0; s < 2; s++) {
        const x0 = s ? 0.05 : -W, x1 = s ? W : -0.05;
        const op = g.ops[s];
        const col = good(op) ? 'rgba(52,150,255,0.82)' : 'rgba(235,64,52,0.82)';
        const bl = proj(x0, 0, g.z), br = proj(x1, 0, g.z), tr = proj(x1, 2.4, g.z), tl = proj(x0, 2.4, g.z);
        poly([bl, br, tr, tl], col);
        ctx.strokeStyle = good(op) ? '#1b5fc7' : '#a8221a';
        ctx.lineWidth = Math.max(2, bl.s * 0.14);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(tl.x, tl.y); ctx.closePath(); ctx.stroke();
        const m = proj((x0 + x1) / 2, 1.2, g.z);
        ctx.font = `800 ${Math.round(m.s * 1.45)}px Rubik, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, m.s * 0.12);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeText(opText(op), m.x, m.y);
        ctx.fillStyle = '#fff';
        ctx.fillText(opText(op), m.x, m.y);
      }
      ctx.globalAlpha = 1;
    }

    function drawBarrel(b) {
      const p = proj(b.x, 0, b.z);
      const w = p.s * 1.5, h = p.s * 1.7;
      const shake = b.hit > 0 ? (Math.random() - 0.5) * p.s * 0.15 : 0;
      const x = p.x + shake, y = p.y;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.6, w * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      gr.addColorStop(0, '#8a5a2b'); gr.addColorStop(0.45, '#c98b47'); gr.addColorStop(1, '#6e4520');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h * 0.08);
      ctx.quadraticCurveTo(x - w * 0.62, y - h / 2, x - w / 2, y - h * 0.92);
      ctx.lineTo(x + w / 2, y - h * 0.92);
      ctx.quadraticCurveTo(x + w * 0.62, y - h / 2, x + w / 2, y - h * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a4a50';
      ctx.fillRect(x - w * 0.56, y - h * 0.3, w * 1.12, h * 0.07);
      ctx.fillRect(x - w * 0.56, y - h * 0.72, w * 1.12, h * 0.07);
      ctx.fillStyle = '#d9a35c';
      ctx.beginPath(); ctx.ellipse(x, y - h * 0.92, w / 2, w * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      // číslo
      ctx.font = `800 ${Math.round(p.s * 0.95)}px Rubik, Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, p.s * 0.12);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(String(b.hp), x, y - h * 0.5);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(b.hp), x, y - h * 0.5);
      ctx.font = `800 ${Math.round(p.s * 0.6)}px Rubik, Arial, sans-serif`;
      ctx.fillStyle = '#ffe27a';
      ctx.strokeText('+' + b.reward, x, y - h * 1.18);
      ctx.fillText('+' + b.reward, x, y - h * 1.18);
    }

    function drawUnit(u, team) {
      const p = proj(u.x, 0, u.z);
      if (p.zc < 0.5) return;
      const h = p.s * 1.45, w = h * (64 / 96);
      const fr = SPR[team][(Math.floor(u.ph) & 1)];
      const bob = Math.abs(Math.sin(u.ph * 0.5)) * h * 0.04;
      ctx.drawImage(fr, p.x - w / 2, p.y - h * 0.94 - bob, w, h);
    }

    function badge(x, z, n, color) {
      const p = proj(x, 2.3, z);
      const fs = Math.max(12 * dpr, Math.round(p.s * 0.85));
      ctx.font = `800 ${fs}px Rubik, Arial, sans-serif`;
      const txt = String(n);
      const tw = ctx.measureText(txt).width;
      const bw = tw + fs * 0.8, bh = fs * 1.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.x - bw / 2, p.y - bh / 2, bw, bh, bh / 3);
      else ctx.rect(p.x - bw / 2, p.y - bh / 2, bw, bh);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, p.x, p.y + fs * 0.04);
    }

    function render() {
      sprites();
      drawWorld();
      if (!items) return;
      const zNear = cam.z - 6, zFar = cam.z + 75;
      for (const p of items.pads) if (p.z > zNear && p.z < zFar) drawPad(p);
      // objekty od najvzdialenejších
      const list = [];
      for (const g of items.gates) if (g.z > zNear && g.z < zFar && g.fade < 1) list.push({ z: g.z + 0.01, f: () => drawGate(g) });
      for (const b of items.barrels) if (b.alive && b.z > zNear && b.z < zFar) list.push({ z: b.z, f: () => drawBarrel(b) });
      for (const s of items.squads) {
        if (s.n <= 0 || s.z > zFar + 10) continue;
        for (const u of s.units) list.push({ z: u.z, f: () => drawUnit(u, 'red') });
      }
      for (const u of crowd.units) list.push({ z: u.z, f: () => drawUnit(u, 'blue') });
      list.sort((a, b) => b.z - a.z);
      for (const o of list) o.f();
      // šípy
      ctx.lineCap = 'round';
      for (const a of arrows) {
        const k = a.t / a.dur;
        const x = a.x0 + (a.x1 - a.x0) * k, z = a.z0 + (a.z1 - a.z0) * k;
        const y = 0.9 + Math.sin(k * Math.PI) * 1.6;
        const k2 = Math.max(0, k - 0.12);
        const x2 = a.x0 + (a.x1 - a.x0) * k2, z2 = a.z0 + (a.z1 - a.z0) * k2;
        const y2 = 0.9 + Math.sin(k2 * Math.PI) * 1.6;
        const p = proj(x, y, z), q = proj(x2, y2, z2);
        ctx.strokeStyle = 'rgba(255,214,90,0.55)';
        ctx.lineWidth = Math.max(1.5, p.s * 0.12);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.strokeStyle = '#fff6d6';
        ctx.lineWidth = Math.max(1, p.s * 0.05);
        ctx.beginPath(); ctx.moveTo((p.x + q.x) / 2, (p.y + q.y) / 2); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      // čiastočky
      for (const p of parts) {
        const pp = proj(p.x, p.y, p.z);
        const k = p.t / p.life;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.color;
        const r = p.kind === 'puff' ? pp.s * (0.15 + k * 0.3) : pp.s * 0.16;
        ctx.beginPath(); ctx.arc(pp.x, pp.y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // počty
      for (const s of items.squads) if (s.n > 0 && s.z < zFar) badge(s.x, s.z, s.n, '#d7352b');
      if (crowd.n > 0) badge(crowd.x, crowd.z, crowd.n, '#2f6fe8');
      for (const f of floats) {
        const p = proj(f.x, 2.8 + f.t * 2.2, f.z);
        ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
        ctx.font = `800 ${Math.round(p.s * 1.1)}px Rubik, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, p.s * 0.12);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeText(f.text, p.x, p.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------ ovládanie
    let drag = null;
    function pxPerUnit() {
      const p = proj(crowd.x, 0, crowd.z);
      return p.s / dpr;
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound.unlock();
      drag = { id: e.pointerId, x: e.clientX };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nič */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      if (st === 'run') crowd.tx += dx / pxPerUnit() * 1.15;
    });
    const endDrag = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    root.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', () => {
        R.sound.unlock();
        const a = el.dataset.act;
        if (a === 'menu') app.goMenu();
        else if (a === 'sound') { R.sound.toggle(); syncSound(); }
        else if (a === 'play' || a === 'next' || a === 'retry') startLevel();
      });
    });
    const soundBtn = root.querySelector('[data-act="sound"]');
    function syncSound() { soundBtn.setAttribute('aria-pressed', String(R.sound.on)); soundBtn.textContent = R.sound.on ? 'Zvuk zap.' : 'Zvuk vyp.'; }

    // ukážková scéna pred začiatkom
    function demoScene() {
      lv = makeLevel(level);
      items = lv.items;
      crowd.x = 0; crowd.tx = 0; crowd.z = 0; crowd.units = []; crowd.fight = null;
      arrows = []; parts = []; floats = [];
      setCount(lv.startN);
      for (const s of items.squads) syncUnits(s, s.n, 'red', s);
      for (let i = 0; i < 40; i++) { moveUnits(crowd, 0.05, 1); for (const s of items.squads) moveUnits(s, 0.05, -1); }
      cam.z = crowd.z - CAM_BACK;
      bar.style.transform = 'scaleX(0)';
    }

    return {
      enter() {
        resize();
        level = Math.max(1, R.store.get('battle.level', 1));
        hudLevel.textContent = 'Úroveň ' + level;
        demoScene();
        st = 'ready';
        syncSound();
        showPanel('start');
      },
      leave() { st = 'off'; drag = null; keyDir = 0; },
      pause() {},
      frame(dt) { update(Math.min(dt, 50) / 1000); render(); },
      resize,
      get state() { return { st, level, n: crowd.n, z: crowd.z, end: lv && lv.end }; },
      get world() { return { items, crowd }; },
      keydown(e) {
        if (e.key === 'Escape' || e.key === 'Backspace') { app.goMenu(); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'a') { keyDir = -1; e.preventDefault(); }
        else if (e.key === 'ArrowRight' || e.key === 'd') { keyDir = 1; e.preventDefault(); }
        else if (e.key === 'Enter' && st !== 'run') startLevel();
      },
      keyup(e) {
        if ((e.key === 'ArrowLeft' || e.key === 'a') && keyDir < 0) keyDir = 0;
        if ((e.key === 'ArrowRight' || e.key === 'd') && keyDir > 0) keyDir = 0;
      }
    };
  };

  // náhľad do menu
  R.drawBattlePreview = function (ctx, w, h, t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f6e8c'); g.addColorStop(1, '#2b93b3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b3a586';
    ctx.beginPath(); ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.7, 0); ctx.lineTo(w * 0.98, h); ctx.lineTo(w * 0.02, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dccdac';
    ctx.beginPath(); ctx.moveTo(w * 0.34, 0); ctx.lineTo(w * 0.66, 0); ctx.lineTo(w * 0.9, h); ctx.lineTo(w * 0.1, h); ctx.closePath(); ctx.fill();
    // brány
    const gy = h * 0.32;
    ctx.fillStyle = 'rgba(52,150,255,0.9)'; ctx.fillRect(w * 0.27, gy - h * 0.14, w * 0.23, h * 0.14);
    ctx.fillStyle = 'rgba(235,64,52,0.9)'; ctx.fillRect(w * 0.5, gy - h * 0.14, w * 0.23, h * 0.14);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(h * 0.11)}px Rubik, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×2', w * 0.385, gy - h * 0.07);
    ctx.fillText('÷3', w * 0.615, gy - h * 0.07);
    // armády
    const sp = sprites();
    for (let i = 0; i < 14; i++) {
      const r = 0.035 * Math.sqrt(i + 0.3) * w, a = i * GOLD;
      const x = w * 0.42 + r * Math.cos(a) * 1.4, y = h * 0.78 + r * Math.sin(a) * 0.7;
      ctx.drawImage(sp.blue[(Math.floor(t / 180) + i) & 1], x - w * 0.045, y - h * 0.12, w * 0.09, h * 0.135);
    }
    for (let i = 0; i < 10; i++) {
      const x = w * 0.42 + ((i % 5) - 2) * w * 0.05, y = h * 0.06 + Math.floor(i / 5) * h * 0.05;
      ctx.drawImage(sp.red[0], x - w * 0.025, y, w * 0.05, h * 0.075);
    }
    ctx.restore();
  };
})(window.Retro);
