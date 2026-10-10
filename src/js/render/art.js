/* =========================================================
 * ARTE PROCEDURAL — lutadores, retratos e ícones
 * Tudo é desenhado em Canvas 2D a partir dos dados "look" do
 * personagem. Para trocar por sprites definitivos, substitua
 * E.Art.drawFighter por um desenho de spritesheet com a mesma
 * assinatura (ctx, char, pose, opts).
 * ========================================================= */
(function (E) {
  'use strict';
  var OUT = '#16111b';
  var BODY = {
    normal: { sw: 34, hw: 24, T: 80, au: 38, al: 34, th: 44, sh: 44, aw: 17, lw: 19, R: 31 },
    stocky: { sw: 38, hw: 29, T: 76, au: 37, al: 33, th: 41, sh: 42, aw: 19, lw: 21, R: 32 },
    slim:   { sw: 29, hw: 22, T: 78, au: 38, al: 34, th: 46, sh: 46, aw: 14, lw: 16, R: 30 },
    big:    { sw: 41, hw: 35, T: 82, au: 37, al: 33, th: 40, sh: 42, aw: 20, lw: 22, R: 32, belly: true }
  };
  function vec(a, l) { return { x: Math.sin(a) * l, y: Math.cos(a) * l }; }
  function seg(ctx, ax, ay, bx, by, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt))); g = Math.max(0, Math.min(255, Math.round(g + amt))); b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------------- POSES ----------------
   * Ângulos absolutos: 0 = para baixo, +π/2 = para frente, π = para cima.
   * fa/ba = braço da frente/de trás [braço, antebraço]; fl/bl = perna [coxa, canela]. */
  var P = {
    guard: function (t) { var b = Math.sin(t * 5) * 0.05; return { lean: 0.12 + b * 0.3, tilt: 0.04, fa: [0.95 + b, 2.75], ba: [0.6 + b, 2.55], fl: [0.42, 0.05], bl: [-0.4, -0.12], expr: 'grit' }; },
    walk: function (t) { var w = Math.sin(t * 11), c = Math.cos(t * 11); return { lean: 0.16, tilt: 0.04, fa: [0.95 + w * 0.08, 2.7], ba: [0.6 - w * 0.08, 2.5], fl: [0.15 + w * 0.42, 0.0 + Math.max(0, c) * -0.4 + w * 0.2], bl: [0.15 - w * 0.42, 0.0 + Math.max(0, -c) * -0.4 - w * 0.2], expr: 'grit' }; },
    jump: function () { return { lean: 0.08, tilt: 0, fa: [1.2, 2.9], ba: [0.9, 2.7], fl: [1.35, 0.25], bl: [0.55, -0.45], expr: 'grit' }; },
    jab: function (k) { var s = k < 0.3 ? k / 0.3 : 1; var ext = k < 0.3 ? s : (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4 * 0.7);
      return { lean: 0.12 + ext * 0.2, tilt: 0.05, fa: [0.95 + ext * 0.62, 2.75 - ext * 1.18], ba: [0.6, 2.55], fl: [0.5, 0.05], bl: [-0.45, -0.15], expr: ext > 0.6 ? 'shout' : 'grit' }; },
    punch: function (k) { var w = k < 0.35 ? k / 0.35 : 0, ext = k < 0.35 ? 0 : (k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
      return { lean: 0.05 - w * 0.15 + ext * 0.4, tilt: 0.05, fa: [0.6 - w * 0.4 + ext * 0.97, 2.9 - ext * 1.33], ba: [0.6 - ext * 0.3, 2.4 - ext * 0.4], fl: [0.6 + ext * 0.1, 0.05], bl: [-0.5 - ext * 0.15, -0.2], expr: ext > 0.3 ? 'shout' : 'grit' }; },
    kick: function (k) { var ext = k < 0.35 ? k / 0.35 : (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      return { lean: 0.1 - ext * 0.4, tilt: -0.05, fa: [1.0, 2.8], ba: [0.3 - ext * 0.5, 1.6], fl: [0.4 + ext * 1.15, 0.05 + ext * 1.55], bl: [-0.15, -0.05], expr: ext > 0.5 ? 'shout' : 'grit' }; },
    airkick: function (k) { var ext = k < 0.3 ? k / 0.3 : 1; return { lean: -0.1, tilt: 0, fa: [1.3, 2.9], ba: [0.2, 1.4], fl: [0.9 + ext * 0.75, 0.6 + ext * 1.0], bl: [0.4, -0.5], expr: 'shout' }; },
    uppercut: function (k) { var w = k < 0.35 ? k / 0.35 : 0, ext = k < 0.35 ? 0 : (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      return { lean: 0.25 * w - ext * 0.15, tilt: -ext * 0.2, fa: [0.3 + ext * 2.6, 2.4 + ext * 0.75], ba: [0.4, 2.3], fl: [0.6 - ext * 0.3, 0.1], bl: [-0.6 + ext * 0.4, -0.2], expr: ext > 0.2 ? 'shout' : 'grit' }; },
    cast: function (k) { var e = Math.min(1, k * 2.2); return { lean: 0.22 * e, tilt: 0.05, fa: [0.9 + e * 0.65, 2.6 - e * 1.0], ba: [0.6 + e * 0.8, 2.4 - e * 0.85], fl: [0.55, 0.05], bl: [-0.5, -0.2], expr: 'shout' }; },
    throw: function (k) { var w = k < 0.4 ? k / 0.4 : 0, e = k < 0.4 ? 0 : 1; return { lean: -0.15 * w + 0.3 * e, tilt: 0, fa: [w ? -0.6 - w * 1.4 : 1.6, w ? 2.8 : 1.7], ba: [0.8, 2.5], fl: [0.6, 0.05], bl: [-0.55, -0.2], expr: e ? 'shout' : 'grit' }; },
    castUp: function (k) { var e = Math.min(1, k * 2.4); return { lean: -0.05 * e, tilt: -0.25 * e, fa: [1 + e * 1.85, 2.7 + e * 0.4], ba: [0.6 + e * 2.0, 2.5 + e * 0.6], fl: [0.45, 0.05], bl: [-0.45, -0.1], expr: 'shout' }; },
    stomp: function (k) { var up = k < 0.55 ? k / 0.55 : 0, dn = k >= 0.55 ? 1 : 0;
      return { lean: 0.05, tilt: -0.1 * up, fa: [1.8 + up * 0.8, 3.0], ba: [1.5 + up * 0.9, 3.0], fl: [up ? 0.4 + up * 1.2 : 0.75, up ? 0.05 + up * 0.15 : 0.1], bl: [-0.25, -0.1], expr: 'shout', crouch: dn * 10 }; },
    dash: function (t) { var w = Math.sin(t * 22); return { lean: 0.55, tilt: 0.15, fa: [1.45, 1.75], ba: [0.6 + w * 0.3, 2.0], fl: [0.6 + w * 0.6, 0.2 + w * 0.3], bl: [0.1 - w * 0.6, -0.3 - w * 0.2], expr: 'shout' }; },
    crouch: function () { return { lean: 0.45, tilt: 0.1, fa: [1.3, 2.9], ba: [1.1, 2.7], fl: [1.25, -0.2], bl: [0.2, -0.85], expr: 'grit' }; },
    shield: function (k) { var e = Math.min(1, k * 3); return { lean: -0.05, tilt: -0.1, fa: [0.9 + e * 0.6, 0.6 + e * 0.4], ba: [0.6 + e * 0.6, 0.4 + e * 0.4], fl: [0.55, 0.05], bl: [-0.55, -0.15], expr: 'shout' }; },
    beamCharge: function (t) { var j = Math.sin(t * 40) * 0.03; return { lean: -0.12 + j, tilt: -0.05, fa: [-0.7, 0.4], ba: [-0.85, 0.3], fl: [0.7, 0.1], bl: [-0.6, -0.25], expr: 'grit', crouch: 6 }; },
    beamFire: function (t) { var j = Math.sin(t * 50) * 0.03; return { lean: 0.22 + j, tilt: 0.05, fa: [1.57, 1.6], ba: [1.48, 1.55], fl: [0.75, 0.1], bl: [-0.7, -0.3], expr: 'shout', crouch: 6 }; },
    block: function () { return { lean: -0.05, tilt: 0.12, fa: [1.25, 3.05], ba: [1.05, 2.95], fl: [0.45, 0.05], bl: [-0.45, -0.15], expr: 'grit' }; },
    hurt: function (t) { var s = Math.min(1, t * 8); return { lean: -0.45 * s, tilt: -0.35 * s, fa: [0.5, 1.2], ba: [-0.4, 0.4], fl: [0.35, 0.1], bl: [-0.25, -0.05], expr: 'hurt' }; },
    air_hurt: function () { return { lean: -0.6, tilt: -0.4, fa: [2.2, 2.6], ba: [-0.8, -0.3], fl: [0.9, 0.4], bl: [0.3, 0.1], expr: 'hurt' }; },
    dizzy: function (t) { var s = Math.sin(t * 4); return { lean: s * 0.18, tilt: s * 0.25, fa: [0.2 + s * 0.1, 0.1], ba: [0.15 - s * 0.1, 0.05], fl: [0.25, 0.05], bl: [-0.25, -0.05], expr: 'hurt' }; },
    ko: function (t) { var k = Math.min(1, t * 2.5); return { lean: -0.2, tilt: -0.3, fa: [2.4, 2.6], ba: [2.0, 2.3], fl: [0.6, 0.3], bl: [0.2, 0.0], expr: 'ko', rot: -1.52 * k, lift: 26 * k }; },
    win: function (t) { var b = Math.abs(Math.sin(t * 6)) * 0.08; return { lean: -0.05, tilt: -0.15, fa: [2.95 + b, 3.1], ba: [0.55, 2.4], fl: [0.4, 0.05], bl: [-0.4, -0.12], expr: 'smile' }; },
    taunt: function (t) { var b = Math.sin(t * 8) * 0.15; return { lean: 0.05, tilt: 0.1 + b * 0.3, fa: [1.6 + b, 2.6], ba: [0.3, 1.8], fl: [0.4, 0.05], bl: [-0.4, -0.12], expr: 'shout' }; }
  };

  /* ---------------- CABEÇA ---------------- */
  function drawHead(ctx, L, R, expr, t) {
    var fem = !!L.fem;
    // cabelo de trás
    if (L.hair === 'afro') {
      ctx.fillStyle = L.hairColor; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.beginPath();
      for (var i = 0; i <= 18; i++) {
        var a = Math.PI * 0.55 + i / 18 * Math.PI * 1.65, rr = R * 1.42 + (i % 2 ? 4 : -2);
        var x = -6 + Math.cos(a) * rr, y = -12 + Math.sin(a) * rr * 0.92;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (L.hair === 'curly') {
      ctx.fillStyle = L.hairColor; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      [[-R * 0.85, -4, 11], [-R * 0.75, -R * 0.45, 12], [-R * 0.35, -R * 0.8, 12], [-R * 0.95, 10, 9]].forEach(function (c) { circle(ctx, c[0], c[1], c[2], L.hairColor, OUT, 3); });
    }
    // orelha
    ctx.save(); ctx.beginPath(); ctx.ellipse(-R * 0.78, 3, 7, 10, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = L.skin; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-R * 0.78, 3, 3, 5, -0.2, 0, Math.PI * 2); ctx.fillStyle = L.skinShade; ctx.fill(); ctx.restore();
    if (fem) circle(ctx, -R * 0.8, 15, 4.5, '#ffcf3a', OUT, 2);

    // rosto
    ctx.beginPath();
    ctx.moveTo(-R * 0.86, -R * 0.35);
    ctx.bezierCurveTo(-R * 0.95, -R * 1.25, R * 1.0, -R * 1.25, R * 0.92, -R * 0.2);
    ctx.bezierCurveTo(R * 0.98, R * 0.25, R * 0.95, R * (fem ? 0.75 : 0.85), R * 0.45, R * (fem ? 0.95 : 1.02));
    ctx.bezierCurveTo(R * 0.05, R * 1.12, -R * 0.55, R * 0.95, -R * 0.8, R * 0.45);
    ctx.closePath();
    ctx.fillStyle = L.skin; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = L.skinShade; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(-R * 0.95, R * 0.1, R * 0.45, R * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.2, R * 1.15, R * 0.9, R * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.2; ctx.stroke();

    // bochecha
    if (fem || expr === 'smile') { ctx.fillStyle = 'rgba(255,90,90,.25)'; ctx.beginPath(); ctx.ellipse(R * 0.5, R * 0.3, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }

    // olhos
    var ex1 = -2, ex2 = R * 0.55, ey = -R * 0.12;
    var browC = L.brows || OUT;
    if (L.eyewear !== 'sunglasses') {
      if (expr === 'ko') {
        [ex1, ex2].forEach(function (x) { seg(ctx, x - 5, ey - 5, x + 5, ey + 5, 3, OUT); seg(ctx, x + 5, ey - 5, x - 5, ey + 5, 3, OUT); });
      } else if (expr === 'hurt') {
        seg(ctx, ex1 - 6, ey - 4, ex1 + 4, ey, 3, OUT); seg(ctx, ex1 + 4, ey, ex1 - 6, ey + 4, 3, OUT);
        seg(ctx, ex2 + 6, ey - 4, ex2 - 4, ey, 3, OUT); seg(ctx, ex2 - 4, ey, ex2 + 6, ey + 4, 3, OUT);
      } else {
        [ex1, ex2].forEach(function (x, i) {
          ctx.beginPath(); ctx.ellipse(x, ey, 6.5, expr === 'smile' ? 3 : 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.stroke();
          circle(ctx, x + 2, ey + 0.5, 2.8, '#1a1116');
          circle(ctx, x + 2.8, ey - 0.8, 0.9, '#fff');
          if (fem) { seg(ctx, x + (i ? 6 : -6), ey - 3, x + (i ? 10 : -10), ey - 6, 2, OUT); }
        });
      }
    }
    // sobrancelhas (bravas)
    var bs = expr === 'smile' ? -2 : (expr === 'hurt' || expr === 'ko' ? -4 : 3);
    seg(ctx, ex1 - 8, ey - 12, ex1 + 6, ey - 12 + bs, fem ? 3 : 5, browC);
    seg(ctx, ex2 + 9, ey - 12, ex2 - 5, ey - 12 + bs, fem ? 3 : 5, browC);

    if (L.eyewear === 'sunglasses') {
      ctx.fillStyle = '#0f1420'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ex1 - 9, ey - 6); ctx.lineTo(ex1 + 8, ey - 6); ctx.lineTo(ex1 + 6, ey + 5); ctx.quadraticCurveTo(ex1 - 2, ey + 9, ex1 - 8, ey + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex2 - 8, ey - 6); ctx.lineTo(ex2 + 11, ey - 6); ctx.lineTo(ex2 + 9, ey + 4); ctx.quadraticCurveTo(ex2 + 1, ey + 9, ex2 - 6, ey + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      seg(ctx, ex1 + 8, ey - 5, ex2 - 8, ey - 5, 2.5, OUT);
      seg(ctx, ex1 - 9, ey - 5, -R * 0.8, ey - 2, 2.5, OUT);
      ctx.fillStyle = 'rgba(160,220,255,.7)'; ctx.fillRect(ex2 - 3, ey - 4, 6, 2); ctx.fillRect(ex1 - 3, ey - 4, 5, 2);
    } else if (L.eyewear === 'glasses') {
      circle(ctx, ex1, ey, 8.5, null, '#2a1f2a', 2.5); circle(ctx, ex2, ey, 8.5, null, '#2a1f2a', 2.5);
      seg(ctx, ex1 + 8, ey - 1, ex2 - 8, ey - 1, 2.2, '#2a1f2a');
      seg(ctx, ex1 - 8, ey - 1, -R * 0.78, ey - 3, 2.2, '#2a1f2a');
    }

    // nariz
    ctx.beginPath(); ctx.moveTo(R * 0.72, -R * 0.02);
    ctx.quadraticCurveTo(R * 1.02, R * 0.32, R * 0.86, R * 0.38); ctx.quadraticCurveTo(R * 0.75, R * 0.42, R * 0.66, R * 0.34);
    ctx.fillStyle = L.skin; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.stroke();

    // boca
    var mx = R * 0.42, my = R * 0.66;
    ctx.lineWidth = 2.4; ctx.strokeStyle = OUT;
    if (expr === 'shout') {
      ctx.beginPath(); ctx.ellipse(mx, my + 2, 9, 8, 0, 0, Math.PI * 2); ctx.fillStyle = '#5a0f18'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(mx, my + 7, 5, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#e06a7a'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(mx - 6, my - 5, 12, 3);
    } else if (expr === 'smile') {
      ctx.beginPath(); ctx.moveTo(mx - 10, my - 2); ctx.quadraticCurveTo(mx, my + 10, mx + 10, my - 3); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    } else if (expr === 'hurt') {
      ctx.beginPath(); ctx.moveTo(mx - 9, my + 2); ctx.lineTo(mx - 4, my - 2); ctx.lineTo(mx, my + 2); ctx.lineTo(mx + 4, my - 2); ctx.lineTo(mx + 9, my + 2); ctx.stroke();
    } else if (expr === 'ko') {
      ctx.beginPath(); ctx.ellipse(mx, my + 2, 5, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#5a0f18'; ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.rect(mx - 9, my - 3, 18, 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      seg(ctx, mx - 9, my + 1, mx + 9, my + 1, 1.5, OUT); seg(ctx, mx - 3, my - 3, mx - 3, my + 5, 1.2, OUT); seg(ctx, mx + 3, my - 3, mx + 3, my + 5, 1.2, OUT);
    }
    if (L.lips && expr !== 'shout') { ctx.strokeStyle = L.lips; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 9, my - 4); ctx.quadraticCurveTo(mx, my - 7, mx + 9, my - 4); ctx.stroke(); }

    // bigode
    if (L.mustache === 'thick') {
      ctx.beginPath(); ctx.moveTo(R * 0.05, R * 0.55);
      ctx.quadraticCurveTo(R * 0.3, R * 0.28, R * 0.62, R * 0.38); ctx.quadraticCurveTo(R * 0.9, R * 0.35, R * 0.95, R * 0.6);
      ctx.quadraticCurveTo(R * 0.7, R * 0.56, R * 0.5, R * 0.6); ctx.quadraticCurveTo(R * 0.25, R * 0.7, R * 0.05, R * 0.55);
      ctx.fillStyle = L.mustacheColor; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.stroke();
    } else if (L.mustache === 'handlebar') {
      ctx.beginPath(); ctx.moveTo(R * 0.6, R * 0.4);
      ctx.bezierCurveTo(R * 0.2, R * 0.35, R * 0.05, R * 0.7, -R * 0.15, R * 0.42);
      ctx.bezierCurveTo(R * 0.05, R * 0.6, R * 0.3, R * 0.55, R * 0.6, R * 0.52);
      ctx.bezierCurveTo(R * 0.85, R * 0.55, R * 1.05, R * 0.7, R * 1.15, R * 0.4);
      ctx.bezierCurveTo(R * 1.0, R * 0.5, R * 0.85, R * 0.35, R * 0.6, R * 0.4);
      ctx.fillStyle = L.mustacheColor; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.stroke();
    }

    // cabelo da frente / chapéus
    if (L.hair === 'pompadour') {
      ctx.beginPath(); ctx.moveTo(-R * 0.88, -R * 0.1);
      ctx.bezierCurveTo(-R * 1.05, -R * 1.2, -R * 0.2, -R * 1.75, R * 0.55, -R * 1.55);
      ctx.bezierCurveTo(R * 1.25, -R * 1.4, R * 1.15, -R * 0.85, R * 0.75, -R * 0.75);
      ctx.bezierCurveTo(R * 0.3, -R * 0.95, -R * 0.2, -R * 0.75, -R * 0.45, -R * 0.4);
      ctx.quadraticCurveTo(-R * 0.6, -R * 0.15, -R * 0.88, -R * 0.1);
      ctx.fillStyle = L.hairColor; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = shade(L.hairColor, 50); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 1.0); ctx.quadraticCurveTo(R * 0.1, -R * 1.55, R * 0.8, -R * 1.25); ctx.stroke();
      ctx.strokeStyle = shade(L.hairColor, -60); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-R * 0.2, -R * 0.95); ctx.quadraticCurveTo(R * 0.3, -R * 1.25, R * 0.85, -R * 1.0); ctx.stroke();
    } else if (L.hair === 'afro') {
      ctx.beginPath(); ctx.moveTo(-R * 0.9, -R * 0.2); ctx.quadraticCurveTo(-R * 0.4, -R * 0.95, R * 0.95, -R * 0.55);
      ctx.lineTo(R * 1.0, -R * 1.0); ctx.lineTo(-R * 1.0, -R * 1.0); ctx.closePath();
      ctx.fillStyle = L.hairColor; ctx.fill();
      if (L.headband) {
        ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-R * 1.05, -R * 0.45); ctx.quadraticCurveTo(0, -R * 1.05, R * 0.98, -R * 0.62); ctx.stroke();
        ctx.strokeStyle = L.headband; ctx.lineWidth = 6; ctx.stroke();
        drawStar(ctx, R * 0.3, -R * 0.86, 5, '#ffe14a');
      }
    } else if (L.hair === 'curly' && !L.hat) {
      circle(ctx, 0, -R * 0.9, 14, L.hairColor, OUT, 3);
    } else if (L.hair === 'none') {
      ctx.fillStyle = L.hairColor; ctx.beginPath(); ctx.ellipse(-R * 0.7, -R * 0.15, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (L.hat === 'cap') {
      ctx.beginPath(); ctx.moveTo(-R * 0.98, -R * 0.35);
      ctx.bezierCurveTo(-R * 1.0, -R * 1.45, R * 0.95, -R * 1.45, R * 0.95, -R * 0.5);
      ctx.closePath(); ctx.fillStyle = L.hatColor; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R * 0.3, -R * 0.5); ctx.quadraticCurveTo(R * 1.3, -R * 0.62, R * 1.6, -R * 0.38); ctx.quadraticCurveTo(R * 1.1, -R * 0.28, R * 0.3, -R * 0.38); ctx.closePath();
      ctx.fillStyle = shade(L.hatColor, -40); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-R * 0.2, -R * 0.95, R * 0.35, R * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
      drawStar(ctx, R * 0.25, -R * 0.82, 8, '#fff');
    } else if (L.hat === 'cowboy') {
      ctx.beginPath(); ctx.moveTo(-R * 0.75, -R * 0.62);
      ctx.bezierCurveTo(-R * 0.85, -R * 1.65, -R * 0.2, -R * 1.45, 0, -R * 1.55);
      ctx.bezierCurveTo(R * 0.2, -R * 1.45, R * 0.95, -R * 1.65, R * 0.85, -R * 0.62); ctx.closePath();
      ctx.fillStyle = L.hatColor; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#2b1a0d'; ctx.fillRect(-R * 0.78, -R * 0.82, R * 1.62, 7);
      ctx.beginPath(); ctx.moveTo(-R * 1.55, -R * 0.75);
      ctx.quadraticCurveTo(0, -R * 0.35, R * 1.65, -R * 0.78); ctx.quadraticCurveTo(R * 1.8, -R * 0.55, R * 1.4, -R * 0.5);
      ctx.quadraticCurveTo(0, -R * 0.2, -R * 1.35, -R * 0.5); ctx.quadraticCurveTo(-R * 1.75, -R * 0.55, -R * 1.55, -R * 0.75); ctx.closePath();
      ctx.fillStyle = shade(L.hatColor, -20); ctx.fill(); ctx.stroke();
    }
  }

  function drawStar(ctx, x, y, r, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();
  }

  /* ---------------- CORPO ---------------- */
  function limbPoints(hx, hy, ang, l1, l2) {
    var k = vec(ang[0], l1), e = vec(ang[1], l2);
    return { x0: hx, y0: hy, x1: hx + k.x, y1: hy + k.y, x2: hx + k.x + e.x, y2: hy + k.y + e.y, a2: ang[1] };
  }
  function drawLeg(ctx, p, w, pants, shoe) {
    seg(ctx, p.x0, p.y0, p.x1, p.y1, w + 6, OUT); seg(ctx, p.x1, p.y1, p.x2, p.y2, w + 6, OUT);
    seg(ctx, p.x0, p.y0, p.x1, p.y1, w, pants); seg(ctx, p.x1, p.y1, p.x2, p.y2, w - 1, pants);
    ctx.save(); ctx.translate(p.x2, p.y2); ctx.rotate(-p.a2);
    ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(16, -6); ctx.quadraticCurveTo(28, -4, 27, 6); ctx.lineTo(-11, 7); ctx.closePath();
    ctx.fillStyle = shoe; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(4, -4, 12, 2.5);
    ctx.restore();
  }
  function drawArm(ctx, p, w, sleeve, skin, cuff) {
    seg(ctx, p.x0, p.y0, p.x1, p.y1, w + 6, OUT); seg(ctx, p.x1, p.y1, p.x2, p.y2, w + 5, OUT);
    seg(ctx, p.x0, p.y0, p.x1, p.y1, w, sleeve); seg(ctx, p.x1, p.y1, p.x2, p.y2, w - 1, sleeve);
    var dx = p.x2 - p.x1, dy = p.y2 - p.y1, dl = Math.hypot(dx, dy) || 1;
    var cx = p.x2 - dx / dl * 3, cy = p.y2 - dy / dl * 3;
    if (cuff) circle(ctx, cx, cy, w * 0.5, cuff, OUT, 2);
    var fx = p.x2 + dx / dl * w * 0.45, fy = p.y2 + dy / dl * w * 0.45;
    circle(ctx, fx, fy, w * 0.68, skin, OUT, 3);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx, fy, w * 0.35, -0.5, 1.2); ctx.stroke();
  }

  function drawTorso(ctx, L, B) {
    var T = B.T, sw = B.sw, hw = B.hw;
    // pescoço
    ctx.fillStyle = L.skinShade; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(-9, -T - 14, 18, 22); ctx.fill(); ctx.stroke();
    // paletó
    ctx.beginPath();
    ctx.moveTo(-hw, 6);
    ctx.quadraticCurveTo(-sw - 4, -T * 0.5, -sw, -T + 10);
    ctx.quadraticCurveTo(-sw + 2, -T - 2, -sw + 14, -T - 2);
    ctx.lineTo(sw - 14, -T - 2);
    ctx.quadraticCurveTo(sw - 2, -T - 2, sw, -T + 10);
    if (B.belly) ctx.quadraticCurveTo(sw + 22, -T * 0.35, hw, 6);
    else ctx.quadraticCurveTo(sw + 4, -T * 0.5, hw, 6);
    ctx.closePath();
    ctx.fillStyle = L.jacket; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = L.jacketShade; ctx.fillRect(-sw - 10, -T - 10, sw * 0.6, T + 30);
    // camisa (V)
    ctx.beginPath(); ctx.moveTo(-12, -T - 4); ctx.lineTo(14, -T - 4); ctx.lineTo(4, -T * (L.tie ? 0.3 : 0.15)); ctx.closePath();
    if (!L.tie && L.body === 'big') { ctx.moveTo(-10, -T); ctx.lineTo(12, -T); ctx.lineTo(10, 6); ctx.lineTo(-6, 6); }
    ctx.fillStyle = L.shirt; ctx.fill();
    if (L.body === 'big') { // camisa xadrez aparecendo
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      for (var yy = -T; yy < 6; yy += 9) { ctx.beginPath(); ctx.moveTo(-12, yy); ctx.lineTo(14, yy); ctx.stroke(); }
      for (var xx = -8; xx < 14; xx += 9) { ctx.beginPath(); ctx.moveTo(xx, -T); ctx.lineTo(xx, 6); ctx.stroke(); }
    }
    // gravata
    if (L.tie) {
      ctx.beginPath(); ctx.moveTo(-2, -T - 2); ctx.lineTo(8, -T - 2); ctx.lineTo(6, -T + 8); ctx.lineTo(9, -T * 0.32); ctx.lineTo(3, -T * 0.22); ctx.lineTo(-3, -T * 0.32); ctx.lineTo(0, -T + 8); ctx.closePath();
      ctx.fillStyle = L.tie; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffd21f'; ctx.fillRect(1, -T * 0.62, 6, 3);
    }
    // faixa verde-amarela
    if (L.sash) {
      ctx.save(); ctx.translate(0, -T * 0.5); ctx.rotate(-0.75);
      ctx.fillStyle = '#1ea54b'; ctx.fillRect(-80, -9, 160, 18);
      ctx.fillStyle = '#ffd21f'; ctx.fillRect(-80, -3, 160, 6);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(-80, -9, 160, 18);
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.2;
    ctx.stroke();
    // lapelas
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-12, -T - 2); ctx.lineTo(-4, -T * 0.55); ctx.lineTo(3, -T * (L.tie ? 0.3 : 0.15)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, -T - 2); ctx.lineTo(10, -T * 0.55); ctx.lineTo(4, -T * (L.tie ? 0.3 : 0.15)); ctx.stroke();
    // botão / broche
    circle(ctx, 6, -T * 0.12, 2.6, shade(L.jacket, -50), OUT, 1.2);
    if (L.faction === 'direita' || L.sash) {
      ctx.fillStyle = '#1ea54b'; ctx.fillRect(sw - 20, -T + 12, 9, 6); ctx.fillStyle = '#ffd21f'; ctx.fillRect(sw - 18, -T + 13.5, 5, 3);
    }
    if (L.hat === 'cap') drawStar(ctx, sw - 16, -T + 18, 6, '#ffd21f');
    // cinto
    ctx.fillStyle = '#1a1414'; ctx.fillRect(-hw + 2, -2, hw * 2 - 4, 8);
    if (L.body === 'big') { ctx.fillStyle = '#e7b93a'; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(4, 2, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }

  /**
   * Desenha o lutador com os pés em (0,0), olhando para a direita.
   * pose: objeto vindo de E.Art.pose(...)
   */
  function drawFighter(ctx, ch, pose, opt) {
    opt = opt || {};
    var L = ch.look, B = BODY[L.body] || BODY.normal;
    if (!L.faction) L.faction = ch.faction;
    var fh = { x: 8, y: 0 }, bh = { x: -8, y: 0 };
    var FL = limbPoints(fh.x, fh.y, pose.fl, B.th, B.sh);
    var BL = limbPoints(bh.x, bh.y, pose.bl, B.th, B.sh);
    var low = Math.max(FL.y2, BL.y2) + 7 - (pose.crouch || 0) * 0;
    ctx.save();
    if (pose.rot) { ctx.translate(0, -(pose.lift || 0)); ctx.rotate(pose.rot); }
    ctx.translate(0, -low);

    var lean = pose.lean || 0, T = B.T;
    var S = { x: Math.sin(lean) * T, y: -Math.cos(lean) * T };
    function rp(x, y) { return { x: x * Math.cos(lean) - y * Math.sin(lean), y: x * Math.sin(lean) + y * Math.cos(lean) }; }
    var fs = rp(B.sw * 0.55, -T + 12), bs = rp(-B.sw * 0.65, -T + 12);
    var FA = limbPoints(fs.x, fs.y, pose.fa, B.au, B.al);
    var BA = limbPoints(bs.x, bs.y, pose.ba, B.au, B.al);

    var backSleeve = L.jacketShade, backPants = shade(L.pants, -18);
    drawLeg(ctx, BL, B.lw, backPants, L.shoes);
    drawArm(ctx, BA, B.aw, backSleeve, L.skinShade, shade(L.shirt, -30));
    drawLeg(ctx, FL, B.lw, L.pants, L.shoes);
    // quadril
    ctx.fillStyle = L.pants; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, B.hw - 1, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.save(); ctx.rotate(lean);
    drawTorso(ctx, L, B);
    ctx.translate(2, -T - 12); ctx.rotate(pose.tilt || 0); ctx.translate(2, -B.R * 0.85);
    drawHead(ctx, L, B.R, opt.expr || pose.expr || 'grit', opt.t || 0);
    ctx.restore();

    drawArm(ctx, FA, B.aw, L.jacket, L.skin, L.shirt);
    ctx.restore();
    return { hand: { x: FA.x2, y: FA.y2 - low }, head: { x: S.x, y: S.y - low - 40 }, height: low + T + B.R * 2 + 14 };
  }

  /* ---------------- ÍCONES DE HABILIDADE ---------------- */
  function iconBase(ctx, s) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.045; }
  function coin(ctx, x, y, r) {
    circle(ctx, x, y, r, '#ffcc2e', OUT, r * 0.22);
    circle(ctx, x, y, r * 0.68, null, '#c98a00', r * 0.12);
    ctx.fillStyle = '#8a5a00'; ctx.font = '900 ' + Math.round(r * 0.9) + 'px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', x, y + r * 0.05);
  }
  function doc(ctx, x, y, w, h, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2 - w * 0.25, -h / 2); ctx.lineTo(w / 2, -h / 2 + w * 0.25); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
    ctx.fillStyle = '#fbf7ea'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, w * 0.07); ctx.stroke();
    ctx.strokeStyle = '#8b94a8'; ctx.lineWidth = Math.max(1, w * 0.05);
    for (var i = 0; i < 4; i++) { var yy = -h / 2 + h * 0.25 + i * h * 0.17; ctx.beginPath(); ctx.moveTo(-w * 0.32, yy); ctx.lineTo(w * 0.3, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(220,30,40,.85)'; ctx.beginPath(); ctx.arc(w * 0.12, h * 0.28, w * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function beamIcon(ctx, s, c1, c2, extra) {
    var g = ctx.createLinearGradient(0, 0, s, 0); g.addColorStop(0, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.5); ctx.lineTo(s * 0.95, s * 0.22); ctx.lineTo(s * 0.95, s * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(ctx, s * 0.26, s * 0.5, s * 0.2, c2, OUT, s * 0.045);
    circle(ctx, s * 0.26, s * 0.5, s * 0.1, '#fff');
    if (extra) extra();
  }

  var ICONS = {
    fist: function (ctx, s) {
      ctx.fillStyle = '#f0b78f';
      ctx.beginPath(); ctx.roundRect(s * 0.2, s * 0.28, s * 0.55, s * 0.42, s * 0.12); ctx.fill(); ctx.stroke();
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(s * (0.22 + i * 0.13), s * 0.2, s * 0.14, s * 0.22, s * 0.06); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect(s * 0.12, s * 0.42, s * 0.24, s * 0.14, s * 0.06); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d61f2b'; ctx.fillRect(s * 0.3, s * 0.7, s * 0.36, s * 0.14); ctx.strokeRect(s * 0.3, s * 0.7, s * 0.36, s * 0.14);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.03; [[0.8, 0.25, 0.92, 0.18], [0.84, 0.42, 0.97, 0.42], [0.8, 0.6, 0.92, 0.67]].forEach(function (l) { ctx.beginPath(); ctx.moveTo(s * l[0], s * l[1]); ctx.lineTo(s * l[2], s * l[3]); ctx.stroke(); });
    },
    coins: function (ctx, s) { coin(ctx, s * 0.3, s * 0.3, s * 0.15); coin(ctx, s * 0.68, s * 0.24, s * 0.13); coin(ctx, s * 0.5, s * 0.58, s * 0.2); coin(ctx, s * 0.22, s * 0.74, s * 0.12); coin(ctx, s * 0.8, s * 0.74, s * 0.12); },
    megaphone: function (ctx, s) {
      ctx.fillStyle = '#e3262f'; ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.42); ctx.lineTo(s * 0.62, s * 0.2); ctx.lineTo(s * 0.62, s * 0.8); ctx.lineTo(s * 0.18, s * 0.58); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2f2f2'; ctx.fillRect(s * 0.08, s * 0.4, s * 0.12, s * 0.2); ctx.strokeRect(s * 0.08, s * 0.4, s * 0.12, s * 0.2);
      ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.ellipse(s * 0.62, s * 0.5, s * 0.07, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.04;
      [0.12, 0.2].forEach(function (r) { ctx.beginPath(); ctx.arc(s * 0.68, s * 0.5, s * (0.12 + r), -0.7, 0.7); ctx.stroke(); });
    },
    beamRed: function (ctx, s) { beamIcon(ctx, s, '#ff2a2a', '#ffd0a0', function () { coin(ctx, s * 0.7, s * 0.2, s * 0.08); coin(ctx, s * 0.82, s * 0.82, s * 0.08); }); },
    eraser: function (ctx, s) {
      ctx.save(); ctx.translate(s * 0.48, s * 0.55); ctx.rotate(-0.4);
      ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.roundRect(-s * 0.32, -s * 0.16, s * 0.64, s * 0.2, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.roundRect(-s * 0.32, s * 0.04, s * 0.64, s * 0.12, s * 0.03); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; [[0.15, 0.25, 0.05], [0.25, 0.15, 0.035], [0.1, 0.4, 0.03]].forEach(function (c) { ctx.beginPath(); ctx.arc(s * c[0], s * c[1], s * c[2], 0, 7); ctx.fill(); });
    },
    strike: function (ctx, s) {
      ctx.fillStyle = '#7a5130'; ctx.fillRect(s * 0.46, s * 0.4, s * 0.08, s * 0.5); ctx.strokeRect(s * 0.46, s * 0.4, s * 0.08, s * 0.5);
      ctx.fillStyle = '#e3262f'; ctx.beginPath(); ctx.roundRect(s * 0.14, s * 0.1, s * 0.72, s * 0.36, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(s * 0.2) + 'px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GREVE!', s * 0.5, s * 0.29);
      ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.arc(s * 0.5, s * 0.92, s * 0.3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    },
    march: function (ctx, s) {
      [[0.28, 0.9], [0.52, 1], [0.76, 0.9]].forEach(function (p, i) {
        var x = s * p[0], k = p[1];
        ctx.fillStyle = i === 1 ? '#e3262f' : '#b8202a';
        ctx.beginPath(); ctx.roundRect(x - s * 0.1 * k, s * 0.5, s * 0.2 * k, s * 0.36, s * 0.06); ctx.fill(); ctx.stroke();
        circle(ctx, x, s * 0.4, s * 0.09 * k, '#c98a5e', OUT, s * 0.035);
        ctx.beginPath(); ctx.moveTo(x + s * 0.08, s * 0.55); ctx.lineTo(x + s * 0.12, s * 0.22); ctx.stroke();
      });
      ctx.fillStyle = '#e3262f'; ctx.beginPath(); ctx.moveTo(s * 0.64, s * 0.12); ctx.lineTo(s * 0.92, s * 0.18); ctx.lineTo(s * 0.64, s * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
    },
    beamStar: function (ctx, s) { beamIcon(ctx, s, '#ff3b6b', '#ffe066', function () { drawStar(ctx, s * 0.72, s * 0.2, s * 0.1, '#ffe066'); drawStar(ctx, s * 0.82, s * 0.8, s * 0.09, '#fff'); }); },
    flagFist: function (ctx, s) {
      ctx.fillStyle = '#1ea54b'; ctx.beginPath(); ctx.roundRect(s * 0.08, s * 0.12, s * 0.84, s * 0.56, s * 0.05); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.18); ctx.lineTo(s * 0.86, s * 0.4); ctx.lineTo(s * 0.5, s * 0.62); ctx.lineTo(s * 0.14, s * 0.4); ctx.closePath(); ctx.fill();
      circle(ctx, s * 0.5, s * 0.4, s * 0.13, '#1f4fb5');
      ctx.fillStyle = '#f0b78f'; ctx.beginPath(); ctx.roundRect(s * 0.34, s * 0.52, s * 0.32, s * 0.3, s * 0.08); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d2b55'; ctx.fillRect(s * 0.38, s * 0.82, s * 0.24, s * 0.12); ctx.strokeRect(s * 0.38, s * 0.82, s * 0.24, s * 0.12);
    },
    smoke: function (ctx, s) {
      ctx.fillStyle = '#c9ced8';
      [[0.3, 0.6, 0.2], [0.55, 0.5, 0.24], [0.75, 0.65, 0.17], [0.45, 0.72, 0.18], [0.4, 0.35, 0.14]].forEach(function (c) { circle(ctx, s * c[0], s * c[1], s * c[2], '#c9ced8', OUT, s * 0.04); });
      [[0.3, 0.6, 0.15], [0.55, 0.5, 0.19], [0.75, 0.65, 0.12], [0.45, 0.72, 0.13], [0.4, 0.35, 0.09]].forEach(function (c) { circle(ctx, s * c[0], s * c[1], s * c[2], '#e6e9ef'); });
      ctx.strokeStyle = '#1ea54b'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(s * 0.15, s * 0.2); ctx.quadraticCurveTo(s * 0.5, s * 0.05, s * 0.85, s * 0.22); ctx.stroke();
    },
    shield: function (ctx, s) {
      ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.08); ctx.lineTo(s * 0.86, s * 0.22); ctx.quadraticCurveTo(s * 0.86, s * 0.7, s * 0.5, s * 0.92); ctx.quadraticCurveTo(s * 0.14, s * 0.7, s * 0.14, s * 0.22); ctx.closePath();
      var g = ctx.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#5fb7ff'); g.addColorStop(1, '#1f4fb5'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.22); ctx.lineTo(s * 0.72, s * 0.3); ctx.quadraticCurveTo(s * 0.7, s * 0.62, s * 0.5, s * 0.76); ctx.quadraticCurveTo(s * 0.3, s * 0.62, s * 0.28, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1d2b55'; ctx.font = '900 ' + Math.round(s * 0.22) + 'px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('§', s * 0.5, s * 0.5);
    },
    beamDocs: function (ctx, s) { beamIcon(ctx, s, '#22d06a', '#ffe14a', function () { doc(ctx, s * 0.72, s * 0.18, s * 0.16, s * 0.2, 0.3); doc(ctx, s * 0.8, s * 0.82, s * 0.16, s * 0.2, -0.4); }); },
    tractor: function (ctx, s) {
      ctx.fillStyle = '#1ea54b'; ctx.beginPath(); ctx.roundRect(s * 0.2, s * 0.38, s * 0.5, s * 0.24, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.roundRect(s * 0.42, s * 0.16, s * 0.28, s * 0.26, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ad7ff'; ctx.fillRect(s * 0.47, s * 0.21, s * 0.18, s * 0.13);
      ctx.fillStyle = '#555'; ctx.fillRect(s * 0.26, s * 0.22, s * 0.05, s * 0.16); ctx.strokeRect(s * 0.26, s * 0.22, s * 0.05, s * 0.16);
      circle(ctx, s * 0.6, s * 0.68, s * 0.2, '#2b2b2b', OUT, s * 0.04); circle(ctx, s * 0.6, s * 0.68, s * 0.08, '#ffd21f');
      circle(ctx, s * 0.24, s * 0.74, s * 0.12, '#2b2b2b', OUT, s * 0.04); circle(ctx, s * 0.24, s * 0.74, s * 0.05, '#ffd21f');
      doc(ctx, s * 0.88, s * 0.5, s * 0.14, s * 0.18, 0.4);
    },
    docs: function (ctx, s) { doc(ctx, s * 0.3, s * 0.3, s * 0.3, s * 0.38, -0.3); doc(ctx, s * 0.7, s * 0.35, s * 0.3, s * 0.38, 0.25); doc(ctx, s * 0.5, s * 0.66, s * 0.32, s * 0.4, 0.05); },
    horn: function (ctx, s) {
      ctx.fillStyle = '#e8d6a8'; ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.62); ctx.quadraticCurveTo(s * 0.4, s * 0.8, s * 0.68, s * 0.3); ctx.lineTo(s * 0.82, s * 0.42); ctx.quadraticCurveTo(s * 0.45, s * 0.98, s * 0.06, s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a4f28'; ctx.fillRect(s * 0.32, s * 0.6, s * 0.08, s * 0.12);
      ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = s * 0.045;
      [0.1, 0.18, 0.26].forEach(function (r) { ctx.beginPath(); ctx.arc(s * 0.76, s * 0.36, s * r, -1.9, -0.3); ctx.stroke(); });
    },
    beamGold: function (ctx, s) { beamIcon(ctx, s, '#ffb319', '#fff3b0', function () { coin(ctx, s * 0.7, s * 0.2, s * 0.08); doc(ctx, s * 0.82, s * 0.82, s * 0.14, s * 0.18, -0.3); }); }
  };

  function drawIcon(ctx, key, s) {
    ctx.save(); iconBase(ctx, s);
    (ICONS[key] || ICONS.fist)(ctx, s);
    ctx.restore();
  }

  var iconCache = {}, portraitCache = {};
  E.Art = {
    OUT: OUT, BODY: BODY, POSES: P, shade: shade, drawStar: drawStar, coin: coin, doc: doc,
    pose: function (name, t, k) { var f = P[name] || P.guard; return f(k !== undefined ? k : t, t); },
    drawFighter: drawFighter,
    drawIcon: drawIcon,
    iconURL: function (key, size) {
      size = size || 128;
      var id = key + size; if (iconCache[id]) return iconCache[id];
      var c = document.createElement('canvas'); c.width = c.height = size;
      drawIcon(c.getContext('2d'), key, size);
      return (iconCache[id] = c.toDataURL());
    },
    /** Retrato (cabeça e ombros) com fundo da facção */
    portraitURL: function (ch, size, plain) {
      size = size || 256;
      var id = ch.id + size + (plain ? 'p' : ''); if (portraitCache[id]) return portraitCache[id];
      var c = document.createElement('canvas'); c.width = c.height = size;
      var ctx = c.getContext('2d'), F = E.FACTIONS[ch.faction];
      if (!plain) {
        var g = ctx.createLinearGradient(0, 0, size, size); g.addColorStop(0, F.light); g.addColorStop(1, F.dark);
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
        for (var i = 0; i < 9; i++) { ctx.save(); ctx.translate(size / 2, size * 0.45); ctx.rotate(i * Math.PI / 4.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size, -size * 0.12); ctx.lineTo(size, size * 0.12); ctx.closePath(); ctx.fill(); ctx.restore(); }
        ctx.globalAlpha = 1;
      }
      var sc = size / 125;
      ctx.save(); ctx.translate(size * 0.47, size * 1.95); ctx.scale(sc, sc);
      drawFighter(ctx, ch, P.guard(0.3), { expr: 'grit' });
      ctx.restore();
      return (portraitCache[id] = c.toDataURL());
    }
  };
})(window.EVD = window.EVD || {});
