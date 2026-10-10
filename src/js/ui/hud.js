/* Interface de combate: barras, retratos, tempo e botões de habilidade */
(function (E) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var els = null, toastTimer = 0;

  function fmt1(n) { return n.toFixed(1).replace('.', ','); }

  function buildPlayer(f, side) {
    var F = f.faction, box = $('hud-p' + side);
    box.style.setProperty('--c', F.color);
    box.style.setProperty('--c2', side === 0 ? '#ff8a5a' : (F.id === 'direita' ? F.green : '#3fa9ff'));
    if (F.id === 'esquerda') box.style.setProperty('--c2', '#ff8a5a');
    box.innerHTML =
      '<div class="pport"><img alt="" src="' + E.Art.portraitURL(f.ch, 192) + '"></div>' +
      '<div class="pinfo">' +
        '<div class="pname">' + f.ch.short + (side === 1 ? ' <span style="font-size:.55em;color:#9fd0ff">CPU</span>' : '') + '</div>' +
        '<div class="hpbar" role="meter" aria-label="Vida de ' + f.ch.name + '" aria-valuemin="0" aria-valuemax="100"><div class="trail"></div><div class="fill"></div></div>' +
        '<div class="subrow"><span class="ftag">' + F.name + '</span><div class="spbar" aria-label="Energia especial"><div class="fill"></div><div class="ticks"></div></div><span class="splbl">0%</span><div class="pips"><i></i><i></i></div></div>' +
      '</div>';
    return {
      hp: box.querySelector('.hpbar'), hpFill: box.querySelector('.hpbar .fill'), hpTrail: box.querySelector('.hpbar .trail'),
      sp: box.querySelector('.spbar'), spFill: box.querySelector('.spbar .fill'), spLbl: box.querySelector('.splbl'),
      pips: box.querySelectorAll('.pips i'), last: { hp: -1, sp: -1, pips: -1 }
    };
  }

  function buildSkills(f, B) {
    var wrap = $('skills'); wrap.innerHTML = '';
    var binds = E.Settings.data.binds, keys = ['s1', 's2', 's3', 's4'];
    return f.abilities.map(function (a, i) {
      var b = document.createElement('button');
      b.className = 'skill' + (a.super ? ' super' : '');
      b.style.setProperty('--c', f.faction.color);
      b.dataset.idx = i;
      var pips = '';
      for (var p = 0; p < 4; p++) pips += '<i></i>';
      var meta = (a.super ? '<span class="cost">⚡100</span>' : (a.cost ? '<span class="cost">⚡' + a.cost + '</span>' : '<span class="cost">GRÁTIS</span>')) +
        (a.cooldown ? '<span class="cdl">⏱' + String(a.cooldown).replace('.', ',') + 's</span>' : '');
      var shortFx = a.effect.split('·')[0].trim();
      b.innerHTML = '<span class="ico"><img alt="" src="' + E.Art.iconURL(a.icon, 128) + '"><span class="cdo"></span><span class="state"></span></span>' +
        '<span class="sn">' + a.name + '</span><span class="se">' + shortFx + '</span>' +
        '<span class="sf">' + meta + '</span>' +
        '<span class="key">' + E.Settings.keyLabel(binds[keys[i]]) + '</span><span class="tag">SEM ⚡</span>';
      b.setAttribute('aria-label', a.name + ': ' + a.effect);
      /* Toque imediato no pointerdown. Se a faixa de habilidades estiver rolando
       * (tela estreita), o toque só dispara ao soltar sem arrastar, para não
       * ativar uma habilidade por engano ao rolar a faixa. */
      var start = null;
      function fire() {
        E.Audio.unlock();
        E.Input.press('skill', i);
        if (E.Haptics) E.Haptics.impact('light');
        b.classList.add('is-down'); setTimeout(function () { b.classList.remove('is-down'); }, 110);
      }
      b.addEventListener('pointerdown', function (e) {
        var strip = b.parentNode, scrolls = strip.scrollWidth > strip.clientWidth + 2;
        if (!scrolls || e.pointerType === 'mouse') { e.preventDefault(); fire(); start = null; return; }
        start = { x: e.clientX, y: e.clientY, sl: strip.scrollLeft };
      });
      b.addEventListener('pointerup', function (e) {
        if (!start) return;
        var moved = Math.abs(e.clientX - start.x) + Math.abs(b.parentNode.scrollLeft - start.sl);
        start = null;
        if (moved < 12) fire();
      });
      b.addEventListener('pointercancel', function () { start = null; });
      b.addEventListener('keydown', function (e) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      wrap.appendChild(b);
      var needPips = a.super ? 4 : Math.ceil(a.cost / 25);
      return { el: b, def: a, cdo: b.querySelector('.cdo'), state: b.querySelector('.state'), pips: b.querySelectorAll('.energy-pips i'), need: needPips, last: '' };
    });
  }

  /* Garante nomes inteiros: reduz a fonte até 11px e, só se ainda faltar espaço, libera 3 linhas. */
  function fitNames() {
    document.querySelectorAll('#skills .sn').forEach(function (el) {
      el.style.fontSize = ''; el.style.webkitLineClamp = ''; el.style.lineClamp = ''; el.style.display = '';
      var fs = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollHeight > el.clientHeight + 1 && fs > 11) { fs = Math.max(11, fs - 0.5); el.style.fontSize = fs + 'px'; }
      if (el.scrollHeight > el.clientHeight + 1) { el.style.webkitLineClamp = '3'; el.style.lineClamp = '3'; }
      // último recurso (fonte de reserva larga): sem limite de linhas, o ícone encolhe para caber
      if (el.scrollHeight > el.clientHeight + 1) { el.style.webkitLineClamp = 'unset'; el.style.lineClamp = 'unset'; el.style.display = 'block'; }
    });
  }
  window.addEventListener('resize', function () { requestAnimationFrame(fitNames); });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { requestAnimationFrame(fitNames); });

  E.HUD = {
    fitNames: fitNames,
    build: function (B) {
      els = { p: [buildPlayer(B.fighters[0], 0), buildPlayer(B.fighters[1], 1)], skills: buildSkills(B.player, B), timer: $('hud-timer'), round: $('hud-round'), lastT: -1 };
      requestAnimationFrame(fitNames);
      $('k-punch').textContent = E.Settings.keyLabel(E.Settings.data.binds.punch);
      $('k-kick').textContent = E.Settings.keyLabel(E.Settings.data.binds.kick);
      B.on('denied', function (d) {
        if (d.f !== B.player) return;
        var s = els.skills[d.idx]; if (!s) return;
        s.el.classList.remove('deny'); void s.el.offsetWidth; s.el.classList.add('deny');
        E.Audio.play('denied');
        if (d.reason === 'energy') E.HUD.toast('Sem energia: ' + s.def.name + ' precisa de ⚡' + s.def.cost);
        else if (d.reason === 'cooldown') E.HUD.toast(s.def.name + ' em recarga: ' + fmt1(d.remaining) + 's');
      });
      B.on('skill', function (d) {
        if (d.f !== B.player) return;
        var s = els.skills[d.idx]; s.el.classList.remove('fire'); void s.el.offsetWidth; s.el.classList.add('fire');
      });
    },
    toast: function (msg) {
      var t = $('toast'); t.textContent = msg; t.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1400);
    },
    update: function (B) {
      if (!els) return;
      B.fighters.forEach(function (f, i) {
        var p = els.p[i], hp = Math.max(0, f.hp / f.d.maxHp);
        if (Math.abs(hp - p.last.hp) > 0.0005) {
          p.hpFill.style.transform = 'scaleX(' + hp + ')';
          p.hpTrail.style.transform = 'scaleX(' + hp + ')';
          p.hp.classList.toggle('low', hp < 0.25);
          p.hp.setAttribute('aria-valuenow', Math.round(hp * 100));
          p.last.hp = hp;
        }
        var sp = Math.floor(f.energy);
        if (sp !== p.last.sp) {
          p.spFill.style.transform = 'scaleX(' + (f.energy / 100) + ')';
          p.spLbl.textContent = sp >= 100 ? 'MAX' : sp + '%';
          p.sp.classList.toggle('full', sp >= 100);
          p.last.sp = sp;
        }
        var w = B.wins[i];
        if (w !== p.last.pips) { p.pips.forEach(function (pip, k) { pip.classList.toggle('on', k < w); }); p.last.pips = w; }
      });
      var tv = Math.ceil(B.timer);
      if (tv !== els.lastT) { els.timer.textContent = tv; els.timer.classList.toggle('warn', tv <= 10); els.lastT = tv; }
      els.round.textContent = 'ROUND ' + B.round;

      var f = B.player;
      els.skills.forEach(function (s, i) {
        var c = E.Abilities.check(f, i), cls, label = '';
        var cdFrac = s.def.cooldown ? f.cooldowns[i] / s.def.cooldown : 0;
        if (c.ok) cls = 'ready';
        else if (c.reason === 'cooldown') { cls = 'cooling'; label = fmt1(c.remaining); }
        else if (c.reason === 'energy') { cls = 'noenergy'; label = ''; }
        else cls = 'busy';
        if (B.phase !== 'fight') { cls = 'busy'; label = ''; }
        var key = cls + label;
        if (key !== s.last) {
          s.el.classList.remove('ready', 'cooling', 'noenergy', 'busy'); s.el.classList.add(cls);
          s.state.textContent = label;
          s.el.setAttribute('aria-disabled', cls === 'ready' ? 'false' : 'true');
          s.last = key;
        }
        s.cdo.style.setProperty('--cd', cdFrac.toFixed(3));
        var have = s.def.super ? Math.floor(f.energy / 25) : Math.floor(f.energy / 25);
        s.pips.forEach(function (pip, k) { pip.style.display = k < s.need ? '' : 'none'; pip.classList.toggle('on', k < Math.min(s.need, have)); });
      });
    },
    get skillEls() { return els ? els.skills.map(function (s) { return s.el; }) : []; }
  };
})(window.EVD = window.EVD || {});
