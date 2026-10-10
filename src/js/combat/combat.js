/* Sistema de dano e colisão: caixas de acerto, bloqueio, projéteis e rajadas */
(function (E) {
  'use strict';

  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  var Combat = {
    overlap: overlap,

    /** Caixa de acerto à frente do lutador */
    frontBox: function (f, range, hy, hh) {
      var s = E.F_SCALE, G = E.Stage.GROUND;
      var x0 = f.x + f.facing * 18 * s, x1 = f.x + f.facing * (18 + range) * s;
      return { x: Math.min(x0, x1), y: G + f.y + hy * s - hh * s / 2, w: Math.abs(x1 - x0), h: hh * s };
    },

    /**
     * Aplica um golpe. Retorna 'hit', 'blocked' ou null (errou / invulnerável).
     * h = { dmg, kb, kbY, hitstun, stun, type: 'basic'|'skill'|'super'|'tick', color, sound, final }
     */
    hit: function (B, att, tgt, h, at) {
      if (!tgt || tgt.state === 'ko' || B.phase !== 'fight') return null;
      if (tgt.invuln > 0 && !h.ignoreInvuln) return null;
      var dir = tgt.x >= att.x ? 1 : -1;
      if (h.fromX !== undefined) dir = tgt.x >= h.fromX ? 1 : -1;
      var px = at ? at.x : tgt.x - dir * 30, py = at ? at.y : E.Stage.GROUND + tgt.y - 150 * E.F_SCALE;

      var dmg = h.dmg * att.d.dmgOut * tgt.d.dmgIn;
      if (att.bonusT > 0 && h.type !== 'tick') { dmg *= 1 + att.bonus; att.bonusT = 0; E.FX.text(px, py - 60, 'SURPRESA!', '#9cf7b5', 40); }
      var shielded = tgt.shieldT > 0;
      if (shielded) dmg *= 1 - tgt.shieldRed;

      var blocking = tgt.state === 'block' && tgt.grounded && (tgt.facing === -dir);
      if (blocking) {
        var chip = h.type === 'super' || h.type === 'tick' ? 0.3 : 0.15;
        dmg *= chip;
        tgt.hp = Math.max(0, tgt.hp - dmg);
        tgt.vx = dir * Math.min(420, (h.kb || 120) * 0.9 + 80);
        tgt.blockFlash = 0.12;
        tgt.energy = Math.min(100, tgt.energy + 3 * tgt.d.energyGain);
        if (h.type !== 'tick' || Math.random() < 0.3) { E.Audio.play('block'); E.FX.sparks(px, py, '#8fd3ff', 8, 0.7); }
        if (h.type !== 'tick') E.FX.text(px, py - 40, 'DEFESA!', '#8fd3ff', 36, 0.5);
        if (dmg >= 0.5) E.FX.number(px, py - 10, Math.max(1, dmg), '#bfe6ff');
        B.hitstop(0.04);
        att.stats.blocked++;
        if (tgt.hp <= 0) B.ko(tgt, att);
        B.emit('hit', { att: att, tgt: tgt, dmg: dmg, blocked: true });
        return 'blocked';
      }

      tgt.hp = Math.max(0, tgt.hp - dmg);
      tgt.action = null;
      var heavy = (h.kb || 0) >= 280 || h.kbY || h.final;
      tgt.hitstun = h.hitstun || 0.3;
      tgt.vx = dir * (h.kb || 100) * (shielded ? 0.4 : 1);
      if (h.kbY && !shielded) { tgt.vy = h.kbY; tgt.grounded = false; }
      if (h.stun && !shielded && tgt.stunImmune <= 0) { tgt.pendingStun = h.stun; E.FX.text(px, py - 70, 'ATORDOADO!', '#ffd84a', 40, 0.8); }
      if (heavy) tgt.invuln = tgt.hitstun + 0.25;
      tgt.state = tgt.grounded ? 'hurt' : 'hurt'; tgt.stateT = 0;
      tgt.flashT = 0.1;
      att.energy = Math.min(100, att.energy + (h.type === 'super' || h.type === 'tick' ? 0 : (h.gain || dmg * 1.1)) * att.d.energyGain);
      tgt.energy = Math.min(100, tgt.energy + dmg * 0.6 * tgt.d.energyGain);
      att.stats.dealt += dmg; att.stats.hits++;

      var color = h.color || '#ffe36a';
      if (h.type !== 'tick') {
        E.FX.sparks(px, py, color, heavy ? 18 : 10, heavy ? 1.3 : 0.9);
        var words = heavy ? ['POW!', 'BAM!', 'CRÁS!', 'TUM!'] : ['PÁ!', 'TAP!', 'PUF!'];
        if (heavy || Math.random() < 0.5) E.FX.text(px + dir * 20, py - 50, words[Math.floor(Math.random() * words.length)], color, heavy ? 60 : 44);
        E.Audio.play(heavy ? 'heavy' : 'hit');
        B.hitstop(heavy ? 0.1 : 0.055);
        E.FX.shake(heavy ? 10 : 4, heavy ? 0.25 : 0.12);
      } else {
        if (Math.random() < 0.5) E.FX.sparks(px, py, color, 4, 0.6);
        if (Math.random() < 0.35) E.Audio.play('hit');
        E.FX.shake(5, 0.08);
      }
      if (shielded) { E.FX.ring(E.Stage.GROUND ? tgt.x : px, E.Stage.GROUND + tgt.y - 140 * E.F_SCALE, '#ffd21f', 160, 0.3); }
      E.FX.number(px, py - 20, dmg, '#fff');
      if (tgt.hp <= 0) B.ko(tgt, att);
      B.emit('hit', { att: att, tgt: tgt, dmg: dmg, blocked: false });
      return 'hit';
    },

    /* ---------------- PROJÉTEIS ---------------- */
    updateProjectiles: function (B, dt) {
      var G = E.Stage.GROUND;
      for (var i = B.projectiles.length - 1; i >= 0; i--) {
        var p = B.projectiles[i];
        p.t += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.g) p.vy += p.g * dt;
        if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
        var tgt = B.opponentOf(p.owner);
        var box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
        var dead = p.t > p.life || p.x < -900 || p.x > E.Stage.W + 900;
        if (!dead && !p.hit && overlap(box, tgt.hurtbox())) {
          var r = Combat.hit(B, p.owner, tgt, { dmg: p.dmg, kb: p.kb || 60, hitstun: p.hitstun || 0.25, stun: p.stun, type: p.type || 'skill', color: p.color, fromX: p.x - p.vx * 0.05 }, { x: p.x, y: p.y });
          if (r || p.type !== 'drop') { p.hit = true; dead = true; }
        }
        if (!dead && p.y >= G - 4 && p.vy > 0) {
          dead = true;
          E.FX.dust(p.x, G, 3);
          if (p.sprite === 'coin') E.FX.sparks(p.x, G - 6, '#ffd21f', 4, 0.4);
        }
        if (dead) {
          if (p.sprite === 'speech' || p.sprite === 'horn') E.FX.ring(p.x, p.y, p.color || '#fff', 120, 0.3);
          B.projectiles.splice(i, 1);
        }
      }
    },

    /* ---------------- RAJADAS (supremos) ---------------- */
    updateBeams: function (B, dt) {
      for (var i = B.beams.length - 1; i >= 0; i--) {
        var b = B.beams[i], f = b.owner, tgt = B.opponentOf(f);
        b.t += dt; b.tick -= dt;
        b.x0 = f.x + f.facing * 70 * E.F_SCALE;
        b.y = E.Stage.GROUND + f.y + b.hy;
        var x1 = f.facing > 0 ? E.Stage.W + 60 : -60;
        var box = { x: Math.min(b.x0, x1), y: b.y - b.h / 2, w: Math.abs(x1 - b.x0), h: b.h };
        if (b.tick <= 0 && b.dealt < b.ticks) {
          b.tick += b.dur / b.ticks;
          b.dealt++;
          var last = b.dealt === b.ticks;
          if (overlap(box, tgt.hurtbox())) {
            Combat.hit(B, f, tgt, { dmg: b.dmg / b.ticks, kb: last ? 520 : 70, kbY: last ? -420 : 0, hitstun: last ? 0.8 : 0.2, type: 'tick', color: b.def.color2, final: last, ignoreInvuln: false }, { x: tgt.x - f.facing * 20, y: b.y });
          }
        }
        // partículas temáticas
        var dir = f.facing;
        if (Math.random() < 0.6) {
          var px = b.x0 + dir * Math.random() * 500;
          if (b.def.particles === 'money') E.FX.money(px, b.y, 1, dir);
          else if (b.def.particles === 'docs') E.FX.docs(px, b.y, 1, dir);
          else E.FX.stars(px, b.y, 1, dir, b.def.color2);
        }
        if (b.t >= b.dur) B.beams.splice(i, 1);
      }
    }
  };

  E.Combat = Combat;
})(window.EVD = window.EVD || {});
