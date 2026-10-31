/* Retro Hry – KOCKY: padajúce kocky na matici 10×20, ako na kockovej konzole. */
'use strict';

(function (R) {
  const W = 10, H = 20;
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  const TYPES = Object.keys(SHAPES);

  function rotCW(m) {
    const n = m.length;
    const r = [];
    for (let y = 0; y < n; y++) { r.push([]); for (let x = 0; x < n; x++) r[y][x] = m[n - 1 - x][y]; }
    return r;
  }
  const ROT = {};
  TYPES.forEach((t) => {
    ROT[t] = [SHAPES[t]];
    for (let i = 0; i < 3; i++) ROT[t].push(rotCW(ROT[t][i]));
  });

  // rýchlosť pádu podľa SPEED 1–10 (ms na riadok)
  const GRAVITY = [820, 700, 590, 490, 410, 340, 275, 215, 160, 115];
  const POINTS = [0, 100, 300, 700, 1500];
  const CLEAR_STEP = 42; // ms na krok mazacej animácie

  function create(api) {
    let board, cur, nextType, score, lines, speed, acc, soft, anim;

    function randType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }
    function shape(p) { return ROT[p.type][p.rot]; }

    function collides(p) {
      const sh = shape(p);
      for (let y = 0; y < sh.length; y++) {
        for (let x = 0; x < sh.length; x++) {
          if (!sh[y][x]) continue;
          const bx = p.x + x, by = p.y + y;
          if (bx < 0 || bx >= W || by >= H) return true;
          if (by >= 0 && board[by * W + bx]) return true;
        }
      }
      return false;
    }

    function spawn() {
      const type = nextType;
      nextType = randType();
      const sh = ROT[type][0];
      let top = 0;
      while (top < sh.length && !sh[top].some(Boolean)) top++;
      cur = { type, rot: 0, x: Math.floor((W - sh.length) / 2), y: -top };
      soft = false;
      acc = 0;
      if (collides(cur)) {
        cur = null;
        api.gameOver(score);
      }
    }

    function tryMove(dx, dy) {
      const p = { type: cur.type, rot: cur.rot, x: cur.x + dx, y: cur.y + dy };
      if (collides(p)) return false;
      cur = p;
      return true;
    }

    function tryRotate() {
      const rot = (cur.rot + 1) % 4;
      for (const dx of [0, -1, 1, -2, 2]) {
        const p = { type: cur.type, rot, x: cur.x + dx, y: cur.y };
        if (!collides(p)) { cur = p; return true; }
      }
      return false;
    }

    function lock() {
      const sh = shape(cur);
      for (let y = 0; y < sh.length; y++) {
        for (let x = 0; x < sh.length; x++) {
          if (!sh[y][x]) continue;
          const by = cur.y + y;
          if (by < 0) { cur = null; api.gameOver(score); return; }
          board[by * W + cur.x + x] = 1;
        }
      }
      cur = null;
      api.sfx.land();
      const full = [];
      for (let y = 0; y < H; y++) {
        let ok = true;
        for (let x = 0; x < W; x++) if (!board[y * W + x]) { ok = false; break; }
        if (ok) full.push(y);
      }
      if (full.length) {
        anim = { rows: full, t: 0 };
        api.sfx.clear(full.length);
        if (full.length === 4) api.haptic(60);
      } else {
        spawn();
      }
    }

    function finishClear() {
      const rows = anim.rows;
      anim = null;
      const nb = new Uint8Array(W * H);
      let dst = H - 1;
      for (let y = H - 1; y >= 0; y--) {
        if (rows.indexOf(y) >= 0) continue;
        for (let x = 0; x < W; x++) nb[dst * W + x] = board[y * W + x];
        dst--;
      }
      board = nb;
      score = Math.min(999999, score + POINTS[rows.length] * (1 + Math.floor((speed - 1) / 3)));
      const before = Math.floor(lines / 10);
      lines += rows.length;
      if (Math.floor(lines / 10) > before && speed < 10) {
        speed++;
        setTimeout(() => api.sfx.levelUp(), 260);
      }
      spawn();
    }

    function step() {
      if (!tryMove(0, 1)) lock();
    }

    return {
      start(opts) {
        board = new Uint8Array(W * H);
        score = 0; lines = 0; anim = null;
        speed = opts.speed || 1;
        // LEVEL = počet riadkov "smetí" na začiatku, ako na starých konzolách
        const junk = Math.min(12, (opts.level || 1) - 1);
        for (let y = H - junk; y < H; y++) {
          let holes = 0;
          for (let x = 0; x < W; x++) {
            const v = Math.random() < 0.55 ? 1 : 0;
            board[y * W + x] = v;
            if (!v) holes++;
          }
          if (!holes) board[y * W + R.randInt(0, W - 1)] = 0;
        }
        nextType = randType();
        spawn();
      },
      update(dt) {
        if (anim) {
          anim.t += dt;
          if (anim.t >= CLEAR_STEP * 6) finishClear();
          return;
        }
        if (!cur) return;
        acc += dt;
        const interval = soft ? 32 : GRAVITY[speed - 1];
        while (acc >= interval && cur && !anim) {
          acc -= interval;
          step();
        }
      },
      draw(m, info) {
        m.set(board);
        if (anim) {
          const k = Math.floor(anim.t / CLEAR_STEP);
          for (const y of anim.rows) {
            for (let x = 0; x < W; x++) if (Math.abs(x - 4.5) < k) m[y * W + x] = 0;
          }
        }
        if (cur) {
          const sh = shape(cur);
          for (let y = 0; y < sh.length; y++) for (let x = 0; x < sh.length; x++) {
            const by = cur.y + y;
            if (sh[y][x] && by >= 0 && by < H) m[by * W + cur.x + x] = 1;
          }
        }
        const nx = new Uint8Array(16);
        const ns = ROT[nextType][0];
        const off = ns.length === 2 ? 1 : 0;
        for (let y = 0; y < ns.length; y++) for (let x = 0; x < ns.length; x++) {
          if (ns[y][x]) nx[(y + (nextType === 'I' ? 0 : 1)) * 4 + x + off] = 1;
        }
        info.next = nx;
        info.score = score;
        info.speed = speed;
      },
      press(name, rep) {
        if (!cur || anim) return;
        if (name === 'left' || name === 'right') {
          if (tryMove(name === 'left' ? -1 : 1, 0)) api.sfx.move();
        } else if (name === 'rotate' || name === 'up') {
          if (rep) return;
          if (tryRotate()) api.sfx.rotate();
        } else if (name === 'down') {
          if (rep) return;
          soft = true;
          acc = 0;
          step();
        }
      },
      release(name) {
        if (name === 'down') soft = false;
      },
      get score() { return score; }
    };
  }

  // Ukážka na výberovej obrazovke: kúsok padá na rozostavanú stenu.
  const DEMO_FLOOR = [
    '..........',
    '#.....#...',
    '##...###.#',
    '###.######',
    '####.#####'
  ];
  function demo(t, m) {
    for (let r = 0; r < DEMO_FLOOR.length; r++) {
      for (let x = 0; x < W; x++) m[(H - DEMO_FLOOR.length + r) * W + x] = DEMO_FLOOR[r][x] === '#' ? 1 : 0;
    }
    const cycle = 2400;
    const ph = t % cycle;
    const y = Math.min(16, 7 + Math.floor(ph / 150));
    const sh = ROT.T[ph > 450 ? 2 : 0];
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
      if (sh[yy][xx]) { const yy2 = y + yy; if (yy2 < H) m[yy2 * W + 2 + xx] = 1; }
    }
  }

  R.games = R.games || {};
  R.games.blocks = { id: 'blocks', letter: 'A', title: 'KOCKY', create, demo };
})(window.Retro);
