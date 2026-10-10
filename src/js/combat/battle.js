/* Gerenciador de combate: rodadas, tempo, vitória, render da arena */
(function (E) {
  'use strict';
  var W = 1280, H = 720;
  var OUT = '#16111b';

  function Battle(p1Char, cpuChar) {
    this.p1Char = p1Char; this.cpuChar = cpuChar;
    this.fighters = [new E.Fighter(p1Char, 0), new E.Fighter(cpuChar, 1)];
    this.player = this.fighters[0]; this.cpu = this.fighters[1];
    this.ai = new E.AI(this.cpu, this, E.Settings.data.difficulty);
    this.wins = [0, 0]; this.round = 0;
    this.fighters.forEach(function (f) { f.energy = 20; });
    this.listeners = {};
    this.time = 0;
    this.hype = [0, 0];
    var self0 = this;
    this.on('hit', function (d) { if (!d.blocked) self0.hype[d.att.side] = Math.min(1, self0.hype[d.att.side] + 0.35); });
    this.portraits = this.fighters.map(function (f) { var im = new Image(); im.src = E.Art.portraitURL(f.ch, 256, true); return im; });
    this.startRound();
  }

  Battle.prototype.on = function (evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); };
  Battle.prototype.emit = function (evt, data) { (this.listeners[evt] || []).forEach(function (fn) { fn(data); }); };
  Battle.prototype.opponentOf = function (f) { return f === this.fighters[0] ? this.fighters[1] : this.fighters[0]; };
  Battle.prototype.schedule = function (delay, fn, owner) { this.timers.push({ t: delay, fn: fn, owner: owner }); };
  Battle.prototype.hitstop = function (t) { this.hitstopT = Math.max(this.hitstopT, t); };
  Battle.prototype.banner = function (text, color, sub, life) { this.banners.push({ text: text, color: color || '#ffe14a', sub: sub, t: 0, life: life || 1.2 }); };

  Battle.prototype.startRound = function () {
    this.round++;
    this.projectiles = []; this.beams = []; this.timers = []; this.banners = [];
    this.hitstopT = 0; this.slowmo = 0; this.cutinData = null;
    this.timer = E.Settings.data.roundTime;
    this.phase = 'intro'; this.phaseT = 0; this.announced = 0;
    this.fighters[0].reset(400, 1); this.fighters[1].reset(880, -1);
    this.winner = null;
    E.FX.clear();
    this.emit('round', { round: this.round });
  };

  Battle.prototype.cutin = function (f, def) {
    this.cutinData = { f: f, def: def, t: 0, dur: 0.95 };
    E.Audio.play('superFlash');
    E.FX.flash('#fff', 0.15);
  };

  Battle.prototype.ko = function (tgt, att) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko'; this.phaseT = 0;
    tgt.state = 'ko'; tgt.stateT = 0; tgt.action = null; tgt.hitstun = 0; tgt.stun = 0; tgt.hidden = false;
    tgt.vy = -620; tgt.grounded = false; tgt.vx = (tgt.x >= att.x ? 1 : -1) * 380;
    this.winner = att;
    this.wins[att.side]++;
    this.slowmo = 1.3;
    this.projectiles = []; this.timers = [];
    E.Audio.play('ko'); E.FX.flash('#fff', 0.35); E.FX.shake(16, 0.5);
    this.banner('K.O.!', '#ff3b3b', null, 1.6);
    this.emit('ko', { winner: att, loser: tgt });
  };

  Battle.prototype.timeUp = function () {
    this.phase = 'ko'; this.phaseT = 0.6;
    var a = this.fighters[0], b = this.fighters[1];
    var ra = a.hp / a.d.maxHp, rb = b.hp / b.d.maxHp;
    this.projectiles = []; this.timers = []; this.beams = [];
    a.action = null; b.action = null;
    if (Math.abs(ra - rb) < 0.001) { this.winner = null; this.wins[0]++; this.wins[1]++; }
    else { this.winner = ra > rb ? a : b; this.wins[this.winner.side]++; this.opponentOf(this.winner).state = 'lose'; }
    E.Audio.play('round');
    this.banner('TEMPO!', '#ffe14a', null, 1.2);
    this.emit('ko', { winner: this.winner, timeUp: true });
  };

  Battle.prototype.update = function (dt, playerIntents) {
    this.time += dt;
    E.FX.update(dt);
    for (var bi = this.banners.length - 1; bi >= 0; bi--) { this.banners[bi].t += dt; if (this.banners[bi].t > this.banners[bi].life) this.banners.splice(bi, 1); }
    this.hype[0] = Math.max(0, this.hype[0] - dt * 0.5); this.hype[1] = Math.max(0, this.hype[1] - dt * 0.5);

    if (this.cutinData) { this.cutinData.t += dt; if (this.cutinData.t >= this.cutinData.dur) this.cutinData = null; else return; }
    if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.35; }

    this.phaseT += dt;
    var self = this;
    if (this.phase === 'intro') {
      if (this.announced === 0 && this.phaseT > 0.2) { this.announced = 1; this.banner('ROUND ' + this.round, '#ffe14a', this.round === 3 ? 'RODADA DECISIVA' : null, 1.1); E.Audio.play('round'); }
      if (this.announced === 1 && this.phaseT > 1.35) { this.announced = 2; this.banner('LUTEM!', '#ff5a3d', null, 0.8); E.Audio.play('fight'); }
      if (this.phaseT > 1.75) { this.phase = 'fight'; this.phaseT = 0; this.fighters.forEach(function (f) { f.state = 'idle'; f.stateT = 0; }); this.emit('fight', {}); }
    } else if (this.phase === 'fight') {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer <= 0) this.timeUp();
    } else if (this.phase === 'ko') {
      if (this.phaseT > 1.6 && !this.declared) {
        this.declared = true;
        if (this.winner) { this.winner.state = 'win'; this.winner.action = null; E.Audio.play('win'); this.banner(this.winner.ch.short + ' VENCE!', this.winner.faction.light, '“' + this.winner.ch.quotes.win + '”', 1.8); E.FX.confetti(this.winner.x, E.Stage.GROUND - 300, this.winner.faction.id === 'esquerda' ? ['#e3262f', '#fff', '#ff8a5a'] : ['#1ea54b', '#ffd21f', '#1f4fb5'], 40, 80); }
        else this.banner('EMPATE!', '#fff', null, 1.8);
      }
      if (this.phaseT > 3.6) {
        this.declared = false;
        if (this.wins[0] >= 2 || this.wins[1] >= 2) {
          this.phase = 'over';
          this.emit('matchEnd', { winner: this.wins[0] >= 2 && this.wins[1] >= 2 ? null : (this.wins[0] >= 2 ? this.fighters[0] : this.fighters[1]) });
        } else this.startRound();
        return;
      }
    }

    // agendamentos (chuva de projéteis etc.)
    for (var i = this.timers.length - 1; i >= 0; i--) {
      var tm = this.timers[i]; tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(i, 1); if (this.phase === 'fight') tm.fn(); }
    }

    var empty = { presses: [] };
    var pi = this.phase === 'fight' ? playerIntents : empty;
    var ci = this.ai.update(dt);
    this.fighters[0].update(dt, pi, this);
    this.fighters[1].update(dt, ci, this);

    E.Combat.updateProjectiles(this, dt);
    E.Combat.updateBeams(this, dt);

    // separação dos corpos
    var a = this.fighters[0], b = this.fighters[1];
    var minD = 78 * E.F_SCALE, dx = b.x - a.x;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 200 && a.state !== 'ko' && b.state !== 'ko' && !a.hidden && !b.hidden) {
      var push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      if (dx === 0) push = minD / 2;
      a.x -= push; b.x += push;
      [a, b].forEach(function (f) { f.x = Math.max(E.Stage.LEFT, Math.min(E.Stage.RIGHT, f.x)); });
      if (Math.abs(b.x - a.x) < minD - 1) { if (a.x <= E.Stage.LEFT + 1) b.x = a.x + minD; else if (b.x <= E.Stage.LEFT + 1) a.x = b.x + minD; else if (a.x >= E.Stage.RIGHT - 1) b.x = a.x - minD; else if (b.x >= E.Stage.RIGHT - 1) a.x = b.x - minD; }
    }
  };

  /* ---------------- RENDER ---------------- */
  function drawProjectile(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    var dir = p.vx >= 0 ? 1 : -1;
    switch (p.sprite) {
      case 'coin': ctx.scale(Math.cos(p.rot || 0) * 0.8 + 0.2, 1); E.Art.coin(ctx, 0, 0, 17); break;
      case 'doc': E.Art.doc(ctx, 0, 0, 30, 38, p.rot || 0); break;
      case 'eraser':
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = '#c98a4a'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(-24, -14, 48, 18, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.roundRect(-24, 2, 48, 11, 3); ctx.fill(); ctx.stroke();
        ctx.rotate(-(p.rot || 0));
        ctx.fillStyle = 'rgba(255,255,255,.6)'; for (var i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(-dir * i * 16, Math.sin(t * 20 + i) * 6, 7 - i, 0, 7); ctx.fill(); }
        break;
      case 'speech':
        ctx.scale(dir, 1);
        for (var r = 0; r < 3; r++) { ctx.strokeStyle = r === 0 ? '#ff5a4d' : 'rgba(255,255,255,' + (0.8 - r * 0.25) + ')'; ctx.lineWidth = 9 - r * 2; ctx.beginPath(); ctx.arc(-40 - r * 26, 0, 70 + r * 6, -0.9, 0.9); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(10, -6, 54, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(-52, 34); ctx.lineTo(-14, 22); ctx.fill();
        ctx.scale(dir, 1);
        ctx.fillStyle = '#c4161f'; ctx.font = '26px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(t * 4) % 2 ? 'BLÁ BLÁ' : 'BLÁ!', dir * 10, -6);
        break;
      case 'horn':
        ctx.scale(dir, 1);
        for (var q = 0; q < 4; q++) { ctx.strokeStyle = q % 2 ? '#ffd21f' : '#1ea54b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-q * 22, 0, 40 + q * 18 + Math.sin(t * 20) * 4, -1.0, 1.0); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.font = '30px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.scale(dir, 1);
        ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.strokeText('UÓÓÓ!', dir * 20, -56); ctx.fillText('UÓÓÓ!', dir * 20, -56);
        break;
    }
    ctx.restore();
  }

  function drawBeam(ctx, b, t) {
    var f = b.owner, dir = f.facing, x0 = b.x0, y = b.y;
    var x1 = dir > 0 ? 3200 : -1920; // até além da borda de qualquer tela
    var grow = Math.min(1, b.t / 0.12), fade = Math.max(0, b.t > b.dur - 0.15 ? (b.dur - b.t) / 0.15 : 1);
    var h = b.h * grow * fade * (1 + Math.sin(t * 60) * 0.06);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, b.def.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), y - h * 1.3, Math.abs(x1 - x0), h * 2.6);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = b.def.color; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, y - h * 0.55);
    for (var i = 0; i <= 20; i++) { var xx = x0 + (x1 - x0) * i / 20; ctx.lineTo(xx, y - h * 0.55 + Math.sin(t * 40 + i) * 5); }
    for (var j = 20; j >= 0; j--) { var xx2 = x0 + (x1 - x0) * j / 20; ctx.lineTo(xx2, y + h * 0.55 + Math.sin(t * 40 + j + 2) * 5); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = b.def.color2; ctx.fillRect(Math.min(x0, x1), y - h * 0.28, Math.abs(x1 - x0), h * 0.56);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.min(x0, x1), y - h * 0.1, Math.abs(x1 - x0), h * 0.2);
    // esfera na origem
    var r = Math.max(0, 46 * grow * fade + Math.sin(t * 50) * 4 * fade);
    ctx.beginPath(); ctx.arc(x0, y, r * 1.25, 0, 7); ctx.fillStyle = b.def.color; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0, y, r * 0.85, 0, 7); ctx.fillStyle = b.def.color2; ctx.fill();
    ctx.beginPath(); ctx.arc(x0, y, r * 0.45, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  function drawCharge(ctx, f, t) {
    var a = f.action; if (!a || a.def.kind !== 'beam' || a.t >= a.def.charge) return;
    var k = a.t / a.def.charge, x = f.x - f.facing * 30, y = E.Stage.GROUND + f.y - 120;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var r = 20 + k * 40 + Math.sin(t * 50) * 5;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, a.def.color2); g.addColorStop(0.7, a.def.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawCutin(ctx, B) {
    var c = B.cutinData, k = c.t / c.dur, f = c.f, F = f.faction;
    var inK = Math.min(1, k / 0.18), outK = k > 0.82 ? (k - 0.82) / 0.18 : 0;
    var dir = f.side === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(-dir * (1 - inK) * 2 * W + dir * outK * 2 * W, 0);
    // faixa estendida além de 0–1280 para atravessar telas mais largas que 16:9
    ctx.beginPath(); ctx.moveTo(-2000, 328); ctx.lineTo(3280, 122); ctx.lineTo(3280, 422); ctx.lineTo(-2000, 628); ctx.closePath();
    var g = ctx.createLinearGradient(0, 200, 0, 550); g.addColorStop(0, F.light); g.addColorStop(1, F.dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
    for (var i = 0; i < 60; i++) { var yy = 140 + (i * 37 + c.t * 900) % 480, xx = ((i * 211) % 4600) - 1700; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - dir * 260, yy + 10); ctx.stroke(); }
    var img = B.portraits[f.side];
    if (img && img.complete) { var px = f.side === 0 ? 40 : W - 420; ctx.drawImage(img, px + dir * k * 30, 150, 380, 380); }
    ctx.restore();
    ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 6; ctx.stroke();
    ctx.textAlign = f.side === 0 ? 'left' : 'right';
    var tx = f.side === 0 ? 450 : W - 450;
    ctx.font = '34px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.fillStyle = '#ffe14a'; ctx.lineJoin = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.strokeText('GOLPE SUPREMO', tx, 300); ctx.fillText('GOLPE SUPREMO', tx, 300);
    var name = c.def.name.toUpperCase();
    var size = name.length > 22 ? 62 : 74;
    ctx.font = size + 'px Bangers, Futura-CondensedExtraBold, Impact, sans-serif';
    var words = name.split(' '), l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
    [l1, l2].forEach(function (l, i) { ctx.lineWidth = 12; ctx.strokeText(l, tx, 370 + i * size * 0.95); ctx.fillStyle = '#fff'; ctx.fillText(l, tx, 370 + i * size * 0.95); });
    ctx.restore();
  }

  function drawBanners(ctx, B) {
    B.banners.forEach(function (b) {
      var k = b.t / b.life, sc = k < 0.12 ? 2.2 - k / 0.12 * 1.2 : 1, a = k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 300); ctx.scale(sc, sc);
      ctx.font = '120px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = OUT; ctx.lineWidth = 22; ctx.strokeText(b.text, 0, 0);
      var g = ctx.createLinearGradient(0, -50, 0, 50); g.addColorStop(0, '#fff'); g.addColorStop(0.45, b.color); g.addColorStop(1, E.Art.shade(b.color.length === 7 ? b.color : '#ffe14a', -70));
      ctx.fillStyle = g; ctx.fillText(b.text, 0, 0);
      if (b.sub) { ctx.font = '40px Bangers, Futura-CondensedExtraBold, Impact, sans-serif'; ctx.lineWidth = 10; ctx.strokeText(b.sub, 0, 92); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, 92); }
      ctx.restore();
    });
  }

  /**
   * cam = { k, ox, oy, W, H, dpr, view }: tela = mundo × k + (ox, oy), em px CSS (× dpr no canvas).
   * O mundo é desenhado pela câmera; flash, golpe supremo e avisos são desenhados em espaço de tela
   * para cobrir a tela toda em qualquer proporção.
   */
  Battle.prototype.render = function (ctx, cam) {
    var t = this.time;
    ctx.setTransform(cam.dpr * cam.k, 0, 0, cam.dpr * cam.k, cam.dpr * cam.ox, cam.dpr * cam.oy);
    ctx.save();
    var off = E.FX.offset(); ctx.translate(off.x, off.y);
    if (this.cutinData) { var f0 = this.cutinData.f, z = 1 + Math.min(1, this.cutinData.t / 0.2) * 0.06; ctx.translate(f0.x, E.Stage.GROUND - 150); ctx.scale(z, z); ctx.translate(-f0.x, -(E.Stage.GROUND - 150)); }
    E.Stage.draw(ctx, t, this.hype, cam.view);
    var order = this.fighters.slice().sort(function (a, b) { return (a.action ? 1 : 0) - (b.action ? 1 : 0); });
    order.forEach(function (f) { drawCharge(ctx, f, t); f.render(ctx); });
    this.projectiles.forEach(function (p) { drawProjectile(ctx, p, t); });
    this.beams.forEach(function (b) { drawBeam(ctx, b, t); });
    E.FX.draw(ctx);
    ctx.restore();
    // ---- espaço de tela ----
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    E.FX.drawFlash(ctx, cam.W, cam.H);
    // moldura de interface 1280×720 centralizada (para textos e o golpe supremo)
    var u = Math.min(cam.W / W, cam.H / H);
    var ui = function () { ctx.setTransform(cam.dpr * u, 0, 0, cam.dpr * u, cam.dpr * (cam.W - W * u) / 2, cam.dpr * (cam.H - H * u) * 0.42); };
    if (this.cutinData) {
      var c = this.cutinData, outK = c.t / c.dur > 0.82 ? (c.t / c.dur - 0.82) / 0.18 : 0;
      ctx.fillStyle = 'rgba(8,4,16,' + (0.65 * (1 - outK)) + ')'; ctx.fillRect(0, 0, cam.W, cam.H);
      ui(); drawCutin(ctx, this);
    }
    ui(); drawBanners(ctx, this);
  };

  E.Battle = Battle;
})(window.EVD = window.EVD || {});
