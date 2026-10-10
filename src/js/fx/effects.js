/* Efeitos visuais: partículas, textos de impacto, flashes e tremor de câmera */
(function (E) {
  'use strict';
  var OUT = '#16111b';
  var parts = [];
  var shakeT = 0, shakeMag = 0, flashT = 0, flashColor = '#fff', flashMax = 0.2;

  function add(p) { p.t = 0; parts.push(p); return p; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  var FX = {
    clear: function () { parts = []; shakeT = 0; flashT = 0; },
    shake: function (mag, dur) { if (!E.Settings.data.shake) return; shakeMag = Math.max(shakeMag * (shakeT > 0 ? 1 : 0), mag); shakeT = Math.max(shakeT, dur); },
    flash: function (color, dur) { flashColor = color; flashT = flashMax = dur; },
    offset: function () { if (shakeT <= 0) return { x: 0, y: 0 }; var m = shakeMag * Math.min(1, shakeT * 6); return { x: rand(-m, m), y: rand(-m, m) }; },

    sparks: function (x, y, color, n, power) {
      for (var i = 0; i < (n || 12); i++) { var a = rand(0, Math.PI * 2), sp = rand(200, 600) * (power || 1);
        add({ type: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.18, 0.35), color: color || '#ffe36a', size: rand(3, 6) }); }
      add({ type: 'burst', x: x, y: y, life: 0.16, color: color || '#fff', size: 40 * (power || 1) });
    },
    ring: function (x, y, color, size, life, flat) { add({ type: 'ring', x: x, y: y, life: life || 0.35, color: color, size: size || 80, flat: flat }); },
    dust: function (x, y, n, dir) {
      for (var i = 0; i < (n || 6); i++) add({ type: 'smoke', x: x + rand(-10, 10), y: y - rand(0, 8), vx: rand(-80, 80) + (dir || 0) * 80, vy: rand(-90, -20), life: rand(0.35, 0.6), size: rand(10, 18), color: 'rgba(210,200,185,' });
    },
    smoke: function (x, y, n) {
      for (var i = 0; i < (n || 22); i++) add({ type: 'smoke', x: x + rand(-50, 50), y: y - rand(0, 200), vx: rand(-60, 60), vy: rand(-60, 10), life: rand(0.7, 1.2), size: rand(26, 50), color: 'rgba(220,224,232,' });
    },
    text: function (x, y, str, color, size, life) { add({ type: 'text', x: x, y: y, vy: -60, str: str, color: color || '#ffe14a', size: size || 54, life: life || 0.7, rot: rand(-0.15, 0.15) }); },
    number: function (x, y, n, color) { add({ type: 'num', x: x + rand(-14, 14), y: y, vy: -110, str: String(Math.round(n)), color: color || '#fff', size: 34, life: 0.8 }); },
    confetti: function (x, y, colors, n, spread) {
      for (var i = 0; i < (n || 20); i++) add({ type: 'conf', x: x + rand(-(spread || 40), spread || 40), y: y, vx: rand(-220, 220), vy: rand(-520, -160), g: 900, life: rand(0.9, 1.5), color: colors[i % colors.length], size: rand(5, 9), rot: rand(0, 6), vr: rand(-12, 12) });
    },
    money: function (x, y, n, dir) {
      for (var i = 0; i < (n || 4); i++) add({ type: Math.random() < 0.5 ? 'coin' : 'bill', x: x, y: y + rand(-30, 30), vx: dir * rand(300, 700), vy: rand(-260, 120), g: 500, life: rand(0.6, 1.0), size: rand(10, 16), rot: rand(0, 6), vr: rand(-10, 10) });
    },
    docs: function (x, y, n, dir) {
      for (var i = 0; i < (n || 4); i++) add({ type: 'doc', x: x, y: y + rand(-40, 40), vx: dir * rand(300, 750), vy: rand(-240, 140), g: 300, life: rand(0.7, 1.1), size: rand(16, 26), rot: rand(0, 6), vr: rand(-8, 8) });
    },
    stars: function (x, y, n, dir, color) {
      for (var i = 0; i < (n || 4); i++) add({ type: 'star', x: x, y: y + rand(-40, 40), vx: dir * rand(300, 750), vy: rand(-200, 200), life: rand(0.5, 0.9), size: rand(8, 14), color: color || '#ffe066', rot: rand(0, 6), vr: rand(-8, 8) });
    },
    speedLine: function (x, y, dir, color) { add({ type: 'line', x: x, y: y, vx: -dir * 900, life: 0.18, size: rand(40, 90), color: color || 'rgba(255,255,255,.8)' }); },

    update: function (dt) {
      if (shakeT > 0) shakeT -= dt;
      if (flashT > 0) flashT -= dt;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        if (p.vx) p.x += p.vx * dt;
        if (p.vy) p.y += p.vy * dt;
        if (p.g) p.vy += p.g * dt;
        if (p.vr) p.rot += p.vr * dt;
        if (p.type === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
        if (p.type === 'smoke') { p.vx *= 0.96; p.vy *= 0.96; }
      }
    },

    draw: function (ctx) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], k = p.t / p.life, a = 1 - k;
        ctx.save();
        switch (p.type) {
          case 'spark':
            ctx.strokeStyle = p.color; ctx.lineWidth = p.size * a + 1; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); break;
          case 'burst':
            ctx.globalAlpha = a; ctx.fillStyle = '#fff';
            ctx.beginPath();
            for (var j = 0; j < 16; j++) { var ang = j / 16 * Math.PI * 2, r = (j % 2 ? 0.45 : 1) * p.size * (0.6 + k); ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r); }
            ctx.closePath(); ctx.fill(); ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.stroke(); break;
          case 'ring':
            ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 8 * a + 2;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (0.3 + k), p.size * (0.3 + k) * (p.flat ? 0.22 : 1), 0, 0, Math.PI * 2); ctx.stroke(); break;
          case 'smoke':
            ctx.fillStyle = p.color + (0.75 * a) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.8), 0, 7); ctx.fill(); break;
          case 'text': case 'num':
            var sc = p.type === 'text' ? (k < 0.15 ? 0.4 + k / 0.15 * 0.8 : 1.2 - Math.min(0.2, (k - 0.15))) : 1;
            ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.scale(sc, sc);
            ctx.font = p.size + 'px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = p.size * 0.22; ctx.strokeText(p.str, 0, 0);
            ctx.fillStyle = p.color; ctx.fillText(p.str, 0, 0); break;
          case 'conf':
            ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
          case 'coin':
            ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.scale(Math.cos(p.rot), 1); E.Art.coin(ctx, 0, 0, p.size); break;
          case 'bill':
            ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = '#7ccf7a'; ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
            ctx.fillStyle = '#2f7d34'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.3, 0, 7); ctx.fill(); break;
          case 'doc':
            ctx.globalAlpha = Math.min(1, a * 2); E.Art.doc(ctx, p.x, p.y, p.size, p.size * 1.3, p.rot); break;
          case 'star':
            ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); E.Art.drawStar(ctx, 0, 0, p.size, p.color); break;
          case 'line':
            ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.size * (p.vx > 0 ? -1 : 1), p.y); ctx.stroke(); break;
        }
        ctx.restore();
      }
    },
    drawFlash: function (ctx, w, h) {
      if (flashT <= 0) return;
      ctx.save(); ctx.globalAlpha = Math.max(0, flashT / flashMax) * 0.7; ctx.fillStyle = flashColor; ctx.fillRect(-50, -350, w + 100, h + 400); ctx.restore();
    },
    get count() { return parts.length; }
  };
  E.FX = FX;
})(window.EVD = window.EVD || {});
