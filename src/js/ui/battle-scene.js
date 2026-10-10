/* Cena de batalha: liga entrada, combate, HUD, pausa e resultado */
(function (E) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('arena'), ctx = canvas.getContext('2d');
  var B = null, paused = false, wired = false, params = null;

  /* CÂMERA — a luta ocupa a tela inteira.
   * 1. Mede onde começam os comandos (DOM real, já com áreas seguras).
   * 2. Coloca o chão logo acima deles (gy).
   * 3. Escala k = o menor entre "ABOVE unidades de mundo acima do chão cabem em gy" e
   *    "a arena de 1280 cabe na largura". Se sobrar largura, aparece mais cenário dos lados;
   *    se sobrar altura, aparece mais céu. Nunca há faixas pretas nem distorção. */
  var ABOVE = 500; // HUD + lutador em pé (~330) + folga, em unidades do mundo
  var cam = { k: 1, ox: 0, oy: 0, W: 0, H: 0, gy: 0, dpr: 1, view: null };
  function layout() {
    var box = $('stage-box');
    var Wd = box.clientWidth, Hd = box.clientHeight;
    if (!Wd || !Hd) return;
    var br = box.getBoundingClientRect(), top = Hd;
    ['#controls .pad', '#controls .skills', '#controls .basics'].forEach(function (sel) {
      var el = document.querySelector(sel); if (!el) return;
      var r = el.getBoundingClientRect(); if (r.height > 0) top = Math.min(top, r.top - br.top);
    });
    var gy = Math.max(Hd * 0.5, top - Math.max(4, Hd * 0.012));
    var k = Math.min(gy / ABOVE, Wd / 1280);
    cam.k = k; cam.gy = gy; cam.W = Wd; cam.H = Hd;
    cam.ox = Wd / 2 - 640 * k;
    cam.oy = gy - E.Stage.GROUND * k;
    cam.view = { x0: -cam.ox / k, x1: (Wd - cam.ox) / k, y0: -cam.oy / k, y1: (Hd - cam.oy) / k };
    // HUD acompanha o tamanho da tela (não o da arena)
    box.style.setProperty('--s', Math.min(Wd / 1280, Hd / 620).toFixed(4));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.round(Wd * dpr), ch = Math.round(Hd * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    cam.dpr = canvas.width / Wd;
  }

  function setPaused(v) {
    if (!B || B.phase === 'over') return;
    paused = v;
    $('ov-pause').hidden = !v;
    E.Input.clear();
    if (v) { E.Audio.play('back'); setTimeout(function () { $('pz-resume').focus({ preventScroll: true }); }, 30); }
  }

  function keysText() {
    var b = E.Settings.data.binds, L = E.Settings.keyLabel;
    return '<kbd>A</kbd> <kbd>D</kbd> andar · <kbd>Espaço</kbd> pular · <kbd>Shift</kbd> defender<br><kbd>' + L(b.punch) + '</kbd> soco · <kbd>' + L(b.kick) + '</kbd> chute · <kbd>' + L(b.s1) + '</kbd>–<kbd>' + L(b.s4) + '</kbd> habilidades';
  }

  function showResult(winner) {
    var won = winner === B.player, draw = !winner;
    $('res-title').textContent = draw ? 'EMPATE!' : (won ? 'VITÓRIA!' : 'DERROTA');
    $('res-title').style.color = draw ? '#fff' : (won ? 'var(--yellow)' : '#ff5a4d');
    $('res-p0').src = E.Art.portraitURL(B.fighters[0].ch, 192);
    $('res-p1').src = E.Art.portraitURL(B.fighters[1].ch, 192);
    $('res-score').textContent = B.wins[0] + ' × ' + B.wins[1];
    var a = B.fighters[0].stats, c = B.fighters[1].stats;
    $('res-stats').innerHTML = '<span class="h"></span><span class="h">' + B.fighters[0].ch.short + '</span><span class="h">' + B.fighters[1].ch.short + '</span>' +
      '<span>Dano causado</span><span>' + Math.round(a.dealt) + '</span><span>' + Math.round(c.dealt) + '</span>' +
      '<span>Golpes certeiros</span><span>' + a.hits + '</span><span>' + c.hits + '</span>' +
      '<span>Habilidades usadas</span><span>' + a.skills + '</span><span>' + c.skills + '</span>' +
      '<span>Golpes bloqueados pelo rival</span><span>' + a.blocked + '</span><span>' + c.blocked + '</span>';
    $('ov-result').hidden = false;
    E.Audio.play(won ? 'win' : 'back');
    setTimeout(function () { $('res-again').focus({ preventScroll: true }); }, 30);
  }

  function newBattle() {
    E.FX.clear();
    B = new E.Battle(E.getCharacter(params.p1), E.getCharacter(params.cpu));
    B.on('matchEnd', function (d) { setTimeout(function () { showResult(d.winner); }, 300); });
    B.on('hit', function (d) {
      if (d.tgt === B.player) E.Haptics.impact(d.blocked ? 'light' : (d.dmg >= 8 ? 'heavy' : 'medium'));
      else if (d.att === B.player && !d.blocked) E.Haptics.impact('light');
    });
    B.on('skill', function (d) { if (d.f === B.player) E.Haptics.impact(d.def.super ? 'heavy' : 'light'); });
    B.on('ko', function () { E.Haptics.impact('heavy'); });
    E.HUD.build(B);
    $('ov-result').hidden = true; $('ov-pause').hidden = true; paused = false;
    E.Input.clear();
    E.Battle.current = B;
  }

  function wire() {
    if (wired) return; wired = true;
    E.Input.wireTouch($('controls'));
    // na luta: sem menu de toque longo, seleção de texto, zoom ou "puxar para atualizar"
    var screen = document.querySelector('[data-screen=battle]');
    screen.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    screen.addEventListener('selectstart', function (e) { e.preventDefault(); });
    screen.addEventListener('touchmove', function (e) { if (!(e.target.closest && e.target.closest('.skills, .overlay'))) e.preventDefault(); }, { passive: false });
    screen.addEventListener('dblclick', function (e) { e.preventDefault(); });
    $('controls').addEventListener('pointerdown', function () { E.Audio.unlock(); });
    $('btn-pause').addEventListener('click', function () { setPaused(!paused); });
    $('pz-resume').addEventListener('click', function () { E.Audio.play('click'); setPaused(false); });
    $('pz-restart').addEventListener('click', function () { E.Audio.play('confirm'); E.Orientation.requestLandscape(); newBattle(); });
    $('pz-select').addEventListener('click', function () { E.Audio.play('back'); E.Scenes.go('select', { mode: 'play' }); });
    $('pz-menu').addEventListener('click', function () { E.Audio.play('back'); E.Scenes.go('menu'); });
    $('res-again').addEventListener('click', function () { E.Audio.play('confirm'); E.Orientation.requestLandscape(); newBattle(); });
    $('res-select').addEventListener('click', function () { E.Audio.play('back'); E.Scenes.go('select', { mode: 'play' }); });
    $('res-menu').addEventListener('click', function () { E.Audio.play('back'); E.Scenes.go('menu'); });
    E.Input.onKey(function (e) {
      if (E.Scenes.name !== 'battle') return;
      if (e.code === 'Escape' || e.code === 'KeyP') setPaused(!paused);
    });
    window.addEventListener('resize', function () { if (E.Scenes.name === 'battle') layout(); });
    // voltou para a horizontal: refaz o layout e a luta continua de onde parou
    E.Orientation.onChange(function (blocked) {
      E.Input.clear();
      if (!blocked && E.Scenes.name === 'battle') { layout(); requestAnimationFrame(layout); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && E.Scenes.name === 'battle' && B && B.phase !== 'over') setPaused(true); });
    E.hookSounds($('ov-pause')); E.hookSounds($('ov-result'));
  }

  /* usado pelo app nativo ao ir para segundo plano ou no botão voltar */
  E.pauseBattle = function (toggle) { if (!B || B.phase === 'over' || !$('ov-result').hidden) return; setPaused(toggle ? !paused : true); };

  E.Scenes.register('battle', {
    enter: function (p) {
      wire();
      E.Orientation.setGameplay(true);
      E.MenuBG.active = false;
      if (p && p.p1) params = p;
      layout();
      newBattle();
      $('pz-keys').innerHTML = keysText();
      E.Audio.music('battle');
      requestAnimationFrame(layout);
    },
    exit: function () { E.Input.clear(); paused = false; E.Orientation.setGameplay(false); },
    update: function (dt) {
      if (!B || paused) return;
      if (E.Orientation.blocked) { E.Input.consume(); return; } // vertical: luta congelada e escondida
      var presses = E.Input.consume();
      var intents = { left: E.Input.held('left'), right: E.Input.held('right'), block: E.Input.held('block'), presses: presses };
      B.update(dt, intents);
      E.HUD.update(B);
    },
    render: function () {
      if (!B || E.Orientation.blocked || !cam.W) return;
      B.render(ctx, cam);
    },
    get camera() { return cam; },
    get battle() { return B; },
    get paused() { return paused; }
  });
})(window.EVD = window.EVD || {});
