/* Retro Hry – FORMULKY: pretekárske autíčko z kociek, dva pruhy, protiidúce autá. */
'use strict';

(function (R) {
  const W = 10, H = 20;
  // autíčko 3×4 z kociek
  const CAR = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
    [1, 0, 1]
  ];
  const LANE_X = [2, 5];
  const PLAYER_Y = 16;
  // ms na posun cesty pre SPEED 1–10
  const STEP = [210, 180, 156, 136, 118, 102, 89, 78, 68, 60];
  const BOOM = [
    [[1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1]],
    [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]]
  ];

  function drawCar(m, x, y) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const yy = y + r;
      if (CAR[r][c] && yy >= 0 && yy < H) m[yy * W + x + c] = 1;
    }
  }

  function drawBorders(m, scroll) {
    for (let y = 0; y < H; y++) {
      const on = ((y - scroll) % 4 + 4) % 4 !== 3 ? 1 : 0;
      m[y * W] = on;
      m[y * W + W - 1] = on;
    }
  }

  function create(api) {
    let lane, enemies, scroll, acc, speed, level, score, lives, passed, turbo, brake, crash, untilNext, nextLane, lastLane, tickN, startSpeed;

    function planNext() {
      lastLane = nextLane;
      nextLane = Math.random() < 0.5 ? 0 : 1;
      const dense = Math.floor((level - 1) / 3); // vyšší LEVEL = hustejšia premávka
      untilNext = nextLane === lastLane ? R.randInt(6, 10 - dense) : R.randInt(11, 15 - dense);
    }

    function resetRound() {
      enemies = [];
      crash = null;
      acc = 0;
      nextLane = Math.random() < 0.5 ? 0 : 1;
      untilNext = 5;
    }

    function hit() {
      for (const e of enemies) {
        if (e.lane !== lane) continue;
        const dy = e.y - PLAYER_Y;
        if (dy > -4 && dy < 4) {
          // presná kontrola kociek
          for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
            const er = r - dy;
            if (CAR[r][c] && er >= 0 && er < 4 && CAR[er][c]) return true;
          }
        }
      }
      return false;
    }

    function doCrash() {
      lives--;
      crash = { t: 0 };
      api.sfx.crash();
      api.haptic(320);
    }

    function tick() {
      tickN++;
      scroll = (scroll + 1) % 4;
      for (const e of enemies) e.y++;
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y >= H) {
          enemies.splice(i, 1);
          passed++;
          score = Math.min(999999, score + speed);
          api.sfx.pass();
          if (passed % 12 === 0 && speed < 10) {
            speed++;
            setTimeout(() => api.sfx.levelUp(), 60);
          }
        }
      }
      untilNext--;
      if (untilNext <= 0) {
        enemies.push({ lane: nextLane, y: -4 });
        planNext();
      }
      if (tickN % 2 === 0) api.sfx.engine();
      if (hit()) doCrash();
    }

    return {
      start(opts) {
        speed = startSpeed = opts.speed || 1;
        level = opts.level || 1;
        lane = 0; scroll = 0; score = 0; lives = 4; passed = 0; tickN = 0;
        turbo = false; brake = false;
        nextLane = 0; lastLane = 0;
        resetRound();
      },
      update(dt) {
        if (crash) {
          crash.t += dt;
          if (crash.t >= 1500) {
            if (lives > 0) resetRound();
            else { crash.t = 1500; api.gameOver(score); }
          }
          return;
        }
        acc += dt;
        let interval = STEP[speed - 1];
        if (turbo) interval *= 0.45;
        else if (brake) interval *= 1.7;
        while (acc >= interval && !crash) {
          acc -= interval;
          tick();
        }
      },
      draw(m, info) {
        m.fill(0);
        drawBorders(m, scroll);
        for (const e of enemies) drawCar(m, LANE_X[e.lane], e.y);
        if (crash) {
          const blink = Math.floor(crash.t / 110) % 2;
          const bx = lane === 0 ? 1 : 5;
          const pat = BOOM[blink];
          for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
            m[(PLAYER_Y + r) * W + bx + c] = pat[r][c];
          }
        } else {
          drawCar(m, LANE_X[lane], PLAYER_Y);
        }
        // životy v okienku NEXT
        const nx = new Uint8Array(16);
        for (let i = 0; i < 4; i++) if (i < lives) { nx[4 + i] = 1; nx[8 + i] = 1; }
        info.next = nx;
        info.score = score;
        info.speed = speed;
      },
      press(name, rep) {
        if (crash) return;
        if (rep) return;
        if (name === 'left' || name === 'right') {
          const nl = name === 'left' ? 0 : 1;
          if (nl !== lane) {
            lane = nl;
            api.sfx.move();
            if (hit()) doCrash();
          }
        } else if (name === 'rotate' || name === 'up') {
          turbo = true;
        } else if (name === 'down') {
          brake = true;
        }
      },
      release(name) {
        if (name === 'rotate' || name === 'up') turbo = false;
        if (name === 'down') brake = false;
      },
      get score() { return score; },
      get startSpeed() { return startSpeed; }
    };
  }

  function demo(t, m) {
    const step = Math.floor(t / 120);
    drawBorders(m, step % 4);
    for (let y = 7; y < H; y++) for (let x = 1; x < W - 1; x++) m[y * W + x] = 0;
    const ey = 7 + (step % 14);
    if (ey < H) drawCar(m, LANE_X[0], ey);
    drawCar(m, LANE_X[1], PLAYER_Y);
  }

  R.games = R.games || {};
  R.games.racing = { id: 'racing', letter: 'B', title: 'FORMULKY', create, demo };
})(window.Retro);
