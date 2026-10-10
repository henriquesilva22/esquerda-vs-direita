/* Sistema de habilidades: verificação de requisitos e execução por tipo */
(function (E) {
  'use strict';
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* Cada tipo define: start(f, def, B) -> estado; update(f, a, dt, B) -> true quando terminar; pose(f, a) -> [nome, k] */
  var KINDS = {
    melee: {
      start: function (f, def) {
        var sp = def.basic ? f.d.atkSpeed : 1;
        return { total: (def.startup + def.active + def.recovery) / sp, sp: sp, air: !f.grounded };
      },
      update: function (f, a, dt, B) {
        var def = a.def, t = a.t * a.sp;
        if (def.lunge && t < def.startup + def.active) f.vx = f.facing * def.lunge;
        else if (f.grounded) f.vx *= 0.75;
        if (!a.whiffed && t >= def.startup) { a.whiffed = true; E.Audio.play(def.sound || 'punch'); if (def.fx) burstFx(f, def); }
        if (!a.hit && t >= def.startup && t < def.startup + def.active) {
          var hy = a.air ? -100 : def.hy;
          var box = E.Combat.frontBox(f, def.range, hy, def.hh);
          var tgt = B.opponentOf(f);
          if (E.Combat.overlap(box, tgt.hurtbox())) {
            a.hit = true;
            E.Combat.hit(B, f, tgt, { dmg: def.dmg, kb: def.kb, kbY: def.kbY, hitstun: def.hitstun, type: def.basic ? 'basic' : 'skill', gain: def.gain,
              color: def.fx === 'patriot' ? '#3ee07a' : (def.fx === 'red' ? '#ff5a4d' : '#ffe36a') },
              { x: box.x + (f.facing > 0 ? box.w * 0.8 : box.w * 0.2), y: box.y + box.h / 2 });
          }
        }
        a.k = Math.min(1, a.t / a.total);
        return a.t >= a.total;
      },
      pose: function (f, a) { return [a.air ? 'airkick' : a.def.pose, a.k || 0]; }
    },

    projectile: {
      start: function () { return { total: 0.5 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        if (!a.fired && a.t >= def.cast) {
          a.fired = true;
          E.Audio.play(def.sound);
          B.projectiles.push({ owner: f, x: f.x + f.facing * 70, y: E.Stage.GROUND + f.y - 165 * E.F_SCALE, vx: f.facing * def.speed, vy: 0, w: def.w, h: def.h, dmg: def.dmg, kb: def.kb,
            hitstun: 0.32, sprite: def.sprite, life: 2.2, t: 0, spin: 14 * f.facing, rot: 0 });
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return [a.def.pose || 'throw', a.k]; }
    },

    wave: {
      start: function () { return { total: 0.75 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        if (!a.fired && a.t >= def.cast) {
          a.fired = true;
          E.Audio.play(def.sound);
          B.projectiles.push({ owner: f, x: f.x + f.facing * 80, y: E.Stage.GROUND + f.y - 150 * E.F_SCALE, vx: f.facing * def.speed, vy: 0, w: def.w, h: def.h, dmg: def.dmg, kb: 120,
            stun: def.stun, hitstun: 0.3, sprite: def.sprite, life: 2.6, t: 0, color: f.faction.light });
          E.FX.ring(f.x + f.facing * 80, E.Stage.GROUND + f.y - 150 * E.F_SCALE, '#fff', 90, 0.25);
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return ['cast', a.k]; }
    },

    rain: {
      start: function () { return { total: 0.65 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        if (!a.fired && a.t >= def.cast * 0.6) {
          a.fired = true;
          E.Audio.play(def.sound);
          E.FX.ring(f.x, E.Stage.GROUND + f.y - 290 * E.F_SCALE, '#ffd21f', 90, 0.35);
          for (var i = 0; i < def.count; i++) {
            B.schedule(i * def.interval + 0.15, function () {
              var tgt = B.opponentOf(f);
              B.projectiles.push({ owner: f, x: tgt.x + rand(-def.spread, def.spread) * 0.7 + tgt.vx * 0.25, y: -40, vx: 0, vy: 820, g: 300, w: 38, h: 38, dmg: def.dmg, kb: 50,
                hitstun: 0.22, sprite: def.sprite, life: 2, t: 0, type: 'drop', spin: rand(-8, 8), rot: rand(0, 6) });
            }, f);
          }
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return ['castUp', a.k]; }
    },

    stomp: {
      start: function () { return { total: 0.75 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        if (!a.fired && a.t >= def.cast * 0.9) {
          a.fired = true;
          E.Audio.play(def.sound);
          var G = E.Stage.GROUND;
          E.FX.ring(f.x, G, '#ffd21f', def.radius * 2.2, 0.45, true);
          E.FX.ring(f.x, G, f.faction.light, def.radius * 1.4, 0.35, true);
          E.FX.dust(f.x - 60, G, 8, -1); E.FX.dust(f.x + 60, G, 8, 1);
          E.FX.shake(12, 0.3);
          E.FX.text(f.x, G - 330 * E.F_SCALE, 'GREVE!', '#ffd21f', 56);
          var tgt = B.opponentOf(f);
          if (Math.abs(tgt.x - f.x) < def.radius * E.F_SCALE && tgt.y > -40) {
            E.Combat.hit(B, f, tgt, { dmg: def.dmg, kb: 260, hitstun: 0.35, stun: def.stun, type: 'skill', color: '#ffd21f' }, { x: tgt.x, y: G - 40 });
          }
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return ['stomp', a.k]; }
    },

    dash: {
      start: function (f, def) { E.Audio.play(def.sound); return { total: def.duration + 0.22, hits: 0, next: 0 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        if (a.t < def.duration) {
          f.vx = f.facing * def.speed;
          if (Math.random() < 0.7) E.FX.speedLine(f.x - f.facing * 40, E.Stage.GROUND + f.y - rand(60, 260), f.facing, f.faction.light);
          if (Math.random() < 0.4) E.FX.dust(f.x - f.facing * 30, E.Stage.GROUND, 1, -f.facing);
          a.next -= dt;
          if (a.hits < def.hits && a.next <= 0) {
            var tgt = B.opponentOf(f), box = E.Combat.frontBox(f, 70, -150, 220);
            if (E.Combat.overlap(box, tgt.hurtbox())) {
              a.hits++; a.next = 0.12;
              var last = a.hits === def.hits;
              E.Combat.hit(B, f, tgt, { dmg: def.dmg, kb: last ? def.finalKb : def.kb, hitstun: last ? 0.5 : 0.3, type: 'skill', color: f.faction.light, gain: def.dmg * 0.8 },
                { x: f.x + f.facing * 60, y: E.Stage.GROUND + f.y - 150 * E.F_SCALE });
              if (last) a.t = Math.max(a.t, def.duration - 0.05);
            }
          }
          if (f.x <= E.Stage.LEFT + 1 || f.x >= E.Stage.RIGHT - 1) a.t = Math.max(a.t, def.duration);
        } else f.vx *= 0.7;
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return [a.t < a.def.duration ? 'dash' : 'guard', a.t]; }
    },

    teleport: {
      start: function (f, def) { return { total: 0.55 }; },
      update: function (f, a, dt, B) {
        var def = a.def, tgt = B.opponentOf(f), G = E.Stage.GROUND;
        f.vx = 0;
        if (!a.gone && a.t >= 0.1) {
          a.gone = true; E.Audio.play(def.sound);
          E.FX.smoke(f.x, G - 20, 26);
          f.invuln = def.invuln; f.hidden = true;
          var side = tgt.x > f.x ? 1 : -1;
          var nx = tgt.x + side * 120;
          if (nx < E.Stage.LEFT + 20 || nx > E.Stage.RIGHT - 20) nx = tgt.x - side * 320;
          a.nx = Math.max(E.Stage.LEFT, Math.min(E.Stage.RIGHT, nx));
        }
        if (a.gone && !a.back && a.t >= 0.32) {
          a.back = true; f.hidden = false; f.x = a.nx; f.y = 0; f.vy = 0;
          f.facing = tgt.x >= f.x ? 1 : -1;
          E.FX.smoke(f.x, G - 20, 14);
          f.bonusT = def.bonusTime; f.bonus = def.bonus;
          E.FX.text(f.x, G - 330 * E.F_SCALE, 'SUMIU!', '#e6e9ef', 44);
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return ['crouch', a.k]; }
    },

    shield: {
      start: function () { return { total: 0.45 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        f.vx *= 0.7;
        if (!a.fired && a.t >= def.cast * 0.5) {
          a.fired = true; E.Audio.play(def.sound);
          f.shieldT = def.duration; f.shieldMax = def.duration; f.shieldRed = def.reduction;
          E.FX.ring(f.x, E.Stage.GROUND + f.y - 140 * E.F_SCALE, '#ffd21f', 220, 0.4);
          E.FX.text(f.x, E.Stage.GROUND - 340 * E.F_SCALE, 'BLINDADO!', '#ffd21f', 48);
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return ['shield', a.k]; }
    },

    beam: {
      start: function (f, def, B) { f.invuln = def.charge + 0.2; B.cutin(f, def); return { total: def.charge + def.duration + 0.35 }; },
      update: function (f, a, dt, B) {
        var def = a.def;
        f.vx = 0;
        if (!a.charging) { a.charging = true; E.Audio.play('charge'); }
        if (a.t < def.charge) {
          if (Math.random() < 0.8) {
            var ang = rand(0, Math.PI * 2), r = rand(80, 160);
            E.FX.stars(f.x + Math.cos(ang) * r, E.Stage.GROUND + f.y - 120 + Math.sin(ang) * r, 1, 0, def.color2);
          }
        }
        if (!a.fired && a.t >= def.charge) {
          a.fired = true; E.Audio.play('beam');
          E.FX.flash(def.color2, 0.25); E.FX.shake(14, def.duration);
          B.beams.push({ owner: f, def: def, t: 0, dur: def.duration, tick: 0.05, ticks: 10, dealt: 0, dmg: def.dmg, h: 70, hy: -112 * E.F_SCALE, x0: f.x, y: 0 });
        }
        a.k = a.t / a.total;
        return a.t >= a.total;
      },
      pose: function (f, a) { return [a.t < a.def.charge ? 'beamCharge' : (a.t < a.def.charge + a.def.duration ? 'beamFire' : 'guard'), a.t]; }
    }
  };

  function burstFx(f, def) {
    var G = E.Stage.GROUND, x = f.x + f.facing * 80, y = G + f.y - 170 * E.F_SCALE;
    if (def.fx === 'patriot') E.FX.confetti(x, y, ['#1ea54b', '#ffd21f', '#1f4fb5', '#fff'], 14, 20);
    if (def.fx === 'red') E.FX.confetti(x, y, ['#e3262f', '#ff8a5a', '#fff'], 10, 20);
  }

  E.Abilities = {
    KINDS: KINDS,
    /** Verifica requisitos. Retorna {ok, reason, remaining} */
    check: function (f, idx) {
      var def = f.abilities[idx];
      if (!def) return { ok: false, reason: 'none' };
      if (f.cooldowns[idx] > 0) return { ok: false, reason: 'cooldown', remaining: f.cooldowns[idx] };
      if (f.energy + 1e-6 < def.cost) return { ok: false, reason: 'energy', need: def.cost };
      if (!f.canAct()) return { ok: false, reason: 'busy' };
      if (def.kind !== 'melee' && !f.grounded) return { ok: false, reason: 'busy' };
      return { ok: true };
    },
    /** Inicia uma ação (habilidade ou golpe básico) */
    start: function (f, def, B) {
      var kind = KINDS[def.kind];
      var a = kind.start(f, def, B) || {};
      a.def = def; a.kind = kind; a.t = 0; a.k = 0;
      f.action = a; f.state = 'action'; f.stateT = 0;
      return a;
    },
    use: function (f, idx, B) {
      var c = this.check(f, idx);
      if (!c.ok) return c;
      var def = f.abilities[idx];
      f.energy = Math.max(0, f.energy - def.cost);
      f.cooldowns[idx] = def.cooldown;
      f.stats.skills++;
      this.start(f, def, B);
      B.emit('skill', { f: f, idx: idx, def: def });
      return c;
    }
  };
})(window.EVD = window.EVD || {});
