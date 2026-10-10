/* Configurações persistidas (por navegador) */
(function (E) {
  'use strict';
  var KEY = 'evd-settings-v1';
  var DEFAULTS = {
    music: 0.5, sfx: 0.8, difficulty: 'normal', roundTime: 60, shake: true, haptics: true,
    binds: { punch: 'KeyJ', kick: 'KeyK', s1: 'Digit1', s2: 'Digit2', s3: 'Digit3', s4: 'Digit4' }
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var S = clone(DEFAULTS);
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var p = JSON.parse(raw);
      Object.keys(DEFAULTS).forEach(function (k) { if (p[k] !== undefined && k !== 'binds') S[k] = p[k]; });
      if (p.binds) Object.keys(DEFAULTS.binds).forEach(function (k) { if (p.binds[k]) S.binds[k] = p.binds[k]; });
    }
  } catch (e) { /* armazenamento indisponível: usa padrões */ }

  E.Settings = {
    data: S,
    DEFAULTS: DEFAULTS,
    save: function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} },
    reset: function () { var d = clone(DEFAULTS); Object.keys(d).forEach(function (k) { S[k] = d[k]; }); this.save(); },
    keyLabel: function (code) {
      if (!code) return '—';
      if (code.indexOf('Key') === 0) return code.slice(3);
      if (code.indexOf('Digit') === 0) return code.slice(5);
      if (code.indexOf('Numpad') === 0) return 'Num' + code.slice(6);
      var map = { Space: 'Espaço', ShiftLeft: 'Shift', ShiftRight: 'Shift', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Semicolon: 'Ç', Comma: ',', Period: '.', Slash: '/' };
      return map[code] || code;
    }
  };
})(window.EVD = window.EVD || {});
