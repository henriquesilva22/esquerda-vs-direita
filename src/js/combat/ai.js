/* Oponente controlado pelo computador */
(function (E) {
  'use strict';
  var LEVELS = {
    facil:   { react: 0.42, aggr: 0.35, block: 0.15, skill: 0.25, jump: 0.02 },
    normal:  { react: 0.24, aggr: 0.55, block: 0.38, skill: 0.5,  jump: 0.04 },
    dificil: { react: 0.12, aggr: 0.75, block: 0.62, skill: 0.8,  jump: 0.06 }
  };

  function AI(f, B, level) {
    this.f = f; this.B = B; this.cfg = LEVELS[level] || LEVELS.normal;
    this.think = 0.6; this.move = 0; this.moveT = 0; this.blockT = 0; this.enabled = true;
  }

  AI.prototype.suits = function (def, d, opp) {
    var s = E.F_SCALE;
    switch (def.kind) {
      case 'melee': return d < (def.range + (def.lunge || 0) * 0.3 + 20) * s;
      case 'dash': return d < 420 && d > 60;
      case 'stomp': return d < def.radius * s * 0.9 && opp.grounded;
      case 'projectile': case 'wave': return d > 180;
      case 'rain': return true;
      case 'shield': return this.f.hp < 75 && d < 400;
      case 'teleport': return (this.f.x < E.Stage.LEFT + 80 || this.f.x > E.Stage.RIGHT - 80) && d < 200 || this.f.hp < 40;
      case 'beam': return d > 120;
    }
    return false;
  };

  AI.prototype.update = function (dt) {
    var f = this.f, B = this.B, opp = B.opponentOf(f), c = this.cfg;
    var out = { left: false, right: false, block: false, presses: [] };
    if (!this.enabled || B.phase !== 'fight') return out;
    var toward = opp.x > f.x ? 1 : -1, d = Math.abs(opp.x - f.x);

    this.think -= dt; this.moveT -= dt; this.blockT -= dt;
    if (this.think <= 0) {
      this.think = c.react * (0.7 + Math.random() * 0.6);
      var threat = false;
      if (opp.action && opp.action.def.kind !== 'shield' && opp.action.def.kind !== 'teleport' && d < 300) threat = true;
      B.projectiles.forEach(function (p) { if (p.owner === opp && Math.abs(p.x - f.x) < 320) threat = true; });
      if (B.beams.some(function (b) { return b.owner === opp; })) threat = true;

      if (threat && Math.random() < c.block) {
        if (B.beams.length && Math.random() < 0.35) out.presses.push({ type: 'jump' });
        else this.blockT = 0.35 + Math.random() * 0.3;
      } else if (f.canAct()) {
        this.blockT = 0;
        var used = false;
        if (Math.random() < c.skill) {
          var order = [3, 0, 1, 2].sort(function () { return Math.random() - 0.5; });
          if (f.energy >= 100 && Math.random() < 0.8) order.unshift(3);
          for (var i = 0; i < order.length && !used; i++) {
            var idx = order[i], def = f.abilities[idx];
            if (E.Abilities.check(f, idx).ok && this.suits(def, d, opp)) { out.presses.push({ type: 'skill', idx: idx }); used = true; }
          }
        }
        if (!used) {
          if (d < 125 * E.F_SCALE) {
            if (Math.random() < c.aggr) out.presses.push({ type: Math.random() < 0.55 ? 'punch' : 'kick' });
            else { this.move = -toward; this.moveT = 0.25; }
          } else {
            this.move = Math.random() < 0.85 ? toward : -toward; this.moveT = 0.35 + Math.random() * 0.4;
            if (Math.random() < c.jump) out.presses.push({ type: 'jump' });
          }
        }
      }
    }
    if (this.blockT > 0) out.block = true;
    else if (this.moveT > 0) { out.left = this.move < 0; out.right = this.move > 0; }
    return out;
  };

  E.AI = AI;
  E.AI.LEVELS = LEVELS;
})(window.EVD = window.EVD || {});
