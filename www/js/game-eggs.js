/* Retro Hry – LÍŠKA A VAJÍČKA: LCD hra s pevnými segmentmi a hodinami.
   Líška stojí v strede, z kurínov po štyroch žľaboch kotúľajú vajíčka. */
'use strict';

(function (R) {
  const LW = 480, LH = 320;
  const COL = {
    bgTop: '#d0d5bf',
    bgBot: '#bcc3a7',
    on: 'rgba(20,24,16,0.9)',
    off: 'rgba(20,24,16,0.055)',
    shadow: 'rgba(20,24,16,0.14)',
    wood: 'rgba(112,82,50,0.62)',
    woodDark: 'rgba(84,60,36,0.7)',
    hen: 'rgba(246,242,226,0.9)',
    henLine: 'rgba(96,78,58,0.75)',
    comb: 'rgba(178,58,44,0.8)',
    beak: 'rgba(214,150,40,0.85)',
    grass: 'rgba(72,104,54,0.5)',
    sky: 'rgba(255,255,255,0.0)'
  };

  const CHUTES = [
    { x1: 62, y1: 98, x2: 166, y2: 140, dir: 1 },
    { x1: 62, y1: 184, x2: 166, y2: 226, dir: 1 },
    { x1: 418, y1: 98, x2: 314, y2: 140, dir: -1 },
    { x1: 418, y1: 184, x2: 314, y2: 226, dir: -1 }
  ];

  // ---------------------------------------------------------- tvary segmentov
  function eggAt(ctx, x, y, r, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (px, py) => [x + px * c - py * s, y + px * s + py * c];
    let p = P(0, -r * 1.25);
    ctx.moveTo(p[0], p[1]);
    const curve = (a, b, d) => { const A = P(a[0], a[1]), B = P(b[0], b[1]), D = P(d[0], d[1]); ctx.bezierCurveTo(A[0], A[1], B[0], B[1], D[0], D[1]); };
    curve([r * 0.95, -r * 1.2], [r * 1.05, r * 0.95], [0, r]);
    curve([-r * 1.05, r * 0.95], [-r * 0.95, -r * 1.2], [0, -r * 1.25]);
    ctx.closePath();
  }

  function circle(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); }
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.closePath(); }
  function poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  // hrubá čiara ako vyplnený tvar (aby sa dal kresliť ako segment)
  function thick(ctx, pts, w) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const a = Math.atan2(y2 - y1, x2 - x1);
      const nx = Math.sin(a) * w / 2, ny = -Math.cos(a) * w / 2;
      poly(ctx, [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
    }
    for (const [x, y] of pts) circle(ctx, x, y, w / 2);
  }

  const M = (x, side) => side ? LW - x : x; // zrkadlenie pre pravú stranu

  function eggPos(c, p) {
    const ch = CHUTES[c];
    const t = 0.12 + p * 0.19;
    return { x: ch.x1 + (ch.x2 - ch.x1) * t, y: ch.y1 + (ch.y2 - ch.y1) * t - 9, rot: p * 1.15 * ch.dir };
  }

  function basket(ctx, cx, cy) {
    poly(ctx, [[cx - 17, cy - 7], [cx + 17, cy - 7], [cx + 12, cy + 9], [cx - 12, cy + 9]]);
    // ucho košíka
    ctx.moveTo(cx - 14, cy - 7);
    ctx.arc(cx, cy - 7, 14, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + 11, cy - 7);
    ctx.arc(cx, cy - 7, 11, Math.PI * 2, Math.PI, true);
    ctx.closePath();
  }

  function chick(ctx, x, y, dir, k) {
    // dir: -1 beží doľava, 1 doprava; k: fáza nôh
    ellipse(ctx, x, y - 8, 8, 6.5, 0);
    circle(ctx, x + dir * 7, y - 16, 5);
    poly(ctx, [[x + dir * 11, y - 18], [x + dir * 16, y - 16], [x + dir * 11, y - 14]]);
    poly(ctx, [[x - dir * 7, y - 11], [x - dir * 13, y - 14], [x - dir * 8, y - 6]]);
    const sp = k % 2 ? 4 : 1.5;
    thick(ctx, [[x - 2, y - 3], [x - 2 - sp * dir, y + 2]], 2);
    thick(ctx, [[x + 2, y - 3], [x + 2 + sp * dir, y + 2]], 2);
  }

  function broken(ctx, x, y) {
    ellipse(ctx, x, y - 2, 15, 3.5, 0);
    poly(ctx, [[x - 13, y - 4], [x - 11, y - 12], [x - 7, y - 8], [x - 4, y - 14], [x - 1, y - 7], [x - 5, y - 4]]);
    poly(ctx, [[x + 3, y - 4], [x + 2, y - 9], [x + 6, y - 13], [x + 9, y - 8], [x + 13, y - 11], [x + 13, y - 4]]);
  }

  // Líška: telo spredu (vždy), hlava a chvost podľa toho, kam sa pozerá.
  const FX = 240;
  function foxBody(ctx) {
    ellipse(ctx, FX, 256, 25, 34, 0);
    poly(ctx, [[FX - 10, 216], [FX + 10, 216], [FX + 13, 232], [FX - 13, 232]]);
    poly(ctx, [[FX - 15, 280], [FX - 5, 280], [FX - 5, 296], [FX - 15, 296]]);
    poly(ctx, [[FX + 5, 280], [FX + 15, 280], [FX + 15, 296], [FX + 5, 296]]);
    ellipse(ctx, FX - 12, 298, 9, 3.5, 0);
    ellipse(ctx, FX + 12, 298, 9, 3.5, 0);
  }
  function foxHead(ctx, side) {
    const d = side ? 1 : -1;
    const hx = FX + d * 4;
    circle(ctx, hx, 200, 17);
    poly(ctx, [[hx + d * 8, 191], [hx + d * 32, 203], [hx + d * 8, 214]]);
    circle(ctx, hx + d * 31, 202.5, 3.6);
    poly(ctx, [[hx - 13, 190], [hx - 10, 166], [hx - 1, 185]]);
    poly(ctx, [[hx + 1, 185], [hx + 10, 166], [hx + 13, 190]]);
  }
  function foxEye(side) { const d = side ? 1 : -1; return { x: FX + d * 4 + d * 7, y: 196 }; }
  function foxTail(ctx, side) {
    // chvost trčí na opačnú stranu, než kam líška pozerá
    const d = side ? -1 : 1;
    ctx.moveTo(FX + d * 20, 276);
    ctx.quadraticCurveTo(FX + d * 50, 296, FX + d * 62, 270);
    ctx.quadraticCurveTo(FX + d * 68, 252, FX + d * 56, 246);
    ctx.quadraticCurveTo(FX + d * 54, 266, FX + d * 22, 262);
    ctx.closePath();
  }
  const BASKET = [{ x: 174, y: 158 }, { x: 174, y: 246 }, { x: 306, y: 158 }, { x: 306, y: 246 }];
  function foxArm(ctx, p) {
    const side = p >= 2 ? 1 : 0;
    const up = p % 2 === 0;
    const sx = M(219, side);
    const pts = up
      ? [[sx, 236], [M(196, side), 226], [M(186, side), 162]]
      : [[sx, 236], [M(200, side), 244], [M(189, side), 246]];
    thick(ctx, pts, 7);
    const h = pts[pts.length - 1];
    circle(ctx, h[0], h[1], 5);
    basket(ctx, BASKET[p].x, BASKET[p].y);
  }

  const CHICK_X = [138, 110, 82, 54];
  const MISS_X = [376, 408, 440];

  const SEGS = {
    egg: [0, 1, 2, 3].map((c) => [0, 1, 2, 3, 4].map((p) => (ctx) => { const e = eggPos(c, p); eggAt(ctx, e.x, e.y, 7, e.rot); })),
    body: foxBody,
    head: [0, 1].map((s) => (ctx) => foxHead(ctx, s)),
    tail: [0, 1].map((s) => (ctx) => foxTail(ctx, s)),
    arm: [0, 1, 2, 3].map((p) => (ctx) => foxArm(ctx, p)),
    broken: [0, 1].map((s) => (ctx) => broken(ctx, M(170, s), 298)),
    chick: [0, 1].map((s) => CHICK_X.map((x, k) => (ctx) => chick(ctx, M(x, s), 298, s ? 1 : -1, k))),
    miss: MISS_X.map((x) => (ctx) => chick(ctx, x, 44, -1, 0))
  };
  function allSegs() {
    const out = [SEGS.body];
    SEGS.egg.forEach((a) => a.forEach((f) => out.push(f)));
    out.push(...SEGS.head, ...SEGS.tail, ...SEGS.arm, ...SEGS.broken, ...SEGS.miss);
    SEGS.chick.forEach((a) => a.forEach((f) => out.push(f)));
    return out;
  }

  // číslice
  const DIG = { x0: 186, y: 14, w: 22, h: 40 };
  function digX(i) { return DIG.x0 + i * 29 + (i >= 2 ? 8 : 0); }
  function colon(ctx) { const x = DIG.x0 + 62; circle(ctx, x, DIG.y + 12, 2.8); circle(ctx, x - 1.2, DIG.y + 28, 2.8); }

  // ---------------------------------------------------------- tlačená grafika
  function drawHen(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = COL.hen;
    ctx.strokeStyle = COL.henLine;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.quadraticCurveTo(-26, -22, -14, -24);
    ctx.quadraticCurveTo(-8, -12, 0, -10);
    ctx.quadraticCurveTo(8, -12, 10, -20);
    ctx.quadraticCurveTo(14, -30, 20, -24);
    ctx.quadraticCurveTo(24, -16, 18, -6);
    ctx.quadraticCurveTo(12, 6, -6, 6);
    ctx.quadraticCurveTo(-18, 6, -20, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -2); ctx.quadraticCurveTo(-2, 4, 6, -2);
    ctx.stroke();
    ctx.fillStyle = COL.comb;
    ctx.beginPath();
    ctx.arc(13, -29, 3, 0, Math.PI * 2); ctx.arc(17, -30, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, -16, 2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.beak;
    ctx.beginPath(); ctx.moveTo(21, -24); ctx.lineTo(28, -21); ctx.lineTo(21, -19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.henLine;
    ctx.beginPath(); ctx.arc(16, -23, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function lcdGlass(ctx, w, h) {
    const gr = ctx.createLinearGradient(0, 0, w * 0.4, h);
    gr.addColorStop(0, COL.bgTop);
    gr.addColorStop(1, COL.bgBot);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPrinted(ctx) {
    for (const side of [0, 1]) {
      for (const lvl of [0, 1]) {
        const ch = CHUTES[side * 2 + lvl];
        // polička s kurínom
        ctx.fillStyle = COL.woodDark;
        ctx.fillRect(M(side ? 64 : 4, side), ch.y1 - 2, 60, 6);
        ctx.fillRect(M(side ? 14 : 12, side) - 2, ch.y1 + 4, 4, 18);
        drawHen(ctx, M(32, side), ch.y1 - 4, side ? -1 : 1);
        // žľab
        ctx.strokeStyle = COL.wood;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ch.x1, ch.y1 + 1);
        ctx.lineTo(ch.x2, ch.y2 + 1);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ch.x1, ch.y1 - 5);
        ctx.lineTo(ch.x1, ch.y1 + 1);
        ctx.moveTo((ch.x1 + ch.x2) / 2, (ch.y1 + ch.y2) / 2 + 1);
        ctx.lineTo((ch.x1 + ch.x2) / 2, (ch.y1 + ch.y2) / 2 + 14);
        ctx.stroke();
      }
    }
    // tráva
    ctx.strokeStyle = COL.grass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 304); ctx.lineTo(LW, 304);
    for (let x = 6; x < LW; x += 19) {
      ctx.moveTo(x, 304); ctx.lineTo(x - 3, 296);
      ctx.moveTo(x + 4, 304); ctx.lineTo(x + 6, 297);
    }
    ctx.stroke();
  }

  // ---------------------------------------------------------- hra
  R.EggsGame = function (root, app) {
    const canvas = root.querySelector('canvas');
    const holder = root.querySelector('.lcd-holder');
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas');
    const bctx = bg.getContext('2d');
    let k = 1, ox = 0, oy = 0;

    let mode = 'off'; // off | clock | play | over
    let type = 'A';
    let pos = 0;
    let eggs = [];
    let score = 0, misses = 0, acc = 0, tickN = 0, t = 0;
    let missAnim = null;
    let overT = 0;
    let newHi = false;

    const input = R.Input({ press, release() {} });
    R.bindButtons(root, input);

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound.unlock();
      if (mode !== 'play') return;
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const x = ((e.clientX - r.left) * sx - ox) / k, y = ((e.clientY - r.top) * sx - oy) / k;
      setPos((x < LW / 2 ? 0 : 2) + (y < 190 ? 0 : 1));
      R.haptics.buzz(8);
    });

    function buildBackground() {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      lcdGlass(bctx, bg.width, bg.height);
      bctx.setTransform(k, 0, 0, k, ox, oy);
      drawPrinted(bctx);
      bctx.fillStyle = COL.off;
      bctx.beginPath();
      allSegs().forEach((f) => f(bctx));
      colon(bctx);
      bctx.fill();
      for (let i = 0; i < 4; i++) R.seg.digit(bctx, digX(i), DIG.y, DIG.w, DIG.h, 0x7f, COL.off);
      modeText(bctx, 'A', COL.off);
      modeText(bctx, 'B', COL.off);
    }

    function modeText(c, which, color) {
      c.fillStyle = color;
      c.font = '700 15px Arial, Helvetica, sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(which === 'A' ? 'HRA A' : 'HRA B', 16, which === 'A' ? 26 : 46);
    }

    function resize() {
      const r = holder.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(r.width * dpr)), h = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = w; canvas.height = h;
      canvas.style.width = (w / dpr) + 'px';
      canvas.style.height = (h / dpr) + 'px';
      bg.width = w; bg.height = h;
      k = Math.min(w / LW, h / LH);
      ox = (w - LW * k) / 2;
      oy = (h - LH * k) / 2;
      buildBackground();
    }

    // -------------------------------------------------------- pravidlá
    function interval() {
      const base = type === 'A' ? 620 : 480;
      const min = type === 'A' ? 250 : 200;
      const eff = (score % 100) + Math.floor(score / 100) * 45; // po každej stovke krátky oddych
      return Math.max(min, base - eff * 2.4);
    }
    function maxEggs() { return Math.min(5, (type === 'A' ? 2 : 3) + Math.floor(score / 20)); }
    function spawnP() { return (type === 'A' ? 0.34 : 0.46) + Math.min(0.4, score / 250); }

    function setPos(p) {
      if (mode !== 'play' || missAnim) return;
      pos = p;
    }

    function startGame(which) {
      type = which;
      mode = 'play';
      eggs = []; score = 0; misses = 0; acc = 0; tickN = 0; missAnim = null; newHi = false;
      pos = 0;
      R.sound.sfx.start();
      acc = -700; // krátka chvíľa na nadýchnutie
    }

    function tick(demo) {
      tickN++;
      for (const e of eggs) e.p++;
      const fell = eggs.find((e) => e.p > 4);
      eggs = eggs.filter((e) => e.p <= 4);
      let caught = false;
      if (fell) {
        if (fell.c === pos) {
          caught = true;
          if (!demo) {
            score = Math.min(9999, score + 1);
            if (score % 100 === 0) {
              misses = 0;
              R.sound.sfx.bonus();
            } else {
              R.sound.sfx.catchEgg();
            }
          }
        } else if (!demo) {
          misses++;
          missAnim = { side: fell.c < 2 ? 0 : 1, t: 0, step: -1 };
          R.sound.sfx.eggBreak();
          R.haptics.buzz(120);
        }
      }
      if (!missAnim) {
        const max = demo ? 3 : maxEggs();
        const p = demo ? 0.5 : spawnP();
        if (eggs.length < max && tickN > 1 && Math.random() < p) {
          eggs.push({ c: R.randInt(0, 3), p: 0 });
        }
      }
      if (!demo && !caught && !missAnim && eggs.length) {
        let lead = eggs[0];
        for (const e of eggs) if (e.p > lead.p) lead = e;
        R.sound.sfx.eggStep(lead.c);
      }
    }

    function update(dt) {
      t += dt;
      if (mode === 'clock') {
        acc += dt;
        if (acc >= 600) {
          acc -= 600;
          const next = eggs.find((e) => e.p === 4);
          if (next) pos = next.c;
          tick(true);
        }
      } else if (mode === 'play') {
        if (missAnim) {
          missAnim.t += dt;
          const step = missAnim.t < 600 ? -1 : Math.floor((missAnim.t - 600) / 300);
          if (step !== missAnim.step && step >= 0 && step < 4) R.sound.sfx.chick(step);
          missAnim.step = step;
          if (missAnim.t >= 2000) {
            missAnim = null;
            if (misses >= 3) {
              mode = 'over';
              overT = 0;
              newHi = R.hi.submit('eggs' + type, score);
              R.sound.sfx.eggOver();
              R.haptics.buzz([80, 60, 160]);
            }
          }
          return;
        }
        acc += dt;
        const iv = interval();
        while (acc >= iv && mode === 'play' && !missAnim) {
          acc -= iv;
          tick(false);
        }
      } else if (mode === 'over') {
        overT += dt;
      }
    }

    // -------------------------------------------------------- kreslenie
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      ctx.setTransform(k, 0, 0, k, ox, oy);
      if (mode === 'off') return;
      const act = [];
      const side = pos >= 2 ? 1 : 0;
      const showFox = !(mode === 'over' && Math.floor(overT / 500) % 2);
      if (showFox) act.push(SEGS.body, SEGS.head[side], SEGS.tail[side], SEGS.arm[pos]);
      for (const e of eggs) act.push(SEGS.egg[e.c][e.p]);
      if (missAnim) {
        if (missAnim.t < 600) act.push(SEGS.broken[missAnim.side]);
        else if (missAnim.step >= 0 && missAnim.step < 4) act.push(SEGS.chick[missAnim.side][missAnim.step]);
      }
      if (mode !== 'clock') {
        for (let i = 0; i < misses && i < 3; i++) {
          const blinkNew = missAnim && i === misses - 1 && Math.floor(missAnim.t / 200) % 2;
          if (!blinkNew) act.push(SEGS.miss[i]);
        }
      }
      const clockMode = mode === 'clock';
      const now = new Date();
      const colonOn = clockMode && now.getMilliseconds() < 500;

      ctx.save();
      ctx.translate(1.8, 2);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      act.forEach((f) => f(ctx));
      if (colonOn) colon(ctx);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = COL.on;
      ctx.beginPath();
      act.forEach((f) => f(ctx));
      if (colonOn) colon(ctx);
      ctx.fill();
      if (showFox) {
        const ey = foxEye(side);
        ctx.fillStyle = COL.bgTop;
        ctx.beginPath(); circle(ctx, ey.x, ey.y, 2.6); ctx.fill();
      }

      // číslice: hodiny alebo skóre
      let str;
      if (clockMode) {
        str = String(now.getHours()).padStart(2, ' ') + String(now.getMinutes()).padStart(2, '0');
      } else {
        const blank = mode === 'over' && newHi && Math.floor(overT / 400) % 2;
        str = blank ? '    ' : String(score).padStart(4, ' ');
      }
      for (let i = 0; i < 4; i++) {
        const ch = str[i];
        if (ch === ' ') continue;
        R.seg.digit(ctx, digX(i) + 1.8, DIG.y + 2, DIG.w, DIG.h, R.seg.DIGITS[+ch], COL.shadow);
        R.seg.digit(ctx, digX(i), DIG.y, DIG.w, DIG.h, R.seg.DIGITS[+ch], COL.on);
      }
      if (mode === 'play' || mode === 'over') modeText(ctx, type, COL.on);
    }

    // -------------------------------------------------------- vstup
    function press(name, rep) {
      if (rep) return;
      if (name === 'sound') { R.sound.toggle(); return; }
      if (name === 'onoff') { app.goMenu(); return; }
      if (name === 'gameA' || name === 'gameB') { startGame(name === 'gameA' ? 'A' : 'B'); return; }
      const P = { ul: 0, ll: 1, ur: 2, lr: 3 };
      if (name in P) setPos(P[name]);
      else if (name === 'left') setPos(pos % 2);
      else if (name === 'right') setPos(2 + pos % 2);
      else if (name === 'up') setPos(pos - pos % 2);
      else if (name === 'down') setPos(pos - pos % 2 + 1);
    }

    function keyMap(e, isDown) {
      const map = {
        q: 'ul', 7: 'ul', a: 'll', 1: 'll', p: 'ur', 9: 'ur', l: 'lr', 3: 'lr',
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        Enter: 'gameA', b: 'gameB', m: 'sound'
      };
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
        eggs = []; misses = 0; score = 0; acc = 0; missAnim = null;
        resize();
        R.sound.sfx.select();
      },
      leave() { input.upAll(); mode = 'off'; },
      pause() { /* LCD hry pauzu nepoznali; pri návrate hra pokračuje */ },
      frame(dt) { update(Math.min(dt, 100)); render(); },
      resize,
      keydown(e) { keyMap(e, true); },
      keyup(e) { keyMap(e, false); }
    };
  };

  // Malý náhľad do menu.
  R.drawEggsPreview = function (ctx, w, h, t) {
    const sc = Math.min(w / LW, h / LH);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    lcdGlass(ctx, w, h);
    ctx.translate((w - LW * sc) / 2, (h - LH * sc) / 2);
    ctx.scale(sc, sc);
    drawPrinted(ctx);
    const step = Math.floor(t / 500) % 5;
    const p = Math.floor(t / 2500) % 2 ? 2 : 0;
    ctx.fillStyle = COL.on;
    ctx.beginPath();
    SEGS.body(ctx);
    SEGS.head[p ? 1 : 0](ctx);
    SEGS.tail[p ? 1 : 0](ctx);
    SEGS.arm[p](ctx);
    SEGS.egg[p][step](ctx);
    SEGS.egg[p === 0 ? 3 : 1][(step + 2) % 5](ctx);
    ctx.fill();
    const ey = foxEye(p ? 1 : 0);
    ctx.fillStyle = COL.bgTop;
    ctx.beginPath(); circle(ctx, ey.x, ey.y, 2.6); ctx.fill();
    ctx.restore();
  };
})(window.Retro);
