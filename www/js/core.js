/* Retro Hry – spoločné jadro: ukladanie, zvuk (piezo bzučiak), vibrácie, vstup. */
'use strict';
window.Retro = window.Retro || {};

(function (R) {
  // ---------------------------------------------------------------- ukladanie
  const PREFIX = 'retrohry.';
  R.store = {
    get(key, def) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) { /* nič */ }
    }
  };

  R.hi = {
    get(id) { return R.store.get('hi.' + id, 0) | 0; },
    submit(id, score) {
      const old = R.hi.get(id);
      if (score > old) { R.store.set('hi.' + id, score); return true; }
      return false;
    }
  };

  R.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  R.randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // ---------------------------------------------------------------- vibrácie
  R.haptics = {
    on: R.store.get('vibrate', true),
    buzz(ms) {
      if (!this.on || !navigator.vibrate) return;
      try { navigator.vibrate(ms); } catch (e) { /* nič */ }
    },
    toggle() { this.on = !this.on; R.store.set('vibrate', this.on); return this.on; }
  };

  // ---------------------------------------------------------------- zvuk
  // Staré vreckové hry mali len piezo pípač: obdĺžnikový signál, žiadne obálky,
  // jeden tón naraz. Presne to tu napodobňujeme cez Web Audio.
  R.sound = (function () {
    let ctx = null, master = null;
    let on = R.store.get('sound', true);
    const listeners = [];

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
        master = ctx.createGain();
        master.gain.value = 0.13;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 6500; // piezo neznie tak ostro ako čistý digitálny obdĺžnik
        master.connect(lp);
        lp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* nič */ } }
      return ctx;
    }

    const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function note(n) {
      if (typeof n === 'number') return n;
      if (!n || n === '-') return 0;
      const m = /^([A-G])(#|b)?(\d)$/.exec(n);
      if (!m) return 0;
      let i = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      const midi = 12 * (parseInt(m[3], 10) + 1) + i;
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function tone(freq, dur, o) {
      o = o || {};
      if (!on || !freq) return;
      const c = ensure();
      if (!c) return;
      const t0 = c.currentTime + 0.004 + (o.at || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      const v = o.vol == null ? 1 : o.vol;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(v, t0 + 0.0015);
      g.gain.setValueAtTime(v, t0 + Math.max(0.002, dur - 0.003));
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    // notes: [[nota, dĺžka v dobách], ...], beat = ms na dobu
    function melody(notes, o) {
      o = o || {};
      const beat = (o.beat || 110) / 1000;
      let t = o.at || 0;
      for (const [n, b] of notes) {
        const d = b * beat;
        const f = note(n);
        if (f) tone(f, d * (o.legato || 0.86), { at: t, vol: o.vol });
        t += d;
      }
      return t;
    }

    // "šum" z piezo pípača: rýchlo sa meniace náhodné tóny
    function crunch(dur, o) {
      o = o || {};
      const step = 0.018;
      const n = Math.floor(dur / step);
      for (let i = 0; i < n; i++) {
        const f = (o.lo || 90) + Math.random() * (o.hi || 900) * (1 - i / n);
        tone(f, step, { at: (o.at || 0) + i * step, vol: o.vol == null ? 0.9 : o.vol });
      }
    }

    const sfx = {
      click() { tone(2400, 0.008, { vol: 0.35 }); },
      move() { tone(1900, 0.012, { vol: 0.45 }); },
      rotate() { tone(1250, 0.022, { vol: 0.6 }); },
      land() { tone(260, 0.03, { vol: 0.9 }); },
      select() { tone(1500, 0.03, { vol: 0.6 }); },
      setting() { tone(1100, 0.025, { vol: 0.6 }); tone(1650, 0.025, { at: 0.035, vol: 0.6 }); },
      clear(n) {
        const runs = [
          [['E6', 1], ['G6', 1], ['C7', 2]],
          [['E6', 1], ['G6', 1], ['C7', 1], ['E7', 2]],
          [['C6', 1], ['E6', 1], ['G6', 1], ['C7', 1], ['E7', 2]],
          [['C6', 1], ['E6', 1], ['G6', 1], ['C7', 1], ['G6', 1], ['C7', 1], ['E7', 1], ['G7', 3]]
        ];
        melody(runs[R.clamp(n, 1, 4) - 1], { beat: 42 });
      },
      levelUp() { melody([['G6', 1], ['A6', 1], ['B6', 1], ['D7', 1], ['G7', 3]], { beat: 45 }); },
      pause() { tone(900, 0.05, { vol: 0.6 }); tone(600, 0.06, { at: 0.07, vol: 0.6 }); },
      resume() { tone(600, 0.05, { vol: 0.6 }); tone(900, 0.06, { at: 0.07, vol: 0.6 }); },
      powerOn() {
        melody([
          ['C6', 1], ['G5', 1], ['C6', 1], ['E6', 1], ['G6', 2], ['-', 1],
          ['E6', 1], ['G6', 1], ['C7', 3]
        ], { beat: 75 });
      },
      start() {
        melody([['G5', 1], ['C6', 1], ['E6', 1], ['G6', 1], ['E6', 1], ['G6', 1], ['C7', 3]], { beat: 70 });
      },
      gameOver() {
        melody([
          ['G6', 2], ['F6', 2], ['E6', 2], ['D6', 2], ['C6', 1], ['-', 1],
          ['G5', 1], ['E5', 1], ['C5', 6]
        ], { beat: 95 });
      },
      engine() { tone(95, 0.011, { vol: 0.35 }); },
      pass() { tone(2200, 0.014, { vol: 0.35 }); },
      crash() {
        crunch(0.65, { lo: 70, hi: 1100 });
        tone(700, 0.5, { at: 0.7, to: 60, vol: 0.8 });
      },
      eggStep(chute) {
        const f = [784, 659, 1047, 880][chute] || 800;
        tone(f, 0.034, { vol: 0.7 });
      },
      catchEgg() { tone(1568, 0.025, { vol: 0.7 }); tone(2093, 0.03, { at: 0.03, vol: 0.7 }); },
      eggBreak() { crunch(0.18, { lo: 120, hi: 500, vol: 0.8 }); },
      chick(i) { tone(i % 2 ? 1320 : 990, 0.07, { vol: 0.65 }); },
      bonus() {
        melody([['C7', 1], ['-', 1], ['C7', 1], ['-', 1], ['E7', 1], ['G7', 3]], { beat: 55 });
      },
      eggOver() {
        melody([['E6', 2], ['-', 1], ['C6', 2], ['-', 1], ['A5', 2], ['-', 1], ['F5', 6]], { beat: 85 });
      }
    };

    return {
      unlock: ensure,
      tone, melody, note, sfx,
      get on() { return on; },
      toggle() {
        on = !on;
        R.store.set('sound', on);
        if (on) { ensure(); sfx.select(); }
        listeners.forEach((f) => f(on));
        return on;
      },
      onChange(f) { listeners.push(f); }
    };
  })();

  // ---------------------------------------------------------------- vstup
  // Tlačidlá s auto-opakovaním. target.press(meno, jeOpakovanie), target.release(meno)
  R.Input = function (target) {
    const held = {};
    function down(name, repeatable) {
      if (held[name]) return;
      const h = held[name] = { timer: null };
      target.press(name, false);
      if (repeatable) {
        const rep = () => {
          if (held[name] !== h) return;
          target.press(name, true);
          h.timer = setTimeout(rep, 55);
        };
        h.timer = setTimeout(rep, 165);
      }
    }
    function up(name) {
      const h = held[name];
      if (!h) return;
      clearTimeout(h.timer);
      delete held[name];
      if (target.release) target.release(name);
    }
    function upAll() { Object.keys(held).forEach(up); }
    function isDown(name) { return !!held[name]; }
    return { down, up, upAll, isDown };
  };

  // Napojí všetky [data-btn] v koreňovom elemente na Input.
  R.bindButtons = function (root, input) {
    root.querySelectorAll('[data-btn]').forEach((el) => {
      const name = el.dataset.btn;
      const repeatable = el.dataset.repeat === '1';
      let pid = null;
      const release = () => {
        if (pid === null) return;
        pid = null;
        el.classList.remove('is-down');
        input.up(name);
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (pid !== null) return;
        pid = e.pointerId;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* nič */ }
        el.classList.add('is-down');
        R.sound.unlock();
        R.haptics.buzz(8);
        input.down(name, repeatable);
      });
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      // klávesnica / čítačky obrazovky: Enter a medzerník na zameranom tlačidle
      el.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault(); e.stopPropagation();
          el.classList.add('is-down'); input.down(name, false);
        }
      });
      el.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); e.stopPropagation();
          el.classList.remove('is-down'); input.up(name);
        }
      });
    });
  };

  // Pomocník pre ostré plátno na displejoch s vysokou hustotou.
  R.fitCanvas = function (canvas, cssW, cssH) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    return dpr;
  };
})(window.Retro);
