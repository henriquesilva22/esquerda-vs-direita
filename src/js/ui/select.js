/* Tela de seleção de personagens (e galeria em modo "PERSONAGENS") */
(function (E) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = document.querySelector('[data-screen=select]');
  var st = { mode: 'play', p1: 0, cpu: 2, t: 0, p1T: 0, cpuT: 0 };
  var STAT_LABELS = [['forca', 'Força'], ['velocidade', 'Velocidade'], ['defesa', 'Defesa'], ['energia', 'Energia']];

  function chars() { return E.CHARACTERS; }
  function fmt(n) { return String(n).replace('.', ','); }

  function statsHTML(ch) {
    var F = E.FACTIONS[ch.faction];
    return STAT_LABELS.map(function (s) {
      var v = ch.stats[s[0]], cells = '';
      for (var i = 0; i < 10; i++) cells += '<i' + (i < v ? ' class="on"' : '') + '></i>';
      return '<span>' + s[1] + '</span><span class="stat-bar" style="--c:' + F.color + '">' + cells + '</span><span class="v">' + v + '</span>';
    }).join('');
  }
  function movesHTML(ch, detailed) {
    var F = E.FACTIONS[ch.faction];
    var basics = detailed ? '<div class="move" style="--c:#6b5c80"><img src="' + E.Art.iconURL('fist', 84) + '" alt=""><div><div class="mn">Soco · Chute</div><div class="me">Golpes básicos, sem custo de energia</div></div><div class="mc">J · K</div></div>' : '';
    return basics + ch.abilities.map(function (id, i) {
      var a = E.ABILITIES[id];
      var meta = a.super ? 'SUPREMO · ⚡100' : (a.cost ? '⚡' + a.cost + ' · ' : '') + (a.cooldown ? fmt(a.cooldown) + 's' : '');
      return '<div class="move' + (a.super ? ' super' : '') + '" style="--c:' + F.color + '"><img src="' + E.Art.iconURL(a.icon, 84) + '" alt=""><div><div class="mn">' + a.name + '</div><div class="me">' + a.effect + '</div></div><div class="mc">' + meta + '</div></div>';
    }).join('');
  }

  function buildRoster() {
    var box = $('roster'); box.innerHTML = '';
    Object.keys(E.FACTIONS).forEach(function (fid) {
      var F = E.FACTIONS[fid];
      var lab = document.createElement('div'); lab.className = 'fac-label'; lab.style.color = fid === 'esquerda' ? F.light : F.light; lab.textContent = F.name;
      var cards = document.createElement('div'); cards.className = 'cards';
      chars().forEach(function (ch, idx) {
        if (ch.faction !== fid) return;
        var b = document.createElement('button');
        b.className = 'card'; b.dataset.idx = idx; b.setAttribute('aria-label', ch.name);
        b.innerHTML = '<img src="' + E.Art.portraitURL(ch, 240) + '" alt=""><span class="cn">' + ch.short + '</span>';
        b.addEventListener('click', function () { pick(idx); });
        b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') E.Audio.play('hover'); });
        cards.appendChild(b);
      });
      box.appendChild(lab); box.appendChild(cards);
    });
  }

  function fill(prefix, ch, detailed) {
    var F = E.FACTIONS[ch.faction];
    $(prefix + '-name').textContent = ch.name;
    var chip = $(prefix + '-fac'); chip.textContent = F.name; chip.style.setProperty('--c', F.color);
    $(prefix + '-desc').innerHTML = '<i>' + ch.tagline + '.</i> ' + ch.desc;
    $(prefix + '-stats').innerHTML = statsHTML(ch);
    $(prefix + '-prev').style.setProperty('--glow', F.glow);
    if (prefix === 'p1') $('p1-moves').innerHTML = movesHTML(ch, detailed);
  }

  function refresh() {
    var list = chars();
    if (st.cpu === st.p1) st.cpu = (st.p1 + 1) % list.length;
    fill('p1', list[st.p1], st.mode === 'gallery');
    fill('cpu', list[st.cpu]);
    root.querySelectorAll('.card').forEach(function (c) {
      var i = +c.dataset.idx;
      c.classList.toggle('p1', i === st.p1);
      c.classList.toggle('cpu', st.mode === 'play' && i === st.cpu);
      c.setAttribute('aria-pressed', i === st.p1 ? 'true' : 'false');
    });
  }

  function pick(idx) {
    if (idx === st.p1) return;
    st.p1 = idx; st.p1T = 0;
    var list = chars();
    if (st.mode === 'play') {
      // adversário padrão: primeiro da facção oposta
      var opp = list.findIndex(function (c) { return c.faction !== list[idx].faction; });
      if (opp >= 0 && (list[st.cpu].faction === list[idx].faction || st.cpu === idx)) { st.cpu = opp; st.cpuT = 0; }
    }
    E.Audio.play('click');
    refresh();
  }
  function cycleCpu(d) {
    var n = chars().length;
    do { st.cpu = (st.cpu + d + n) % n; } while (st.cpu === st.p1);
    st.cpuT = 0; E.Audio.play('click'); refresh();
  }
  function confirm() {
    if (st.mode !== 'play') return;
    E.Audio.play('confirm');
    E.Orientation.requestLandscape(); // no toque do jogador: tela cheia + trava horizontal, se o navegador permitir
    var list = chars();
    E.Scenes.go('battle', { p1: list[st.p1].id, cpu: list[st.cpu].id });
  }
  function back() { E.Audio.play('back'); E.Scenes.go('menu'); }

  $('cpu-prev-btn').addEventListener('click', function () { cycleCpu(-1); });
  $('cpu-next-btn').addEventListener('click', function () { cycleCpu(1); });
  $('sel-confirm').addEventListener('click', confirm);
  $('sel-back').addEventListener('click', back);

  E.Input.onKey(function (e) {
    if (E.Scenes.name !== 'select') return;
    var n = chars().length;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') pick((st.p1 + 1) % n);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick((st.p1 - 1 + n) % n);
    else if (e.code === 'Enter' && document.activeElement && document.activeElement.tagName !== 'BUTTON') confirm();
    else if (e.code === 'Escape') back();
  });

  function drawPreview(canvas, ch, facing, tt) {
    var c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(240, 338, 90, 14, 0, 0, 7); c.fill();
    c.translate(240, 338); c.scale(facing * 1.08, 1.08);
    var pose = tt < 1.1 ? E.Art.POSES.taunt(tt) : E.Art.POSES.guard(st.t);
    E.Art.drawFighter(c, ch, pose, {});
  }

  E.Scenes.register('select', {
    enter: function (p) {
      st.mode = p.mode || 'play';
      E.MenuBG.active = true; E.MenuBG.dim = 0.72;
      root.classList.toggle('gallery', st.mode === 'gallery');
      $('sel-title').textContent = st.mode === 'gallery' ? 'PERSONAGENS' : 'ESCOLHA SEU LUTADOR';
      $('p1-label').textContent = st.mode === 'gallery' ? 'FICHA DO LUTADOR' : 'JOGADOR 1';
      $('roster-note').textContent = st.mode === 'gallery'
        ? 'Todos os lutadores são fictícios. Novos personagens entram pelo arquivo de dados, sem mudar o motor do jogo.'
        : 'Clique para escolher. No teclado: ← → para trocar, Enter para confirmar.';
      if (!$('roster').children.length) buildRoster();
      var bd = E.Settings.data.binds, kl = E.Settings.keyLabel;
      $('ht-p').textContent = kl(bd.punch); $('ht-k').textContent = kl(bd.kick); $('ht-s1').textContent = kl(bd.s1); $('ht-s4').textContent = kl(bd.s4);
      E.hookSounds(root);
      st.p1T = 0; st.cpuT = 0;
      refresh();
      E.Audio.music('menu');
    },
    update: function (dt) { st.t += dt; st.p1T += dt; st.cpuT += dt; },
    render: function () {
      var list = chars();
      drawPreview($('p1-canvas'), list[st.p1], 1, st.p1T);
      if (st.mode === 'play') drawPreview($('cpu-canvas'), list[st.cpu], -1, st.cpuT);
    },
    state: st
  });
})(window.EVD = window.EVD || {});
