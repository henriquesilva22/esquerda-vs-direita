/* Tela de configurações */
(function (E) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S = E.Settings;
  var from = 'menu';
  var BIND_LABELS = { punch: 'Soco', kick: 'Chute', s1: 'Habilidade 1', s2: 'Habilidade 2', s3: 'Habilidade 3', s4: 'Supremo' };
  var RESERVED = ['KeyA', 'KeyD', 'KeyW', 'Space', 'ShiftLeft', 'ShiftRight', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab'];

  function seg(id, options, key) {
    var box = $(id); box.innerHTML = '';
    options.forEach(function (o) {
      var b = document.createElement('button');
      b.textContent = o[1];
      b.setAttribute('aria-pressed', String(S.data[key] === o[0]));
      b.addEventListener('click', function () { S.data[key] = o[0]; S.save(); E.Audio.play('click'); render(); });
      box.appendChild(b);
    });
  }

  function render() {
    $('set-music').value = S.data.music;
    $('set-sfx').value = S.data.sfx;
    seg('set-diff', [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']], 'difficulty');
    seg('set-time', [[45, '45 s'], [60, '60 s'], [99, '99 s']], 'roundTime');
    seg('set-shake', [[true, 'Ligado'], [false, 'Desligado']], 'shake');
    $('row-haptics').hidden = !E.Haptics.supported;
    if (E.Haptics.supported) seg('set-haptics', [[true, 'Ligada'], [false, 'Desligada']], 'haptics');
    var box = $('set-binds'); box.innerHTML = '';
    Object.keys(BIND_LABELS).forEach(function (k) {
      var row = document.createElement('div'); row.className = 'bind';
      var lab = document.createElement('span'); lab.textContent = BIND_LABELS[k];
      var b = document.createElement('button'); b.textContent = S.keyLabel(S.data.binds[k]); b.id = 'bind-' + k;
      b.setAttribute('aria-label', 'Tecla para ' + BIND_LABELS[k] + ': ' + S.keyLabel(S.data.binds[k]) + '. Clique para trocar.');
      b.addEventListener('click', function () {
        E.Audio.play('click');
        b.textContent = '…'; b.classList.add('waiting');
        E.Input.captureNext(function (code) {
          b.classList.remove('waiting');
          if (code !== 'Escape' && RESERVED.indexOf(code) < 0) {
            Object.keys(S.data.binds).forEach(function (o) { if (S.data.binds[o] === code) S.data.binds[o] = S.data.binds[k]; });
            S.data.binds[k] = code; S.save(); E.Audio.play('confirm');
          } else if (code !== 'Escape') E.Audio.play('denied');
          render();
        });
      });
      row.appendChild(lab); row.appendChild(b); box.appendChild(row);
    });
  }

  $('set-music').addEventListener('input', function (e) { S.data.music = +e.target.value; S.save(); E.Audio.applyVolumes(); });
  $('set-sfx').addEventListener('input', function (e) { S.data.sfx = +e.target.value; S.save(); E.Audio.applyVolumes(); });
  $('set-sfx').addEventListener('change', function () { E.Audio.play('hit'); });
  $('set-reset').addEventListener('click', function () { S.reset(); E.Audio.applyVolumes(); E.Audio.play('back'); render(); });
  $('set-back').addEventListener('click', function () { E.Input.cancelCapture(); E.Audio.play('back'); E.Scenes.go(from === 'battle' ? 'battle' : 'menu', { resume: true }); });

  E.Input.onKey(function (e) { if (E.Scenes.name === 'settings' && e.code === 'Escape') $('set-back').click(); });

  E.Scenes.register('settings', {
    enter: function (p) { from = p.from || 'menu'; E.MenuBG.active = true; E.MenuBG.dim = 0.78; render(); E.hookSounds(document.querySelector('[data-screen=settings]')); }
  });
})(window.EVD = window.EVD || {});
