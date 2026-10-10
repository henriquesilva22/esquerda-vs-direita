/* Cenário: Esplanada caricata com o Congresso, torcidas e piso de pedra.
 * A área jogável continua sendo x 70–1210 (paredes) com o chão em y 640, mas o cenário é
 * pintado num mundo bem maior (XMIN–XMAX, YMIN–YMAX) para a câmera poder preencher telas
 * mais largas ou mais altas que 16:9 sem faixas vazias. */
(function (E) {
  'use strict';
  var W = 1280, H = 720, GROUND = 640;
  var XMIN = -760, XMAX = 2040, YMIN = -480, YMAX = 1200;
  var BACK_BOTTOM = 546, FRONT_TOP = 514;
  var OUT = '#16111b';
  var layers = null;

  function rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function cloud(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var parts = [[0, 0, 34], [36, -14, 40], [78, -2, 32], [104, 10, 22], [-30, 10, 22], [50, 14, 30]];
    ctx.fillStyle = '#c7e2fb';
    parts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] + 4, p[1] + 8, p[2], 0, 7); ctx.fill(); });
    ctx.fillStyle = '#ffffff';
    parts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, 7); ctx.fill(); });
    ctx.restore();
  }

  function makeLayer(y0, y1) {
    var c = document.createElement('canvas');
    c.width = XMAX - XMIN; c.height = y1 - y0;
    var ctx = c.getContext('2d');
    ctx.translate(-XMIN, -y0);
    return { c: c, ctx: ctx, y0: y0 };
  }

  function buildBack() {
    var L = makeLayer(YMIN, BACK_BOTTOM), ctx = L.ctx, R = rng(3);
    // céu (mais alto que o original, para telas altas)
    var g = ctx.createLinearGradient(0, YMIN, 0, 470);
    g.addColorStop(0, '#1b4fa6'); g.addColorStop(0.49, '#2b74d6'); g.addColorStop(0.8, '#62aef0'); g.addColorStop(1, '#bfe4ff');
    ctx.fillStyle = g; ctx.fillRect(XMIN, YMIN, XMAX - XMIN, 480 - YMIN);
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff';
    for (var i = 0; i < 16; i++) { ctx.save(); ctx.translate(640, 120); ctx.rotate(i * Math.PI / 8 + 0.1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2400, -170); ctx.lineTo(2400, 170); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
    [[170, 110, 1.1], [980, 80, 1.3], [520, 60, 0.7], [1150, 210, 0.8], [60, 250, 0.8], [760, 190, 0.6],
     [-260, 160, 1.0], [-560, 60, 1.2], [-420, 300, 0.7], [1460, 120, 1.1], [1760, 240, 0.9], [1900, 40, 1.0],
     [300, -120, 1.2], [880, -220, 1.0], [-120, -300, 0.9], [1320, -160, 1.1], [620, -380, 0.8], [-500, -200, 1.0], [1700, -320, 0.9]
    ].forEach(function (c) { cloud(ctx, c[0], c[1], c[2]); });

    // ministérios (blocos) dos dois lados, até as bordas do mundo
    function block(x, top) {
      ctx.fillStyle = '#9fbfd6'; ctx.fillRect(x, top, 56, 442 - top);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (var r = 0; r < Math.floor((442 - top) / 11) - 1; r++) ctx.fillRect(x + 4, top + 6 + r * 11, 48, 3);
    }
    for (var m = 0; m < 16; m++) {
      var lx = 320 - m * 70, rx = 904 + m * 70;
      var top = 372 - Math.min(m, 6) * 6 - (m > 6 ? (R() * 12) : 0);
      if (lx > XMIN - 60) block(lx, top);
      if (rx < XMAX) block(rx, top);
    }

    // gramado e espelho d'água
    ctx.fillStyle = '#5cbf4a'; ctx.fillRect(XMIN, 440, XMAX - XMIN, 106);
    ctx.fillStyle = '#4aa83c'; ctx.fillRect(XMIN, 440, XMAX - XMIN, 8);
    var wg = ctx.createLinearGradient(0, 452, 0, 492); wg.addColorStop(0, '#7cc6f2'); wg.addColorStop(1, '#3d8fd0');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(380, 456); ctx.lineTo(900, 456); ctx.lineTo(960, 494); ctx.lineTo(320, 494); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    for (var w = 0; w < 5; w++) { ctx.beginPath(); ctx.moveTo(420 + w * 100, 466 + (w % 2) * 14); ctx.lineTo(470 + w * 100, 466 + (w % 2) * 14); ctx.stroke(); }

    // CONGRESSO
    ctx.lineWidth = 3; ctx.strokeStyle = OUT;
    ctx.fillStyle = '#e9eef3'; ctx.fillRect(360, 400, 560, 26); ctx.strokeRect(360, 400, 560, 26);
    ctx.fillStyle = '#2f4a63';
    for (var col = 0; col < 26; col++) ctx.fillRect(372 + col * 21, 426, 10, 22);
    ctx.fillStyle = '#d9e1e8'; ctx.fillRect(350, 446, 580, 10); ctx.strokeRect(350, 446, 580, 10);
    ctx.fillStyle = '#cfd8e0'; ctx.beginPath(); ctx.moveTo(560, 456); ctx.lineTo(720, 456); ctx.lineTo(760, 480); ctx.lineTo(520, 480); ctx.closePath(); ctx.fill(); ctx.stroke();
    function tower(x) {
      var tg = ctx.createLinearGradient(x, 0, x + 50, 0); tg.addColorStop(0, '#f4f7fa'); tg.addColorStop(1, '#c4cfd9');
      ctx.fillStyle = tg; ctx.fillRect(x, 150, 50, 252); ctx.strokeRect(x, 150, 50, 252);
      ctx.fillStyle = 'rgba(70,100,130,.45)';
      for (var f = 0; f < 22; f++) ctx.fillRect(x + 4, 156 + f * 11, 42, 3);
    }
    tower(586); tower(644);
    ctx.fillStyle = '#e7edf2'; ctx.fillRect(636, 250, 8, 34); ctx.strokeRect(636, 250, 8, 34);
    ctx.fillStyle = '#f2f5f8'; ctx.beginPath(); ctx.ellipse(470, 400, 70, 42, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(120,150,180,.35)'; ctx.beginPath(); ctx.ellipse(490, 400, 50, 34, 0, Math.PI * 1.25, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2f5f8'; ctx.beginPath(); ctx.moveTo(718, 352); ctx.quadraticCurveTo(810, 432, 902, 352); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9d4de'; ctx.beginPath(); ctx.ellipse(810, 352, 92, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9eef3'; ctx.fillRect(796, 384, 28, 16); ctx.strokeRect(796, 384, 28, 16);
    return L;
  }

  function buildFront() {
    var L = makeLayer(FRONT_TOP, YMAX), ctx = L.ctx, R = rng(7), X0 = XMIN, X1 = XMAX;
    // muro das torcidas
    ctx.fillStyle = '#b9b2a8'; ctx.fillRect(X0, 520, X1 - X0, 22);
    ctx.fillStyle = '#9b948a'; ctx.fillRect(X0, 536, X1 - X0, 6);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, 520); ctx.lineTo(X1, 520); ctx.stroke();
    // piso em perspectiva (continua bem abaixo do chão: é onde ficam os comandos na tela)
    var fg = ctx.createLinearGradient(0, 542, 0, YMAX); fg.addColorStop(0, '#8d8a87'); fg.addColorStop(0.3, '#6f6c6a'); fg.addColorStop(1, '#3c3a3b');
    ctx.fillStyle = fg; ctx.fillRect(X0, 542, X1 - X0, YMAX - 542);
    ctx.strokeStyle = 'rgba(30,25,30,.35)'; ctx.lineWidth = 2;
    for (var k = -34; k <= 34; k++) {
      var xt = 640 + k * 46, slope = (k * 104) / 178;
      ctx.beginPath(); ctx.moveTo(xt, 542); ctx.lineTo(xt + slope * (YMAX - 542), YMAX); ctx.stroke();
    }
    [542, 556, 574, 598, 628, 666, 712, 766, 830, 906, 996, 1100].forEach(function (y) { ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (var s = 0; s < 500; s++) ctx.fillRect(X0 + R() * (X1 - X0), 545 + R() * (YMAX - 545), 2 + R() * 6, 2);
    ctx.fillStyle = '#e8c33a'; ctx.globalAlpha = 0.85; ctx.fillRect(X0, 600, X1 - X0, 7); ctx.globalAlpha = 1;
    return L;
  }

  /* torcidas animadas (só o que aparece na tela é desenhado) */
  var crowd = null;
  function buildCrowd() {
    var R = rng(42), list = [];
    var skins = ['#f1c7a3', '#d9a37a', '#b97a52', '#8a5434', '#5f3a24', '#e8b48f'];
    for (var side = 0; side < 2; side++) {
      for (var row = 0; row < 3; row++) {
        var x = side === 0 ? 412 - row * 14 : 868 + row * 14;
        while (side === 0 ? x > XMIN : x < XMAX) {
          var shirt = side === 0 ? (R() < 0.75 ? '#d8232c' : (R() < 0.5 ? '#f2f2f2' : '#8f1219')) : (R() < 0.45 ? '#ffd21f' : (R() < 0.6 ? '#1ea54b' : '#1f4fb5'));
          list.push({ side: side, x: x + R() * 10, y: 500 - row * 18 + R() * 6, row: row, skin: skins[Math.floor(R() * skins.length)], shirt: shirt, ph: R() * 6, sc: 0.9 - row * 0.08, cap: R() < 0.3 });
          x += (side === 0 ? -1 : 1) * (32 + R() * 6);
        }
      }
    }
    list.sort(function (a, b) { return b.row - a.row; });
    return list;
  }

  function drawFlag(ctx, x, y, t, kind, ph) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -120); ctx.stroke();
    var fw = 92, fh = 60;
    ctx.beginPath();
    for (var i = 0; i <= 10; i++) { var px = i / 10 * fw; ctx.lineTo(px, -118 + Math.sin(t * 4 + i * 0.6 + ph) * 5 * (i / 10)); }
    for (var j = 10; j >= 0; j--) { var px2 = j / 10 * fw; ctx.lineTo(px2, -118 + fh + Math.sin(t * 4 + j * 0.6 + ph) * 5 * (j / 10)); }
    ctx.closePath();
    if (kind === 'br') {
      ctx.fillStyle = '#1ea54b'; ctx.fill(); ctx.save(); ctx.clip();
      var oy = Math.sin(t * 4 + 5 * 0.6 + ph) * 2.5;
      ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(8, -88 + oy); ctx.lineTo(46, -112 + oy); ctx.lineTo(84, -88 + oy); ctx.lineTo(46, -64 + oy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f4fb5'; ctx.beginPath(); ctx.arc(46, -88 + oy, 15, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(46, -70 + oy, 22, -2.4, -0.75); ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#d8232c'; ctx.fill(); ctx.save(); ctx.clip();
      E.Art.drawStar(ctx, 46, -88 + Math.sin(t * 4 + 3 + ph) * 2.5, 16, '#fff');
      ctx.restore();
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  function drawSign(ctx, x, y, text, bg, fg, t, ph) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3 + ph) * 4); ctx.rotate(Math.sin(t * 2 + ph) * 0.04);
    ctx.fillStyle = '#6b4f33'; ctx.fillRect(-3, 0, 6, 70);
    ctx.fillStyle = bg; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.fillRect(-62, -66, 124, 70); ctx.strokeRect(-62, -66, 124, 70);
    ctx.fillStyle = fg; ctx.font = '26px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var lines = text.split('\n'); lines.forEach(function (l, i) { ctx.fillText(l, 0, -31 + (i - (lines.length - 1) / 2) * 26); });
    ctx.restore();
  }

  var FLAGS = [[170, 470, 'red', 0], [300, 455, 'red', 2], [-120, 465, 'red', 4], [-400, 458, 'red', 1], [-640, 468, 'red', 3],
               [1010, 470, 'br', 1], [1140, 455, 'br', 3], [1400, 466, 'br', 2], [1660, 458, 'br', 0], [1900, 468, 'br', 4]];
  var SIGNS = [[90, 450, 'MAIS\nDIREITOS', '#fff4ea', '#c4161f', 0.5], [-270, 452, 'POVO NA\nRUA', '#d8232c', '#fff', 2.1],
               [900, 452, 'PÁTRIA\nAMADA', '#1ea54b', '#ffd21f', 1.5], [1530, 450, 'ORDEM E\nPROGRESSO', '#ffd21f', '#1f4fb5', 0.9]];

  function drawCrowd(ctx, t, hype, v) {
    if (!crowd) crowd = buildCrowd();
    var x0 = v.x0 - 140, x1 = v.x1 + 140;
    FLAGS.forEach(function (f) { if (f[0] > x0 - 100 && f[0] < x1) drawFlag(ctx, f[0], f[1], t, f[2], f[3]); });
    SIGNS.forEach(function (s) { if (s[0] > x0 && s[0] < x1) drawSign(ctx, s[0], s[1], s[2], s[3], s[4], t, s[5]); });
    for (var i = 0; i < crowd.length; i++) {
      var p = crowd[i];
      if (p.x < x0 || p.x > x1) continue;
      var hs = hype[p.side] || 0;
      var jump = Math.max(0, Math.sin(t * (6 + hs * 6) + p.ph)) * (4 + hs * 10);
      var y = p.y - jump, s = p.sc;
      ctx.save(); ctx.translate(p.x, y); ctx.scale(s, s);
      var armUp = Math.sin(t * 5 + p.ph) > 0.2 - hs;
      ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.roundRect(-15, -6, 30, 40, 9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = p.shirt; ctx.lineWidth = 8; ctx.lineCap = 'round';
      if (armUp) { ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(18, -26); ctx.stroke(); ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(18, -30, 6, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, -18, 13, 0, 7); ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      if (p.cap) { ctx.fillStyle = p.side ? '#1ea54b' : '#d8232c'; ctx.beginPath(); ctx.arc(0, -22, 13, Math.PI, 0); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = OUT; ctx.fillRect(-5, -20, 3, 3); ctx.fillRect(3, -20, 3, 3);
      ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI); ctx.fill();
      ctx.restore();
    }
  }

  E.Stage = {
    W: W, H: H, GROUND: GROUND, LEFT: 70, RIGHT: W - 70,
    BOUNDS: { x0: XMIN, x1: XMAX, y0: YMIN, y1: YMAX },
    /** view: retângulo do mundo visível {x0, x1, y0, y1}; sem view, o enquadramento 1280×720 clássico */
    draw: function (ctx, t, hype, view) {
      if (!layers) layers = { back: buildBack(), front: buildFront() };
      var v = view || { x0: 0, x1: W, y0: 0, y1: H };
      // além do mundo pintado (telas extremamente largas): continua céu e piso
      if (v.x0 < XMIN || v.x1 > XMAX || v.y0 < YMIN || v.y1 > YMAX) {
        ctx.fillStyle = '#1b4fa6'; ctx.fillRect(v.x0 - 10, v.y0 - 10, v.x1 - v.x0 + 20, 560 - v.y0);
        ctx.fillStyle = '#3c3a3b'; ctx.fillRect(v.x0 - 10, 540, v.x1 - v.x0 + 20, v.y1 - 530);
      }
      ctx.drawImage(layers.back.c, XMIN, layers.back.y0);
      drawCrowd(ctx, t, hype || [0, 0], v);
      ctx.drawImage(layers.front.c, XMIN, layers.front.y0);
    },
    invalidate: function () { layers = null; }
  };
})(window.EVD = window.EVD || {});
