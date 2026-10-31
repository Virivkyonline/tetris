/* Retro Hry – kockovej konzola: výber hry, SPEED/LEVEL, pauza, "opona" pri konci hry. */
'use strict';

(function (R) {
  const W = 10, H = 20;
  const GLYPH = {
    A: ['.###.', '#...#', '#####', '#...#', '#...#'],
    B: ['####.', '#...#', '####.', '#...#', '####.']
  };

  R.BrickConsole = function (root, app) {
    const canvas = root.querySelector('canvas');
    const holder = root.querySelector('.lcd-holder');
    const lcd = R.BrickLCD(canvas);
    const games = [R.games.blocks, R.games.racing];
    const m = new Uint8Array(W * H);
    const info = {};
    let gi = 0;
    let mode = 'off'; // off | select | play | pause | curtain
    let game = null, gameDef = null;
    let t = 0, lastScore = 0;
    let curtain = null;
    let settings = R.store.get('brick.settings', { blocks: { speed: 1, level: 1 }, racing: { speed: 1, level: 1 } });
    let colorIdx = R.store.get('brick.color', 0);
    const COLORS = ['yellow', 'red', 'blue', 'green', 'gray'];

    const input = R.Input({ press, release });
    R.bindButtons(root, input);

    // farba "plastu" – ťuknutím na logo
    const brand = root.querySelector('[data-action="color"]');
    function applyColor() { root.dataset.color = COLORS[colorIdx % COLORS.length]; }
    applyColor();
    if (brand) {
      brand.addEventListener('click', () => {
        colorIdx = (colorIdx + 1) % COLORS.length;
        R.store.set('brick.color', colorIdx);
        applyColor();
        R.sound.sfx.click();
      });
    }

    function cfg() { return settings[games[gi].id]; }
    function saveSettings() { R.store.set('brick.settings', settings); }

    const api = {
      get sfx() { return R.sound.sfx; },
      haptic(ms) { R.haptics.buzz(ms); },
      gameOver(score) {
        if (mode !== 'play') return;
        lastScore = score;
        R.hi.submit(gameDef.id, score);
        R.sound.sfx.gameOver();
        R.haptics.buzz([80, 60, 160]);
        runCurtain(() => { game = null; mode = 'select'; }, true);
      }
    };

    // ----------------------------------------------------------- opona
    // Plocha sa zaplní zdola nahor a potom zhora nadol vyprázdni.
    function runCurtain(then, over) {
      mode = 'curtain';
      curtain = { t: 0, then, over: !!over };
    }

    function curtainDraw() {
      const per = 26;
      const k = Math.floor(curtain.t / per);
      if (k < H) {
        // plnenie zdola
        for (let y = H - 1; y >= H - 1 - k; y--) for (let x = 0; x < W; x++) m[y * W + x] = 1;
      } else {
        m.fill(0);
        const k2 = k - H;
        for (let y = k2; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = 1;
        if (k2 >= H) {
          const fn = curtain.then;
          curtain = null;
          fn();
        }
      }
    }

    // ----------------------------------------------------------- výber hry
    function selectDraw() {
      m.fill(0);
      const def = games[gi];
      def.demo(t, m);
      const g = GLYPH[def.letter];
      if (Math.floor(t / 500) % 4 !== 3) {
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') m[(1 + r) * W + 2 + c] = 1;
      }
    }

    function startGame() {
      gameDef = games[gi];
      game = gameDef.create(api);
      const c = cfg();
      R.sound.sfx.start();
      runCurtain(() => {
        game.start({ speed: c.speed, level: c.level });
        mode = 'play';
      });
    }

    // ----------------------------------------------------------- vstup
    function press(name, rep) {
      if (name === 'sound') { if (!rep) R.sound.toggle(); return; }
      if (name === 'onoff') { if (!rep) app.goMenu(); return; }
      if (mode === 'curtain' || mode === 'off') return;
      if (name === 'reset') {
        if (rep) return;
        if (mode === 'play' || mode === 'pause') {
          lastScore = game ? game.score : 0;
          game = null;
          R.sound.sfx.select();
          runCurtain(() => { mode = 'select'; });
        }
        return;
      }
      if (mode === 'select') {
        if (rep) return;
        const c = cfg();
        if (name === 'left' || name === 'right') {
          gi = (gi + (name === 'left' ? games.length - 1 : 1)) % games.length;
          lastScore = 0;
          R.sound.sfx.select();
          app.onBrickGame && app.onBrickGame(games[gi].id);
        } else if (name === 'up') {
          c.speed = c.speed % 10 + 1; saveSettings(); R.sound.sfx.setting();
        } else if (name === 'down') {
          c.level = c.level % 10 + 1; saveSettings(); R.sound.sfx.setting();
        } else if (name === 'rotate' || name === 'start') {
          startGame();
        }
        return;
      }
      if (mode === 'play') {
        if (name === 'start') {
          if (rep) return;
          mode = 'pause';
          input.upAll();
          R.sound.sfx.pause();
          return;
        }
        game.press(name, rep);
        return;
      }
      if (mode === 'pause') {
        if (!rep && (name === 'start' || name === 'rotate')) {
          mode = 'play';
          R.sound.sfx.resume();
        }
      }
    }

    function release(name) {
      if (mode === 'play' && game) game.release(name);
    }

    // ----------------------------------------------------------- slučka
    function frame(dt) {
      t += dt;
      for (const k in info) delete info[k];
      info.sound = R.sound.on;
      if (mode === 'play') game.update(dt); // môže prepnúť na "oponu" (koniec hry)
      if (mode === 'select') {
        selectDraw();
        const c = cfg();
        info.score = lastScore;
        info.hi = R.hi.get(games[gi].id);
        info.speed = c.speed;
        info.level = c.level;
      } else if (mode === 'play' || mode === 'pause') {
        game.draw(m, info);
        info.hi = Math.max(R.hi.get(gameDef.id), info.score || 0);
        info.level = cfg().level;
        if (mode === 'pause') info.pause = Math.floor(t / 450) % 2 === 0;
      } else if (mode === 'curtain') {
        curtain.t += dt;
        if (game && curtain.over) { game.draw(m, info); }
        info.hi = R.hi.get((gameDef || games[gi]).id);
        if (curtain.over) { info.over = true; info.score = lastScore; }
        info.speed = cfg().speed; info.level = cfg().level;
        curtainDraw();
      } else {
        m.fill(0);
      }
      lcd.draw(m, info);
    }

    function resize() {
      const r = holder.getBoundingClientRect();
      lcd.layout(r.width, r.height);
    }

    function keyMap(e, isDown) {
      const k = e.key;
      const map = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
        ' ': 'rotate', x: 'rotate', k: 'rotate',
        Enter: 'start', p: 'start', r: 'reset', m: 'sound'
      };
      const name = map[k] || map[k.toLowerCase && k.toLowerCase()];
      if (k === 'Escape' || k === 'Backspace') { if (isDown) app.goMenu(); e.preventDefault(); return; }
      if (!name) return;
      e.preventDefault();
      if (isDown) { if (!e.repeat) { R.sound.unlock(); input.down(name, name === 'left' || name === 'right' || name === 'down'); } }
      else input.up(name);
    }

    return {
      enter(gameId) {
        const idx = games.findIndex((g) => g.id === gameId);
        gi = idx >= 0 ? idx : 0;
        game = null; lastScore = 0; t = 0;
        m.fill(0);
        resize();
        R.sound.sfx.powerOn();
        runCurtain(() => { mode = 'select'; });
      },
      leave() {
        input.upAll();
        mode = 'off';
        game = null;
      },
      pause() {
        if (mode === 'play') { mode = 'pause'; input.upAll(); }
      },
      frame, resize,
      keydown(e) { keyMap(e, true); },
      keyup(e) { keyMap(e, false); }
    };
  };
})(window.Retro);
