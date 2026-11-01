/* Retro Hry – CHOBOTNICA: potápač zostupuje z lode k truhlici s perlami
   a uhýba chápadlám, ktoré sa po článkoch naťahujú a sťahujú. */
'use strict';

(function (R) {
  const G = R.geo;
  const LW = 480, LH = 320;
  const DIG = { x: 182, y: 8, w: 22, h: 38, gap: 7, mid: 8 };

  // pozície potápača: 0 = pri lodi, 6 = pri truhlici
  const POS = [[424, 86], [436, 146], [390, 204], [322, 272], [254, 276], [186, 276], [116, 276]];

  // chápadlá: koreň na chobotnici -> koniec nad pozíciou 2..5
  const TENT = [
    { p0: [164, 106], c: [288, 66], p1: [380, 172], n: 6 },
    { p0: [156, 146], c: [262, 150], p1: [318, 236], n: 5 },
    { p0: [132, 160], c: [206, 196], p1: [250, 240], n: 4 },
    { p0: [104, 164], c: [128, 228], p1: [184, 242], n: 3 },
    { p0: [80, 166], c: [58, 224], p1: [122, 244], n: 3 } // piate chápadlo stráži truhlicu
  ];
  function bez(T, t) {
    const u = 1 - t;
    return [u * u * T.p0[0] + 2 * u * t * T.c[0] + t * t * T.p1[0], u * u * T.p0[1] + 2 * u * t * T.c[1] + t * t * T.p1[1]];
  }
  function tentSeg(ctx, i, j) {
    const T = TENT[i];
    const t = (j + 0.75) / T.n;
    const [x, y] = bez(T, t);
    const [x2, y2] = bez(T, Math.min(1, t + 0.02));
    const a = Math.atan2(y2 - y, x2 - x);
    const r = 12 - 6.5 * t;
    G.ellipse(ctx, x, y, r * 1.25, r * 0.8, a);
    if (j === T.n - 1) { // zahnutá špička
      const [xa, ya] = [x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4];
      G.circle(ctx, xa, ya, r * 0.55);
    }
  }

  function diver(ctx, x, y, pose) {
    // y = stred tela; pose: 'walk' | 'rope' | 'grab1' | 'grab2' | 'boat'
    G.circle(ctx, x, y - 20, 9);                 // prilba
    G.rect(ctx, x - 6, y - 12, 12, 4);           // golier
    G.ellipse(ctx, x + 1, y - 1, 8.5, 11, 0);   // telo
    G.rect(ctx, x + 7, y - 13, 6, 15);           // fľaša
    if (pose === 'rope') {
      G.thick(ctx, [[x - 4, y - 8], [x - 2, y - 26]], 4);
      G.thick(ctx, [[x + 4, y - 8], [x + 1, y - 30]], 4);
    } else if (pose === 'grab1') {
      G.thick(ctx, [[x - 4, y - 6], [x - 16, y + 4], [x - 24, y + 8]], 4);
    } else if (pose === 'grab2') {
      G.thick(ctx, [[x - 4, y - 6], [x - 14, y - 20], [x - 16, y - 30]], 4);
      G.circle(ctx, x - 16, y - 34, 4.5); // perla v ruke
    } else {
      G.thick(ctx, [[x - 4, y - 6], [x - 14, y + 2]], 4);
    }
    if (pose === 'rope') {
      G.thick(ctx, [[x - 2, y + 8], [x - 4, y + 22]], 4.5);
      G.thick(ctx, [[x + 4, y + 8], [x + 7, y + 21]], 4.5);
    } else {
      G.thick(ctx, [[x - 3, y + 8], [x - 8, y + 20]], 4.5);
      G.thick(ctx, [[x + 4, y + 8], [x + 8, y + 20]], 4.5);
    }
    G.ellipse(ctx, x - 12, y + 22, 6, 2.5, -0.2);
    G.ellipse(ctx, x + 12, y + 22, 6, 2.5, 0.2);
  }
  function bag(ctx, x, y) {
    G.ellipse(ctx, x - 13, y + 8, 6, 7, 0);
    G.rect(ctx, x - 15, y - 1, 4, 3);
  }
  function spare(ctx, i) {
    const x = 392 + i * 26, y = 30;
    G.circle(ctx, x, y - 8, 6);
    G.ellipse(ctx, x, y + 3, 6, 7, 0);
  }
  function octoBody(ctx) {
    // hlava ako kupola
    ctx.moveTo(54, 132);
    ctx.bezierCurveTo(34, 74, 86, 44, 122, 58);
    ctx.bezierCurveTo(162, 72, 176, 116, 162, 146);
    ctx.bezierCurveTo(142, 172, 80, 174, 54, 132);
    ctx.closePath();
    for (const T of TENT) G.circle(ctx, T.p0[0], T.p0[1], 11);
    // krátke chápadlo, ktoré sa nehýbe
    G.ellipse(ctx, 46, 146, 11, 6, 2.2);
    G.ellipse(ctx, 36, 160, 7, 5, 1.9);
  }
  function octoEyes(ctx, glass, ink, look) {
    ctx.fillStyle = glass;
    ctx.beginPath();
    G.ellipse(ctx, 114, 112, 10, 8, 0);
    G.ellipse(ctx, 142, 118, 9, 7, 0);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    G.circle(ctx, 116 + look * 3, 113, 4);
    G.circle(ctx, 144 + look * 3, 119, 3.6);
    ctx.fill();
  }

  const SEG = {
    body: octoBody,
    tent: TENT.map((T, i) => Array.from({ length: T.n }, (_, j) => (ctx) => tentSeg(ctx, i, j))),
    diver: POS.slice(0, 6).map(([x, y], i) => (ctx) => diver(ctx, x, y, i === 1 ? 'rope' : 'walk')),
    grab: [1, 2].map((k) => (ctx) => diver(ctx, POS[6][0], POS[6][1], 'grab' + k)),
    bag: POS.slice(0, 6).map(([x, y]) => (ctx) => bag(ctx, x, y)),
    spare: [0, 1].map((i) => (ctx) => spare(ctx, i))
  };

  function printed(ctx) {
    // hladina
    ctx.strokeStyle = 'rgba(52,108,150,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= LW; x += 4) ctx.lineTo(x, 56 + Math.sin(x / 14) * 2.5);
    ctx.stroke();
    // loďka
    ctx.fillStyle = 'rgba(150,62,46,0.7)';
    ctx.beginPath();
    ctx.moveTo(352, 42); ctx.lineTo(474, 42); ctx.lineTo(458, 60); ctx.lineTo(366, 60); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240,232,214,0.7)';
    ctx.fillRect(352, 40, 122, 4);
    // lano
    ctx.strokeStyle = 'rgba(120,96,64,0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(452, 60); ctx.lineTo(446, 176); ctx.stroke();
    // dno
    ctx.fillStyle = 'rgba(206,180,120,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    for (let x = 0; x <= LW; x += 20) ctx.lineTo(x, 300 + Math.sin(x / 31) * 3);
    ctx.lineTo(LW, LH); ctx.lineTo(0, LH); ctx.closePath();
    ctx.fill();
    // riasy a kamene
    ctx.strokeStyle = 'rgba(64,128,78,0.6)';
    ctx.lineWidth = 2.4;
    for (const [x, h] of [[220, 34], [232, 24], [356, 30], [366, 42], [458, 36], [470, 26]]) {
      ctx.beginPath();
      ctx.moveTo(x, 302);
      ctx.quadraticCurveTo(x - 8, 302 - h / 2, x + 2, 302 - h);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,112,100,0.5)';
    for (const [x, rx, ry] of [[286, 16, 7], [420, 22, 9], [156, 12, 6]]) {
      ctx.beginPath(); ctx.ellipse(x, 302, rx, ry, 0, Math.PI, 0); ctx.fill();
    }
    // truhlica s perlami
    ctx.fillStyle = 'rgba(132,86,40,0.75)';
    ctx.fillRect(22, 270, 64, 32);
    ctx.beginPath();
    ctx.moveTo(22, 270); ctx.quadraticCurveTo(54, 246, 86, 270); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(232,200,90,0.85)';
    ctx.fillRect(50, 278, 8, 10);
    ctx.fillStyle = 'rgba(250,246,236,0.9)';
    for (const [x, y] of [[34, 266], [44, 262], [56, 260], [68, 262], [76, 267]]) {
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function ghosts(ctx) {
    SEG.tent.forEach((a) => a.forEach((f) => f(ctx)));
    SEG.diver.forEach((f) => f(ctx));
    SEG.grab.forEach((f) => f(ctx));
    SEG.bag.forEach((f) => f(ctx));
    SEG.spare.forEach((f) => f(ctx));
  }

  // ------------------------------------------------------------------ hra
  R.OctopusGame = function (root, app) {
    const canvas = root.querySelector('canvas');
    const holder = root.querySelector('.lcd-holder');
    const scr = R.SegScreen(canvas, holder, {
      LW, LH, printed, ghosts,
      colors: { glassTop: '#cbd8d0', glassBot: '#b3c5bb' },
      ghostExtra(c, off) {
        scr.ghostDigits(c, DIG, off);
        c.fillStyle = off;
        c.font = '700 14px Arial, Helvetica, sans-serif';
        c.textAlign = 'left';
        c.fillText('HRA A', 196, 66);
        c.fillText('HRA B', 250, 66);
      }
    });

    let mode = 'off'; // off | clock | play | over
    let type = 'A';
    let pos = 0, carry = 0, grabPose = 0;
    let tents = [];
    let score = 0, lives = 3, acc = 0, tickN = 0, t = 0, overT = 0, newHi = false, bonusAt = 200;
    let caught = null, bank = null, lastGrab = -1;

    const input = R.Input({ press, release() {} });
    R.bindButtons(root, input);
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound.unlock();
      if (mode !== 'play') return;
      const p = scr.toLogical(e.clientX, e.clientY);
      move(p.x < LW / 2 ? 1 : -1);
      R.haptics.buzz(8);
    });

    function resetTents() {
      tents = TENT.map((T, i) => ({ n: T.n, len: 0, dir: 1, target: 1, wait: i }));
    }

    function interval() {
      const base = type === 'A' ? 470 : 370;
      const min = type === 'A' ? 200 : 160;
      return Math.max(min, base * Math.pow(0.992, score));
    }
    function chooseTarget(T) {
      const pf = Math.min(0.8, 0.4 + score / 300 + (type === 'B' ? 0.1 : 0));
      return Math.random() < pf ? T.n : R.randInt(1, T.n - 1);
    }

    function isCaught() {
      if (pos < 2) return false; // pri loďke a na lane je bezpečne
      const T = tents[pos - 2];
      return T.len === T.n;
    }

    function checkCatch() {
      if (mode !== 'play' || caught || !isCaught()) return;
      caught = { t: 0, pos };
      lives--;
      carry = 0;
      R.sound.sfx.crash();
      R.haptics.buzz(300);
    }

    const GUARD = TENT.length - 1; // chápadlo pri truhlici

    function moveTent(i, demo) {
      const T = tents[i];
      if (T.wait > 0) { T.wait--; return; }
      if (T.dir > 0) {
        T.len++;
        if (T.len >= T.target) { T.len = T.target; T.dir = -1; if (T.len === T.n) T.wait = 1; }
      } else {
        T.len--;
        if (T.len <= 0) {
          T.len = 0; T.dir = 1;
          // strážca truhlice sa v hre vždy natiahne celý
          T.target = demo ? R.randInt(1, T.n) : (i === GUARD ? T.n : chooseTarget(T));
          T.wait = R.randInt(0, 2);
        }
      }
      if (!demo) R.sound.tone([392, 494, 587, 698, 330][i] * (1 + T.len * 0.06), 0.03, { vol: 0.6 });
    }

    function stepTentacle(demo) {
      tickN++;
      let i = tickN % TENT.length;
      if (Math.random() < 0.3) i = R.randInt(0, TENT.length - 1);
      moveTent(i, demo);
      // strážca sa hýbe častejšie, aby sa pri truhlici nedalo stáť donekonečna
      if (i !== GUARD && Math.random() < 0.6) moveTent(GUARD, demo);
    }

    function move(d) {
      // d = +1 k truhlici (doľava), -1 k lodi (doprava)
      if (mode !== 'play' || caught) return;
      if (d > 0) {
        if (pos < 6) { pos++; R.sound.sfx.move(); }
        else {
          if (lastGrab === tickN) return; // jedna perla za takt hry
          lastGrab = tickN;
          carry++; grabPose ^= 1;
          addScore(1);
          R.sound.sfx.catchEgg();
        }
      } else if (pos > 0) {
        pos--;
        R.sound.sfx.move();
        if (pos === 0 && carry > 0) {
          addScore(carry); // bezpečný návrat: perly sa započítajú ešte raz
          bank = { t: 0 };
          carry = 0;
          R.sound.sfx.bonus();
        }
      }
      checkCatch();
    }

    function addScore(n) {
      score = Math.min(9999, score + n);
      if (score >= bonusAt) {
        bonusAt += 200;
        if (lives < 3) lives++;
      }
    }

    function start(which) {
      type = which;
      mode = 'play';
      pos = 0; carry = 0; score = 0; lives = 3; acc = -600; caught = null; bank = null; newHi = false; bonusAt = 200;
      resetTents();
      R.sound.sfx.start();
    }

    let demoStep = 0, demoGrabs = 0, demoDir = 1;
    function demoMove() {
      demoStep++;
      if (demoStep % 2) return;
      const next = pos + demoDir;
      if (demoDir > 0 && pos === 6) {
        if (tents[4].len >= tents[4].n - 1) { demoDir = -1; demoGrabs = 0; return; }
        grabPose ^= 1;
        if (++demoGrabs >= 3) { demoDir = -1; demoGrabs = 0; }
        return;
      }
      if (demoDir < 0 && pos === 0) { demoDir = 1; return; }
      if (next >= 2) {
        const T = tents[next - 2];
        if (T.len >= T.n - 1) return; // počká
      }
      pos = next;
    }

    function update(dt) {
      t += dt;
      if (bank) { bank.t += dt; if (bank.t > 700) bank = null; }
      if (mode === 'clock') {
        acc += dt;
        if (acc >= 420) { acc -= 420; stepTentacle(true); demoMove(); }
      } else if (mode === 'play') {
        if (caught) {
          caught.t += dt;
          const k = Math.floor(caught.t / 250);
          if (k !== caught.k && k < 7) { caught.k = k; R.sound.sfx.chick(k); }
          if (caught.t >= 2000) {
            caught = null;
            if (lives <= 0) {
              mode = 'over'; overT = 0;
              newHi = R.hi.submit('octo' + type, score);
              R.sound.sfx.eggOver();
              R.haptics.buzz([80, 60, 160]);
            } else {
              pos = 0;
              resetTents();
              acc = -500;
            }
          }
          return;
        }
        acc += dt;
        const iv = interval();
        while (acc >= iv && mode === 'play' && !caught) {
          acc -= iv;
          stepTentacle(false);
          checkCatch();
        }
      } else if (mode === 'over') {
        overT += dt;
      }
    }

    function render() {
      const ctx = scr.begin();
      if (mode === 'off') return;
      const act = [SEG.body];
      tents.forEach((T, i) => { for (let j = 0; j < T.len; j++) act.push(SEG.tent[i][j]); });
      const blinkDiver = caught && Math.floor(caught.t / 160) % 2;
      if (!blinkDiver && mode !== 'over') {
        if (pos === 6) act.push(SEG.grab[grabPose]);
        else {
          act.push(SEG.diver[pos]);
          if (carry > 0) act.push(SEG.bag[pos]);
        }
      }
      const spares = mode === 'clock' ? 2 : Math.max(0, lives - 1);
      for (let i = 0; i < spares; i++) act.push(SEG.spare[i]);
      scr.segs(act);
      octoEyes(ctx, scr.colors.glassTop, scr.colors.on, pos >= 4 ? -1 : 1);
      const now = new Date();
      if (mode === 'clock') {
        scr.digits(DIG, R.clockString(now), now.getMilliseconds() < 500);
      } else {
        const blank = (mode === 'over' && newHi && Math.floor(overT / 400) % 2) || (bank && Math.floor(bank.t / 120) % 2);
        scr.digits(DIG, blank ? '    ' : String(score).padStart(4, ' '), false);
        scr.text(type === 'A' ? 'HRA A' : 'HRA B', type === 'A' ? 196 : 250, 66, 14, true);
      }
    }

    function press(name, rep) {
      if (rep) return;
      if (name === 'sound') { R.sound.toggle(); return; }
      if (name === 'onoff') { app.goMenu(); return; }
      if (name === 'gameA' || name === 'gameB') { start(name === 'gameA' ? 'A' : 'B'); return; }
      if (name === 'left') move(1);
      else if (name === 'right') move(-1);
    }

    function keyMap(e, isDown) {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', Enter: 'gameA', b: 'gameB', m: 'sound' };
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
        pos = 0; carry = 0; caught = null; acc = 0; demoDir = 1; demoGrabs = 0;
        resetTents();
        scr.resize();
        R.sound.sfx.select();
      },
      leave() { input.upAll(); mode = 'off'; },
      pause() { /* LCD hry pauzu nemali */ },
      frame(dt) { update(Math.min(dt, 100)); render(); },
      resize: scr.resize,
      get state() { return { mode, pos, carry, score, lives, caught: !!caught, tents: tents.map((T) => [T.len, T.n]) }; },
      keydown(e) { keyMap(e, true); },
      keyup(e) { keyMap(e, false); }
    };
  };

  R.drawOctoPreview = function (ctx, w, h, t) {
    const sc = Math.min(w / LW, h / LH);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#cbd8d0';
    ctx.fillRect(0, 0, w, h);
    ctx.translate((w - LW * sc) / 2, (h - LH * sc) / 2);
    ctx.scale(sc, sc);
    printed(ctx);
    const step = Math.floor(t / 450);
    ctx.fillStyle = 'rgba(20,24,16,0.9)';
    ctx.beginPath();
    SEG.body(ctx);
    const L = [step % 7, (step + 3) % 6, (step + 1) % 5, (step + 2) % 4, (step + 3) % 4];
    L.forEach((len, i) => { for (let j = 0; j < Math.min(len, TENT[i].n); j++) SEG.tent[i][j](ctx); });
    SEG.diver[(Math.floor(step / 2) % 2) ? 1 : 2](ctx);
    ctx.fill();
    octoEyes(ctx, '#cbd8d0', 'rgba(20,24,16,0.9)', 1);
    ctx.restore();
  };
})(window.Retro);
