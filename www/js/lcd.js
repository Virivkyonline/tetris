/* Retro Hry – LCD displej kockovej konzoly (matica 10×20 + bočný panel)
   a 7-segmentové číslice spoločné pre všetky hry. */
'use strict';

(function (R) {
  // ------------------------------------------------------------ 7 segmentov
  const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

  function segPath(ctx, x, y, w, h, mask) {
    const t = Math.max(1, w * 0.23);
    const g = t * 0.14;
    const sk = w * 0.14; // mierne šikmé číslice ako na starých LCD
    const L = x + t / 2, Rr = x + w - t / 2 - sk, T = y + t / 2, M = y + h / 2, B = y + h - t / 2;
    const P = (px, py) => [px + sk * (1 - (py - y) / h), py];
    const poly = (pts) => {
      let p = P(pts[0][0], pts[0][1]);
      ctx.moveTo(p[0], p[1]);
      for (let i = 1; i < pts.length; i++) { p = P(pts[i][0], pts[i][1]); ctx.lineTo(p[0], p[1]); }
      ctx.closePath();
    };
    const hs = (x1, x2, yy) => poly([[x1, yy], [x1 + t / 2, yy - t / 2], [x2 - t / 2, yy - t / 2], [x2, yy], [x2 - t / 2, yy + t / 2], [x1 + t / 2, yy + t / 2]]);
    const vs = (xx, y1, y2) => poly([[xx, y1], [xx + t / 2, y1 + t / 2], [xx + t / 2, y2 - t / 2], [xx, y2], [xx - t / 2, y2 - t / 2], [xx - t / 2, y1 + t / 2]]);
    if (mask & 1) hs(L + g, Rr - g, T);
    if (mask & 2) vs(Rr, T + g, M - g);
    if (mask & 4) vs(Rr, M + g, B - g);
    if (mask & 8) hs(L + g, Rr - g, B);
    if (mask & 16) vs(L, M + g, B - g);
    if (mask & 32) vs(L, T + g, M - g);
    if (mask & 64) hs(L + g, Rr - g, M);
  }

  R.seg = {
    DIGITS,
    digit(ctx, x, y, w, h, mask, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      segPath(ctx, x, y, w, h, mask);
      ctx.fill();
    },
    // Číslo zarovnané doprava na n miest, bez úvodných núl (ako na LCD).
    number(ctx, x, y, dw, dh, gap, value, n, color, opts) {
      opts = opts || {};
      const s = String(Math.max(0, Math.floor(value)));
      const str = opts.zeros ? s.padStart(n, '0').slice(-n) : s.slice(-n).padStart(n, ' ');
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ch = str[i];
        if (ch === ' ') continue;
        segPath(ctx, x + i * (dw + gap), y, dw, dh, DIGITS[+ch]);
      }
      ctx.fill();
    },
    ghost(ctx, x, y, dw, dh, gap, n, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < n; i++) segPath(ctx, x + i * (dw + gap), y, dw, dh, 0x7f);
      ctx.fill();
    }
  };

  // ------------------------------------------------------------ farby LCD
  const C = R.LCD_COLORS = {
    bgTop: '#b7c09f',
    bgBot: '#a2ac89',
    on: 'rgba(16,21,11,0.9)',
    off: 'rgba(16,21,11,0.07)',
    shadow: 'rgba(16,21,11,0.13)',
    ink: 'rgba(16,21,11,0.82)'
  };

  // Jedna "kocka" ako na starých hrách: rámik + vnútorný štvorček.
  function cell(ctx, x, y, s) {
    const g = s * 0.07;
    const x0 = x + g, y0 = y + g, w = s - 2 * g;
    const b = Math.max(1, w * 0.13);
    ctx.fillRect(x0, y0, w, b);
    ctx.fillRect(x0, y0 + w - b, w, b);
    ctx.fillRect(x0, y0 + b, b, w - 2 * b);
    ctx.fillRect(x0 + w - b, y0 + b, b, w - 2 * b);
    const i0 = w * 0.29;
    ctx.fillRect(x0 + i0, y0 + i0, w - 2 * i0, w - 2 * i0);
  }
  R.lcdCell = cell;

  function lcdBackground(ctx, w, h) {
    const gr = ctx.createLinearGradient(0, 0, w * 0.3, h);
    gr.addColorStop(0, C.bgTop);
    gr.addColorStop(1, C.bgBot);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }
  R.lcdBackground = lcdBackground;

  // Malá matica (náhľady v menu).
  R.drawMiniMatrix = function (ctx, x, y, s, m, cols, rows) {
    ctx.fillStyle = C.off;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!m[r * cols + c]) cell(ctx, x + c * s, y + r * s, s);
    ctx.fillStyle = C.shadow;
    const o = s * 0.1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (m[r * cols + c]) cell(ctx, x + c * s + o, y + r * s + o, s);
    ctx.fillStyle = C.on;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (m[r * cols + c]) cell(ctx, x + c * s, y + r * s, s);
  };

  // ------------------------------------------------------------ ikonky panelu
  function cupPath(ctx, x, y, s) { // šálka kávy = pauza
    ctx.beginPath();
    // para
    ctx.moveTo(x + s * 0.32, y + s * 0.05);
    ctx.quadraticCurveTo(x + s * 0.22, y + s * 0.15, x + s * 0.32, y + s * 0.25);
    ctx.quadraticCurveTo(x + s * 0.42, y + s * 0.35, x + s * 0.32, y + s * 0.42);
    ctx.moveTo(x + s * 0.55, y + s * 0.05);
    ctx.quadraticCurveTo(x + s * 0.45, y + s * 0.15, x + s * 0.55, y + s * 0.25);
    ctx.quadraticCurveTo(x + s * 0.65, y + s * 0.35, x + s * 0.55, y + s * 0.42);
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, y + s * 0.5);
    ctx.lineTo(x + s * 0.76, y + s * 0.5);
    ctx.lineTo(x + s * 0.7, y + s * 0.86);
    ctx.lineTo(x + s * 0.18, y + s * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.78, y + s * 0.64, s * 0.1, -Math.PI / 2, Math.PI / 2);
    ctx.lineWidth = s * 0.06;
    ctx.stroke();
    ctx.fillRect(x + s * 0.04, y + s * 0.9, s * 0.84, s * 0.06);
  }

  function notePath(ctx, x, y, s) { // nota = zvuk zapnutý
    ctx.beginPath();
    ctx.ellipse(x + s * 0.28, y + s * 0.78, s * 0.16, s * 0.11, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.74, y + s * 0.68, s * 0.16, s * 0.11, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + s * 0.39, y + s * 0.12, s * 0.06, s * 0.66);
    ctx.fillRect(x + s * 0.85, y + s * 0.04, s * 0.06, s * 0.64);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.39, y + s * 0.12);
    ctx.lineTo(x + s * 0.91, y + s * 0.04);
    ctx.lineTo(x + s * 0.91, y + s * 0.18);
    ctx.lineTo(x + s * 0.39, y + s * 0.26);
    ctx.closePath();
    ctx.fill();
  }

  // ------------------------------------------------------------ displej konzoly
  const COLS = 10, ROWS = 20;
  const PAD = 0.6, GAP = 0.9, PANEL = 5.7;
  const UW = PAD * 2 + COLS + GAP + PANEL;
  const UH = PAD * 2 + ROWS;

  R.BrickLCD = function (canvas) {
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas');
    const bctx = bg.getContext('2d');
    let s = 10; // veľkosť bunky v pixeloch zariadenia
    let L = null;

    function layout(availW, availH) {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      s = Math.max(4, Math.floor(Math.min(availW / UW, availH / UH) * dpr));
      // LCD sklo vyplní celý rámik, obsah je v strede
      const w = Math.max(Math.ceil(UW * s), Math.floor(availW * dpr));
      const h = Math.max(Math.ceil(UH * s), Math.floor(availH * dpr));
      canvas.width = w; canvas.height = h;
      canvas.style.width = (w / dpr) + 'px';
      canvas.style.height = (h / dpr) + 'px';
      bg.width = w; bg.height = h;
      const ox = Math.floor((w - UW * s) / 2), oy = Math.floor((h - UH * s) / 2);
      const mx = ox + Math.round(PAD * s), my = oy + Math.round(PAD * s);
      const px = mx + COLS * s + GAP * s;
      L = {
        mx, my, px, w, h,
        score: { x: px, y: my + 0.95 * s, dw: 0.8 * s, dh: 1.55 * s, gap: 0.13 * s },
        hi: { x: px, y: my + 3.75 * s, dw: 0.8 * s, dh: 1.55 * s, gap: 0.13 * s },
        next: { x: px + 0.85 * s, y: my + 6.75 * s, s: Math.floor(0.98 * s) },
        speed: { x: px + 0.15 * s, y: my + 12.0 * s, dw: 0.8 * s, dh: 1.45 * s, gap: 0.14 * s },
        level: { x: px + 3.05 * s, y: my + 12.0 * s, dw: 0.8 * s, dh: 1.45 * s, gap: 0.14 * s },
        cup: { x: px + 0.15 * s, y: my + 14.7 * s, s: 2.3 * s },
        note: { x: px + 3.1 * s, y: my + 14.85 * s, s: 2.0 * s },
        over: { x: px + PANEL * s / 2, y: my + 18.55 * s }
      };
      buildBackground();
    }

    function label(c, text, x, y, size, align) {
      c.font = `700 ${size}px Arial, Helvetica, sans-serif`;
      c.textAlign = align || 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(text, x, y);
    }

    function buildBackground() {
      const c = bctx;
      lcdBackground(c, L.w, L.h);
      // rámik okolo hracej plochy
      c.strokeStyle = C.ink;
      c.lineWidth = Math.max(1, s * 0.07);
      const fr = s * 0.22;
      c.strokeRect(L.mx - fr, L.my - fr, COLS * s + fr * 2, ROWS * s + fr * 2);
      // vypnuté bunky
      c.fillStyle = C.off;
      for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) cell(c, L.mx + k * s, L.my + r * s, s);
      // panel – popisy
      c.fillStyle = C.ink;
      const fs = Math.round(s * 0.66);
      label(c, 'SCORE', L.px, L.my + 0.62 * s, fs);
      label(c, 'HI-SCORE', L.px, L.my + 3.42 * s, fs);
      label(c, 'NEXT', L.px, L.my + 6.42 * s, fs);
      label(c, 'SPEED', L.px, L.my + 11.65 * s, fs);
      label(c, 'LEVEL', L.px + 2.95 * s, L.my + 11.65 * s, fs);
      // duchovia číslic a ikon
      R.seg.ghost(c, L.score.x, L.score.y, L.score.dw, L.score.dh, L.score.gap, 6, C.off);
      R.seg.ghost(c, L.hi.x, L.hi.y, L.hi.dw, L.hi.dh, L.hi.gap, 6, C.off);
      R.seg.ghost(c, L.speed.x, L.speed.y, L.speed.dw, L.speed.dh, L.speed.gap, 2, C.off);
      R.seg.ghost(c, L.level.x, L.level.y, L.level.dw, L.level.dh, L.level.gap, 2, C.off);
      c.fillStyle = C.off;
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) cell(c, L.next.x + k * L.next.s, L.next.y + r * L.next.s, L.next.s);
      c.fillStyle = C.off; c.strokeStyle = C.off;
      cupPath(c, L.cup.x, L.cup.y, L.cup.s);
      notePath(c, L.note.x, L.note.y, L.note.s);
      label(c, 'GAME OVER', L.over.x, L.over.y, Math.round(s * 0.72), 'center');
    }

    function cells(m, x0, y0, cs, cols, rows) {
      const o = Math.max(1, cs * 0.09);
      ctx.fillStyle = C.shadow;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (m[r * cols + k]) cell(ctx, x0 + k * cs + o, y0 + r * cs + o, cs);
      ctx.fillStyle = C.on;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (m[r * cols + k]) cell(ctx, x0 + k * cs, y0 + r * cs, cs);
    }

    function num(spec, v, n) {
      const o = Math.max(1, s * 0.08);
      R.seg.number(ctx, spec.x + o, spec.y + o, spec.dw, spec.dh, spec.gap, v, n, C.shadow);
      R.seg.number(ctx, spec.x, spec.y, spec.dw, spec.dh, spec.gap, v, n, C.on);
    }

    function draw(m, info) {
      if (!L) return;
      ctx.drawImage(bg, 0, 0);
      cells(m, L.mx, L.my, s, COLS, ROWS);
      if (info.score != null) num(L.score, info.score, 6);
      if (info.hi != null) num(L.hi, info.hi, 6);
      if (info.speed != null) num(L.speed, info.speed, 2);
      if (info.level != null) num(L.level, info.level, 2);
      if (info.next) cells(info.next, L.next.x, L.next.y, L.next.s, 4, 4);
      ctx.fillStyle = C.on; ctx.strokeStyle = C.on;
      if (info.pause) cupPath(ctx, L.cup.x, L.cup.y, L.cup.s);
      if (info.sound) { ctx.fillStyle = C.on; notePath(ctx, L.note.x, L.note.y, L.note.s); }
      if (info.over) { ctx.fillStyle = C.on; label(ctx, 'GAME OVER', L.over.x, L.over.y, Math.round(s * 0.72), 'center'); }
    }

    return { layout, draw, get cellSize() { return s; } };
  };
})(window.Retro);
