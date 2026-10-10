/* Inicialização */
(function (E) {
  'use strict';
  function unlock() { E.Audio.unlock(); }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  document.documentElement.lang = 'pt-BR';
  function boot() {
    var el = document.getElementById('loading');
    if (el) el.hidden = true;
    E.Stage.invalidate();
    if (E.Native) E.Native.init();
    E.Scenes.go('menu');
    E.Scenes.start();
  }
  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('700 16px "Barlow Condensed"'), document.fonts.load('800 16px "Barlow Condensed"')])
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(boot, boot);
})(window.EVD = window.EVD || {});
