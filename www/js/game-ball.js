/* Retro Hry – LOPTIČKA: pálka dole, loptička z jednej kocky rozbíja tehličky (hra C na kockovej konzole). */
'use strict';

(function (R) {
  const W = 10, H = 20;
  const PADDLE_Y = H - 1;
  const STEP = [190, 168, 150, 134, 120, 107, 96, 86, 77, 69];
  // vzory tehličiek (riadky zhora), '#' = tehlička
  const PATTERNS = [
    ['##########', '##########', '##########', '##########'],
    ['#.#.#.#.#.', '.#.#.#.#.#', '#.#.#.#.#.', '.#.#.#.#.#', '#.#.#.#.#.'],
    ['##########', '#........#', '#.######.#', '#.#....#.#', '#.######.#', '#........#'],
    ['....##....', '...####...', '..######..', '.########.', '##########', '.########.', '..######..'],
    ['##.####.##', '##.####.##', '..........', '##.####.##', '##.####.##', '..........', '##########'],
    ['#########.', '.#########', '#########.', '.#########', '#########.', '.#########', '#########.']
  ];

  function create(api) {
    let bricks, paddle, ball, dx, dy, stuck, lives, score, speed, stage, acc, flash;

    function loadStage() {
      bricks = new Uint8Array(W * H);
      const p = PATTERNS[stage % PATTERNS.length];
      for (let r = 0; r < p.length; r++) for (let c = 0; c < W; c++) if (p[r][c] === '#') bricks[(r + 1) * W + c] = 1;
      resetBall();
    }
    function resetBall() {
      paddle = 3;
      ball = { x: 4, y: PADDLE_Y - 1 };
      dx = Math.random() < 0.5 ? -1 : 1;
      dy = -1;
      stuck = true;
      acc = 0;
    }
    function brickAt(x, y) { return x >= 0 && x < W && y >= 0 && y < H && bricks[y * W + x]; }
    function hit(x, y) {
      bricks[y * W + x] = 0;
      score = Math.min(999999, score + 10 * (1 + Math.floor((speed - 1) / 3)));
      api.sfx.move();
    }
    function bricksLeft() { for (let i = 0; i < W * H; i++) if (bricks[i]) return true; return false; }

    function step() {
      // steny
      if (ball.x + dx < 0 || ball.x + dx >= W) dx = -dx;
      if (ball.y + dy < 0) dy = 1;
      // tehličky: najprv vodorovne, potom zvisle, potom roh
      let bounced = false;
      if (brickAt(ball.x + dx, ball.y)) { hit(ball.x + dx, ball.y); dx = -dx; bounced = true; }
      if (brickAt(ball.x, ball.y + dy)) { hit(ball.x, ball.y + dy); dy = -dy; bounced = true; }
      if (!bounced && brickAt(ball.x + dx, ball.y + dy)) { hit(ball.x + dx, ball.y + dy); dx = -dx; dy = -dy; bounced = true; }
      if (bounced) {
        if (ball.x + dx < 0 || ball.x + dx >= W) dx = -dx;
        if (ball.y + dy < 0) dy = 1;
      }
      // pálka
      if (dy > 0 && ball.y + dy === PADDLE_Y) {
        const nx = ball.x + dx;
        if (nx >= paddle && nx <= paddle + 2) {
          dy = -1;
          if (nx === paddle) dx = -1;
          else if (nx === paddle + 2) dx = 1;
          api.sfx.rotate();
          return;
        }
        if ((nx === paddle - 1 && dx > 0) || (nx === paddle + 3 && dx < 0)) { // roh pálky
          dy = -1; dx = -dx;
          api.sfx.rotate();
          return;
        }
      }
      if (!brickAt(ball.x + dx, ball.y + dy)) {
        ball.x += dx; ball.y += dy;
      }
      if (ball.y >= PADDLE_Y) {
        lives--;
        flash = 900;
        api.sfx.crash();
        api.haptic(200);
        if (lives <= 0) { api.gameOver(score); return; }
      }
    }

    return {
      start(opts) {
        speed = opts.speed || 1;
        stage = (opts.level || 1) - 1;
        lives = 3; score = 0; flash = 0;
        loadStage();
      },
      update(dt) {
        if (flash > 0) {
          flash -= dt;
          if (flash <= 0 && lives > 0) resetBall();
          return;
        }
        if (stuck) { ball.x = paddle + 1; ball.y = PADDLE_Y - 1; return; }
        acc += dt;
        const iv = STEP[speed - 1];
        while (acc >= iv && flash <= 0 && !stuck) {
          acc -= iv;
          step();
          if (lives <= 0) return;
          if (!bricksLeft()) {
            stage++;
            score += 500;
            if (speed < 10) speed++;
            api.sfx.levelUp();
            loadStage();
            return;
          }
        }
      },
      draw(m, info) {
        m.set(bricks);
        for (let c = 0; c < 3; c++) m[PADDLE_Y * W + paddle + c] = 1;
        const showBall = flash <= 0 || Math.floor(flash / 120) % 2;
        if (showBall && ball.y >= 0 && ball.y < H) m[ball.y * W + ball.x] = 1;
        const nx = new Uint8Array(16);
        for (let i = 0; i < Math.min(lives, 4); i++) { nx[4 + i] = 1; nx[8 + i] = 1; }
        info.next = nx;
        info.score = score;
        info.speed = speed;
      },
      press(name) {
        if (flash > 0) return;
        if (name === 'left' && paddle > 0) { paddle--; api.sfx.click(); }
        else if (name === 'right' && paddle < W - 3) { paddle++; api.sfx.click(); }
        else if ((name === 'rotate' || name === 'up') && stuck) { stuck = false; acc = 0; api.sfx.select(); }
      },
      release() {},
      get score() { return score; }
    };
  }

  function demo(t, m) {
    const row = ['##.####.##', '#.######.#'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < W; c++) m[(8 + r) * W + c] = row[r][c] === '#' ? 1 : 0;
    // loptička lieta medzi pálkou a tehličkami
    const k = Math.floor(t / 140) % 16;
    const y = k < 8 ? 18 - k : 3 + k;
    const x = [3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2][k];
    const yy = Math.min(18, Math.max(11, y));
    m[yy * W + x] = 1;
    const p = Math.max(0, Math.min(7, x - 1));
    for (let c = 0; c < 3; c++) m[19 * W + p + c] = 1;
  }

  R.games = R.games || {};
  R.games.ball = { id: 'ball', letter: 'C', title: 'LOPTIČKA', create, demo };
})(window.Retro);
