/* Retro Hry – spoločný displej pre LCD hry s pevnými segmentmi (Formulky, Chobotnica).
   Pozadie (potlač + "zhasnuté" segmenty) sa kreslí raz, aktívne segmenty každý snímok. */
'use strict';

(function (R) {
  // pomocné tvary – všetko sú vyplnené cesty, aby sa dali kresliť ako segmenty
  const G = R.geo = {
    circle(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); },
    ellipse(ctx, x, y, rx, ry, rot) {
      rot = rot || 0;
      ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.closePath();
    },
    poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); },
    rect(ctx, x, y, w, h) { G.poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); },
    thick(ctx, pts, w) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const a = Math.atan2(y2 - y1, x2 - x1);
        const nx = Math.sin(a) * w / 2, ny = -Math.cos(a) * w / 2;
        G.poly(ctx, [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
      }
      for (const [x, y] of pts) G.circle(ctx, x, y, w / 2);
    }
  };

  R.SegScreen = function (canvas, holder, spec) {
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas');
    const bctx = bg.getContext('2d');
    const C = Object.assign({
      glassTop: '#d0d5bf',
      glassBot: '#bcc3a7',
      on: 'rgba(20,24,16,0.9)',
      off: 'rgba(20,24,16,0.055)',
      shadow: 'rgba(20,24,16,0.14)'
    }, spec.colors || {});
    let k = 1, ox = 0, oy = 0;

    function glass(c, w, h) {
      const gr = c.createLinearGradient(0, 0, w * 0.4, h);
      gr.addColorStop(0, C.glassTop);
      gr.addColorStop(1, C.glassBot);
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }

    function build() {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      glass(bctx, bg.width, bg.height);
      bctx.setTransform(k, 0, 0, k, ox, oy);
      spec.printed(bctx);
      bctx.fillStyle = C.off;
      bctx.beginPath();
      spec.ghosts(bctx);
      bctx.fill();
      if (spec.ghostExtra) spec.ghostExtra(bctx, C.off);
    }

    function resize() {
      const r = holder.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(r.width * dpr)), h = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = w; canvas.height = h;
      canvas.style.width = (w / dpr) + 'px';
      canvas.style.height = (h / dpr) + 'px';
      bg.width = w; bg.height = h;
      k = Math.min(w / spec.LW, h / spec.LH);
      ox = (w - spec.LW * k) / 2;
      oy = (h - spec.LH * k) / 2;
      build();
    }

    // začiatok snímku: pozadie a logické súradnice
    function begin() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      ctx.setTransform(k, 0, 0, k, ox, oy);
      return ctx;
    }

    // aktívne segmenty s jemným tieňom na skle
    function segs(fns) {
      if (!fns.length) return;
      ctx.save();
      ctx.translate(1.8, 2);
      ctx.fillStyle = C.shadow;
      ctx.beginPath();
      fns.forEach((f) => f(ctx));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = C.on;
      ctx.beginPath();
      fns.forEach((f) => f(ctx));
      ctx.fill();
    }

    // 4 číslice (hodiny alebo skóre); str má 4 znaky, medzera = prázdne
    function digits(d, str, colonOn) {
      for (let i = 0; i < 4; i++) {
        const ch = str[i];
        if (ch === ' ' || ch === undefined) continue;
        const x = d.x + i * (d.w + d.gap) + (i >= 2 ? d.mid : 0);
        R.seg.digit(ctx, x + 1.8, d.y + 2, d.w, d.h, R.seg.DIGITS[+ch], C.shadow);
        R.seg.digit(ctx, x, d.y, d.w, d.h, R.seg.DIGITS[+ch], C.on);
      }
      if (colonOn) segs([(c) => colon(c, d)]);
    }
    function colon(c, d) {
      const x = d.x + 2 * (d.w + d.gap) - d.gap / 2 + d.mid / 2 - 1;
      G.circle(c, x + 1, d.y + d.h * 0.3, d.w * 0.13);
      G.circle(c, x - 0.5, d.y + d.h * 0.7, d.w * 0.13);
    }
    function ghostDigits(c, d, color) {
      for (let i = 0; i < 4; i++) R.seg.digit(c, d.x + i * (d.w + d.gap) + (i >= 2 ? d.mid : 0), d.y, d.w, d.h, 0x7f, color);
      c.fillStyle = color;
      c.beginPath();
      colon(c, d);
      c.fill();
    }

    function text(str, x, y, size, on, align) {
      ctx.fillStyle = on ? C.on : C.off;
      ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(str, x, y);
    }

    function toLogical(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      return { x: ((clientX - r.left) * sx - ox) / k, y: ((clientY - r.top) * sx - oy) / k };
    }

    return { resize, begin, segs, digits, ghostDigits, text, toLogical, colors: C, get ctx() { return ctx; } };
  };

  // hodiny pre nečinné LCD hry
  R.clockString = function (now) {
    return String(now.getHours()).padStart(2, ' ') + String(now.getMinutes()).padStart(2, '0');
  };
})(window.Retro);
