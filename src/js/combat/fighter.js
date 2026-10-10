/* Controlador de personagem: estado, física, movimentação e animação */
(function (E) {
  'use strict';
  E.F_SCALE = 1.32;
  var GRAV = 2600;

  function Fighter(ch, side) {
    this.ch = ch;
    this.faction = E.FACTIONS[ch.faction];
    this.d = E.derive(ch.stats);
    this.side = side;
    this.abilities = ch.abilities.map(function (id) { return E.ABILITIES[id]; });
    this.energy = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 720; this.canvas.height = 520;
    this.cx = this.canvas.getContext('2d');
    this.buffer = [];
    this.stats = { dealt: 0, hits: 0, blocked: 0, skills: 0 };
  }

  Fighter.prototype.reset = function (x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.facing = facing;
    this.grounded = true;
    this.hp = this.d.maxHp;
    this.state = 'intro'; this.stateT = 0; this.animT = Math.random() * 3;
    this.action = null;
    this.hitstun = 0; this.stun = 0; this.pendingStun = 0; this.stunImmune = 0;
    this.invuln = 0; this.shieldT = 0; this.shieldMax = 1; this.shieldRed = 0;
    this.bonusT = 0; this.bonus = 0; this.hidden = false;
    this.flashT = 0; this.blockFlash = 0;
    this.cooldowns = this.abilities.map(function () { return 0; });
    this.buffer = [];
  };

  Fighter.prototype.canAct = function () {
    return !this.action && this.hitstun <= 0 && this.stun <= 0 && ['ko', 'win', 'intro', 'lose'].indexOf(this.state) < 0;
  };

  Fighter.prototype.hurtbox = function () {
    var s = E.F_SCALE, G = E.Stage.GROUND, h = 250 * s, w = 70 * s;
    if (this.state === 'ko') return { x: this.x - 1, y: G - 1, w: 0, h: 0 };
    if (this.action && this.action.def.kind === 'teleport' && this.hidden) return { x: -9999, y: -9999, w: 0, h: 0 };
    return { x: this.x - w / 2, y: G + this.y - h, w: w, h: h };
  };

  /**
   * intents: { left, right, block, presses: [{type, idx}] }
   */
  Fighter.prototype.update = function (dt, intents, B) {
    var opp = B.opponentOf(this);
    this.animT += dt; this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.blockFlash > 0) this.blockFlash -= dt;
    if (this.stunImmune > 0) this.stunImmune -= dt;
    if (this.bonusT > 0) this.bonusT -= dt;
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) { this.shieldRed = 0; E.FX.ring(this.x, E.Stage.GROUND + this.y - 140 * E.F_SCALE, '#9bb8d6', 160, 0.3); } }
    var self = this;
    if (B.phase === 'fight') {
      for (var i = 0; i < this.cooldowns.length; i++) if (this.cooldowns[i] > 0) { this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt); if (this.cooldowns[i] === 0 && this.side === 0) E.Audio.play('ready'); }
      this.energy = Math.min(100, this.energy + dt * 1.4 * this.d.energyGain);
    }

    // buffer de comandos (280 ms) para tornar o controle responsivo
    (intents.presses || []).forEach(function (p) { p.ttl = 0.28; self.buffer.push(p); });
    this.buffer.forEach(function (p) { p.ttl -= dt; });
    this.buffer = this.buffer.filter(function (p) { return p.ttl > 0; });

    if (this.state === 'ko' || this.state === 'win' || this.state === 'lose' || this.state === 'intro') {
      this.vx *= 0.9;
      this.physics(dt);
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.state = 'hurt';
      if (this.grounded) this.vx *= Math.pow(0.02, dt);
      if (this.hitstun <= 0) {
        if (!this.grounded) this.hitstun = 0.02; // termina a queda primeiro
        else if (this.pendingStun) { this.stun = this.pendingStun; this.stunImmune = this.stun + 1.5; this.pendingStun = 0; this.state = 'dizzy'; this.stateT = 0; }
        else { this.state = 'idle'; this.stateT = 0; }
      }
    } else if (this.stun > 0) {
      this.stun -= dt; this.state = 'dizzy'; this.vx *= 0.8;
      if (this.stun <= 0) { this.state = 'idle'; this.stateT = 0; }
    } else if (this.action) {
      var a = this.action;
      a.t += dt;
      var done = a.kind.update(this, a, dt, B);
      if (done && this.action === a) { this.action = null; this.hidden = false; this.state = 'idle'; this.stateT = 0; }
    } else {
      // controle livre
      this.facing = opp.x >= this.x ? 1 : -1;
      var dir = (intents.right ? 1 : 0) - (intents.left ? 1 : 0);
      var blocking = intents.block && this.grounded;
      if (blocking) { this.state = 'block'; this.vx = 0; }
      else if (this.grounded) {
        this.vx = dir * this.d.walk * (dir === this.facing ? 1 : 0.85);
        this.state = dir ? 'walk' : 'idle';
      } else {
        this.vx += dir * 1400 * dt; this.vx = Math.max(-this.d.walk, Math.min(this.d.walk, this.vx));
        this.state = 'jump';
      }
      // ações com buffer
      for (var j = 0; j < this.buffer.length; j++) {
        var p = this.buffer[j];
        if (p.type === 'jump' && this.grounded && !blocking) {
          this.vy = -this.d.jump; this.grounded = false; this.vx = dir * this.d.walk * 0.9;
          E.FX.dust(this.x, E.Stage.GROUND, 4); E.Audio.play('whoosh');
          this.buffer.splice(j, 1); break;
        }
        if ((p.type === 'punch' || p.type === 'kick') && !blocking) {
          E.Abilities.start(this, p.type === 'punch' ? E.BASICS.soco : E.BASICS.chute, B);
          this.buffer.splice(j, 1); break;
        }
        if (p.type === 'skill') {
          var r = E.Abilities.use(this, p.idx, B);
          if (r.ok || r.reason !== 'busy') { this.buffer.splice(j, 1); if (!r.ok) B.emit('denied', { f: this, idx: p.idx, reason: r.reason, remaining: r.remaining }); }
          if (r.ok) break;
        }
      }
    }
    this.physics(dt);
  };

  Fighter.prototype.physics = function (dt) {
    var noGrav = this.action && this.action.def.kind === 'teleport' && this.hidden;
    if (!noGrav) this.vy += GRAV * dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.y >= 0) {
      if (!this.grounded && this.vy > 300) { E.FX.dust(this.x, E.Stage.GROUND, this.state === 'ko' ? 10 : 4); if (this.state === 'ko') { E.FX.shake(8, 0.2); E.Audio.play('stomp'); } }
      this.y = 0; this.vy = 0; this.grounded = true;
    } else this.grounded = false;
    var L = E.Stage.LEFT, R = E.Stage.RIGHT;
    if (this.x < L) { this.x = L; if (this.vx < 0) this.vx = 0; }
    if (this.x > R) { this.x = R; if (this.vx > 0) this.vx = 0; }
  };

  /* -------- animação -------- */
  Fighter.prototype.currentPose = function () {
    var P = E.Art.POSES, t = this.animT;
    if (this.action) { var r = this.action.kind.pose(this, this.action); return E.Art.pose(r[0], this.action.t, r[1]); }
    switch (this.state) {
      case 'walk': return P.walk(t);
      case 'jump': return P.jump(t);
      case 'block': return P.block(t);
      case 'hurt': return this.grounded ? P.hurt(this.stateT) : P.air_hurt(t);
      case 'dizzy': return P.dizzy(t);
      case 'ko': return P.ko(this.stateT);
      case 'win': return P.win(t);
      case 'lose': return P.dizzy(t);
      case 'intro': return this.stateT < 1.2 ? P.taunt(t) : P.guard(t);
      default: return P.guard(t);
    }
  };

  Fighter.prototype.render = function (ctx) {
    if (this.hidden) return;
    var c = this.cx, W = this.canvas.width, H = this.canvas.height, s = E.F_SCALE, G = E.Stage.GROUND;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.translate(W / 2, H - 40);
    c.scale(this.facing * s, s);
    var pose = this.currentPose();
    E.Art.drawFighter(c, this.ch, pose, { t: this.animT });
    if (this.flashT > 0 || this.blockFlash > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = this.flashT > 0 ? 'rgba(255,255,255,.85)' : 'rgba(140,210,255,.55)';
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
    // sombra
    var sh = Math.max(0.35, 1 + this.y / 400);
    ctx.save(); ctx.fillStyle = 'rgba(10,5,20,.35)'; ctx.beginPath(); ctx.ellipse(this.x, G + 2, 62 * sh, 13 * sh, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // aura de energia cheia
    if (this.energy >= 100 && this.state !== 'ko') {
      ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(this.animT * 10) * 0.15;
      var g = ctx.createRadialGradient(this.x, G + this.y - 150, 20, this.x, G + this.y - 150, 200);
      g.addColorStop(0, this.faction.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x - 220, G + this.y - 380, 440, 420); ctx.restore();
    }
    ctx.save();
    if (this.invuln > 0 && this.action && this.action.def.kind === 'teleport') ctx.globalAlpha = 0.55 + Math.sin(this.animT * 40) * 0.3;
    ctx.drawImage(this.canvas, this.x - W / 2, G + this.y - (H - 40));
    ctx.restore();
    // escudo
    if (this.shieldT > 0) {
      var k = Math.min(1, this.shieldT / 0.5);
      ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.animT * 8);
      ctx.translate(this.x, G + this.y - 150 * s);
      ctx.fillStyle = '#5fb7ff'; ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 5;
      ctx.beginPath();
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2 + this.animT; ctx.lineTo(Math.cos(a) * 150 * k, Math.sin(a) * 175 * k); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.85; ctx.stroke(); ctx.restore();
    }
    // atordoado: estrelas girando
    if (this.state === 'dizzy' || this.state === 'lose') {
      for (var j = 0; j < 4; j++) {
        var ang = this.animT * 5 + j * Math.PI / 2;
        ctx.save(); ctx.translate(this.x + Math.cos(ang) * 46, G + this.y - 330 * s + Math.sin(ang) * 12);
        E.Art.drawStar(ctx, 0, 0, 10, '#ffe14a'); ctx.restore();
      }
    }
  };

  E.Fighter = Fighter;
})(window.EVD = window.EVD || {});
