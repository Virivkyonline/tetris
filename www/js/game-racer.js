/* Retro Hry – FORMULKY: LCD pretekárska hra s cestou do diaľky (pohľad zozadu).
   Farebná potlač (obloha, hory, tráva, cesta) + čierne segmenty áut a obrubníkov. */
'use strict';

(function (R) {
  const G = R.geo;
  const LW = 400, LH = 300;
  const H0 = 112, YB = 300, CX = 200;
  const DEPTH_Y = [127, 143, 166, 198, 242, 297]; // spodok auta pre hĺbku 0..4, 5 = hráč
  const DIG = { x: 292, y: 9, w: 19, h: 31, gap: 6, mid: 7 };

  function hw(y) { return 10 + (y - H0) / (YB - H0) * 166; }
  function laneX(lane, y) { return CX + (lane - 1) * (2 * hw(y) / 3); }

  // formula zozadu: kolesá, krídlo, telo, prilba
  function car(ctx, x, y, s) {
    G.rect(ctx, x - s, y - 0.64 * s, 0.42 * s, 0.64 * s);
    G.rect(ctx, x + 0.58 * s, y - 0.64 * s, 0.42 * s, 0.64 * s);
    G.rect(ctx, x - 0.82 * s, y - 1.04 * s, 1.64 * s, 0.17 * s);
    G.rect(ctx, x - 0.36 * s, y - 0.92 * s, 0.1 * s, 0.2 * s);
    G.rect(ctx, x + 0.26 * s, y - 0.92 * s, 0.1 * s, 0.2 * s);
    G.poly(ctx, [[x - 0.5 * s, y - 0.1 * s], [x + 0.5 * s, y - 0.1 * s], [x + 0.3 * s, y - 0.74 * s], [x - 0.3 * s, y - 0.74 * s]]);
    G.rect(ctx, x - 0.56 * s, y - 0.14 * s, 1.12 * s, 0.14 * s);
    G.circle(ctx, x, y - 0.8 * s, 0.17 * s);
  }
  function carAt(ctx, lane, d) {
    const y = DEPTH_Y[d];
    const s = (2 * hw(y) / 3) * 0.36;
    car(ctx, laneX(lane, y), y - 1, s);
  }
  function boom(ctx, lane) {
    const y = DEPTH_Y[5] - 26, x = laneX(lane, DEPTH_Y[5]);
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 18 : 40;
      pts.push([x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 0.8]);
    }
    G.poly(ctx, pts);
  }

  // obrubníky pozdĺž okrajov cesty (dve fázy striedavo = pocit rýchlosti)
  const CURB_N = 10;
  function curbY(i) { return H0 + (YB - H0) * Math.pow(i / CURB_N, 1.55); }
  function curbs(ctx, phase) {
    for (let i = phase; i < CURB_N; i += 2) {
      const y1 = curbY(i), y2 = curbY(i + 1);
      const t1 = 1.5 + (y1 - H0) * 0.06, t2 = 1.5 + (y2 - H0) * 0.06;
      for (const side of [-1, 1]) {
        const a1 = CX + side * hw(y1), a2 = CX + side * hw(y2);
        G.poly(ctx, [[a1, y1], [a2, y2], [a2 + side * t2 * 2.2, y2], [a1 + side * t1 * 2.2, y1]]);
      }
    }
  }
  function lifeIcon(ctx, i) { car(ctx, 22 + i * 26, 30, 10); }

  const SEG = {
    enemy: [0, 1, 2].map((lane) => [0, 1, 2, 3, 4].map((d) => (ctx) => carAt(ctx, lane, d))),
    player: [0, 1, 2].map((lane) => (ctx) => carAt(ctx, lane, 5)),
    boom: [0, 1, 2].map((lane) => (ctx) => boom(ctx, lane)),
    curbs: [0, 1].map((p) => (ctx) => curbs(ctx, p)),
    life: [0, 1, 2].map((i) => (ctx) => lifeIcon(ctx, i))
  };

  function printed(ctx) {
    // obloha
    let gr = ctx.createLinearGradient(0, 0, 0, H0);
    gr.addColorStop(0, 'rgba(96,160,205,0.75)');
    gr.addColorStop(1, 'rgba(176,210,222,0.7)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, LW, H0);
    // hory
    ctx.fillStyle = 'rgba(176,132,92,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H0);
    [[0, 96], [40, 84], [78, 100], [120, 78], [150, 92], [176, 88], [220, 104], [262, 82], [300, 74], [336, 96], [372, 86], [400, 98], [400, H0]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(140,100,70,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H0);
    [[30, 102], [70, 96], [110, 106], [250, 104], [300, 94], [340, 104], [400, 104], [400, H0]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
    // tráva
    gr = ctx.createLinearGradient(0, H0, 0, LH);
    gr.addColorStop(0, 'rgba(118,170,104,0.7)');
    gr.addColorStop(1, 'rgba(86,150,92,0.62)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, H0, LW, LH - H0);
    // cesta
    ctx.fillStyle = 'rgba(150,150,142,0.72)';
    ctx.beginPath();
    ctx.moveTo(CX - hw(H0), H0); ctx.lineTo(CX + hw(H0), H0);
    ctx.lineTo(CX + hw(YB), YB); ctx.lineTo(CX - hw(YB), YB);
    ctx.closePath();
    ctx.fill();
    // čiary pruhov (natlačené)
    ctx.strokeStyle = 'rgba(235,235,225,0.55)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 9]);
    for (const l of [-1 / 3, 1 / 3]) {
      ctx.beginPath();
      ctx.moveTo(CX + l * 2 * hw(H0), H0);
      ctx.lineTo(CX + l * 2 * hw(YB), YB);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // tabuľa pri ceste
    ctx.fillStyle = 'rgba(70,64,52,0.6)';
    ctx.fillRect(296, 112, 2, 14);
    ctx.fillRect(316, 112, 2, 14);
    ctx.fillStyle = 'rgba(240,236,220,0.75)';
    ctx.fillRect(290, 104, 34, 10);
  }

  function ghosts(ctx) {
    SEG.enemy.forEach((a) => a.forEach((f) => f(ctx)));
    SEG.player.forEach((f) => f(ctx));
    SEG.boom.forEach((f) => f(ctx));
    SEG.curbs.forEach((f) => f(ctx));
    SEG.life.forEach((f) => f(ctx));
  }

  // ------------------------------------------------------------------ hra
  R.RacerGame = function (root, app) {
    const canvas = root.querySelector('canvas');
    const holder = root.querySelector('.lcd-holder');
    const scr = R.SegScreen(canvas, holder, {
      LW, LH, printed, ghosts,
      colors: { glassTop: '#cfd4c2', glassBot: '#bfc5ae' },
      ghostExtra(c, off) {
        scr.ghostDigits(c, DIG, off);
        c.fillStyle = off;
        c.font = '700 13px Arial, Helvetica, sans-serif';
        c.textAlign = 'left';
        c.fillText('GAME 1', 12, 60);
        c.fillText('GAME 2', 12, 76);
        c.fillText('PAUSE', 12, 92);
      }
    });

    let mode = 'off'; // off | clock | play | pause | over
    let gameNo = 1;
    let lane = 1, rows = [0, 0, 0, 0, 0], prevFree = 7;
    let score = 0, lives = 3, acc = 0, ticks = 0, phase = 0, t = 0;
    let crash = null, overT = 0, newHi = false, bonusAt = 100;

    const input = R.Input({ press, release() {} });
    R.bindButtons(root, input);
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound.unlock();
      if (mode !== 'play') return;
      const p = scr.toLogical(e.clientX, e.clientY);
      steer(p.x < LW / 2 ? -1 : 1);
      R.haptics.buzz(8);
    });

    function interval() {
      const base = gameNo === 1 ? 520 : 420;
      const min = gameNo === 1 ? 210 : 170;
      return Math.max(min, base * Math.pow(0.993, score));
    }

    function freeOf(mask) { return ~mask & 7; }
    function adjacentOk(free, prev) {
      for (let a = 0; a < 3; a++) {
        if (!(free & (1 << a))) continue;
        for (let b = 0; b < 3; b++) if ((prev & (1 << b)) && Math.abs(a - b) <= 1) return true;
      }
      return false;
    }
    function newRow(demo) {
      const p = demo ? 0.45 : Math.min(0.8, 0.36 + score / 300 + (gameNo === 2 ? 0.1 : 0));
      if (rows[0] || Math.random() > p) { prevFree = 7; return 0; } // medzi radmi áut aspoň jeden voľný
      const two = !demo && Math.random() < Math.min(0.5, score / 220 + (gameNo === 2 ? 0.1 : 0));
      for (let tries = 0; tries < 8; tries++) {
        let mask;
        if (two) { const free = R.randInt(0, 2); mask = 7 & ~(1 << free); }
        else mask = 1 << R.randInt(0, 2);
        if (adjacentOk(freeOf(mask), prevFree)) { prevFree = freeOf(mask); return mask; }
      }
      prevFree = 7;
      return 0;
    }

    function tick(demo) {
      ticks++;
      phase ^= 1;
      const passing = rows[4];
      if (passing & (1 << lane)) {
        if (demo) { rows = [0, 0, 0, 0, 0]; return; }
        doCrash();
        return;
      }
      let passed = 0;
      for (let b = 0; b < 3; b++) if (passing & (1 << b)) passed++;
      rows = [newRow(demo), rows[0], rows[1], rows[2], rows[3]];
      if (demo) return;
      if (passed) {
        score = Math.min(9999, score + passed);
        R.sound.sfx.pass();
        if (score >= bonusAt) {
          bonusAt += 100;
          if (lives < 3) { lives++; R.sound.sfx.bonus(); }
        }
      }
      R.sound.tone(110 + Math.min(200, score), 0.012, { vol: 0.35 });
    }

    function doCrash() {
      lives--;
      crash = { t: 0 };
      R.sound.sfx.crash();
      R.haptics.buzz(320);
    }

    function steer(d) {
      const nl = R.clamp(lane + d, 0, 2);
      if (nl === lane) return;
      lane = nl;
      R.sound.sfx.move();
    }

    function start() {
      mode = 'play';
      rows = [0, 0, 0, 0, 0]; prevFree = 7;
      score = 0; lives = 3; acc = -600; lane = 1; crash = null; newHi = false; bonusAt = 100;
      R.sound.sfx.start();
    }

    function update(dt) {
      t += dt;
      if (mode === 'clock') {
        acc += dt;
        if (acc >= 380) {
          acc -= 380;
          // ukážka: autíčko uhýba samo
          if (rows[4] & (1 << lane) || rows[3] & (1 << lane)) {
            for (const c of [lane - 1, lane + 1, lane - 2, lane + 2]) {
              if (c >= 0 && c <= 2 && !(rows[4] & (1 << c)) && !(rows[3] & (1 << c))) { lane = c; break; }
            }
          }
          tick(true);
        }
      } else if (mode === 'play') {
        if (crash) {
          crash.t += dt;
          if (crash.t >= 1600) {
            crash = null;
            rows = [0, 0, 0, 0, 0]; prevFree = 7;
            if (lives <= 0) {
              mode = 'over'; overT = 0;
              newHi = R.hi.submit('racer' + gameNo, score);
              R.sound.sfx.gameOver();
              R.haptics.buzz([80, 60, 160]);
            } else acc = -500;
          }
          return;
        }
        acc += dt;
        const iv = interval();
        while (acc >= iv && mode === 'play' && !crash) { acc -= iv; tick(false); }
      } else if (mode === 'over') {
        overT += dt;
      }
    }

    function render() {
      scr.begin();
      if (mode === 'off') return;
      const act = [SEG.curbs[phase]];
      for (let d = 0; d < 5; d++) for (let l = 0; l < 3; l++) if (rows[d] & (1 << l)) act.push(SEG.enemy[l][d]);
      if (crash) {
        act.push(Math.floor(crash.t / 120) % 2 ? SEG.boom[lane] : SEG.player[lane]);
      } else if (!(mode === 'over' && Math.floor(overT / 500) % 2)) {
        act.push(SEG.player[lane]);
      }
      if (mode !== 'clock') for (let i = 0; i < Math.max(0, lives); i++) act.push(SEG.life[i]);
      scr.segs(act);
      const now = new Date();
      if (mode === 'clock') {
        scr.digits(DIG, R.clockString(now), now.getMilliseconds() < 500);
        scr.text('GAME ' + gameNo, 12, gameNo === 1 ? 60 : 76, 13, Math.floor(t / 600) % 2 === 0);
      } else {
        const blank = mode === 'over' && newHi && Math.floor(overT / 400) % 2;
        scr.digits(DIG, blank ? '    ' : String(score).padStart(4, ' '), false);
        scr.text('GAME ' + gameNo, 12, gameNo === 1 ? 60 : 76, 13, true);
        if (mode === 'pause' && Math.floor(t / 450) % 2 === 0) scr.text('PAUSE', 12, 92, 13, true);
      }
    }

    function press(name, rep) {
      if (rep) return;
      if (name === 'sound') { R.sound.toggle(); return; }
      if (name === 'onoff') { app.goMenu(); return; }
      if (name === 'game') {
        if (mode === 'play' || mode === 'pause') return;
        start();
        return;
      }
      if (name === 'set') {
        if (mode === 'play') { mode = 'pause'; R.sound.sfx.pause(); }
        else if (mode === 'pause') { mode = 'play'; R.sound.sfx.resume(); }
        else { gameNo = gameNo === 1 ? 2 : 1; mode = 'clock'; R.sound.sfx.setting(); }
        return;
      }
      if (mode !== 'play' || crash) return;
      if (name === 'left') steer(-1);
      else if (name === 'right') steer(1);
    }

    function keyMap(e, isDown) {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', Enter: 'game', ' ': 'game', p: 'set', s: 'set', m: 'sound' };
      if (e.key === 'Escape' || e.key === 'Backspace') { if (isDown) app.goMenu(); e.preventDefault(); return; }
      const name = map[e.key] || map[e.key.toLowerCase && e.key.toLowerCase()];
      if (!name) return;
      e.preventDefault();
      if (isDown) { if (!e.repeat) { R.sound.unlock(); input.down(name, false); } }
      else input.up(name);
    }

    return {
      enter() {
        mode = 'clock';
        rows = [0, 0, 0, 0, 0]; lane = 1; crash = null; acc = 0;
        scr.resize();
        R.sound.sfx.select();
      },
      leave() { input.upAll(); mode = 'off'; },
      pause() { if (mode === 'play' && !crash) mode = 'pause'; },
      frame(dt) { update(Math.min(dt, 100)); render(); },
      resize: scr.resize,
      get state() { return { mode, lane, rows: rows.slice(), score, lives, crash: !!crash }; },
      keydown(e) { keyMap(e, true); },
      keyup(e) { keyMap(e, false); }
    };
  };

  // náhľad do menu
  R.drawRacerPreview = function (ctx, w, h, t) {
    const sc = Math.min(w / LW, h / LH);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#cfd4c2';
    ctx.fillRect(0, 0, w, h);
    ctx.translate((w - LW * sc) / 2, (h - LH * sc) / 2);
    ctx.scale(sc, sc);
    printed(ctx);
    const step = Math.floor(t / 300);
    ctx.fillStyle = 'rgba(20,24,16,0.9)';
    ctx.beginPath();
    SEG.curbs[step % 2](ctx);
    carAt(ctx, (Math.floor(step / 6) % 2) ? 0 : 2, step % 5);
    carAt(ctx, 1, 5);
    ctx.fill();
    ctx.restore();
  };
})(window.Retro);
