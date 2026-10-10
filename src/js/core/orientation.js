/* Orientação da luta: só horizontal.
 * - No app nativo, a orientação é travada pelo projeto (Android: Activity em landscape; iOS: Info.plist).
 * - No navegador, depois de um toque do jogador, pede tela cheia + screen.orientation.lock('landscape')
 *   quando o navegador oferece (Chrome/Android). Se não der, a luta fica escondida atrás de uma tela
 *   "Gire seu celular para jogar" enquanto o aparelho estiver na vertical.
 * Nada aqui afirma que travou: E.Orientation.status diz o que realmente aconteceu. */
(function (E) {
  'use strict';
  var root = document.documentElement;
  var portraitMQ = matchMedia('(orientation: portrait)');
  var touchMQ = matchMedia('(pointer: coarse)');
  var listeners = [];

  var canFullscreen = !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled !== false);
  var canLock = !!(screen.orientation && typeof screen.orientation.lock === 'function');

  function isPortrait() {
    if (screen.orientation && screen.orientation.type) {
      // o tipo da orientação é mais confiável que a proporção da janela (teclado aberto, barras etc.)
      if (screen.orientation.type.indexOf('portrait') === 0) return window.innerHeight >= window.innerWidth * 0.9;
      return false;
    }
    return portraitMQ.matches;
  }
  /* celular/tablet (toque) ou app nativo: a regra vale. Computador com janela estreita não é bloqueado. */
  function applies() { return E.isApp || touchMQ.matches; }

  var O = {
    status: 'nao-solicitado', // 'travado' | 'sem-suporte' | 'recusado' | 'nao-solicitado' | 'nativo'
    gameplay: false,           // true enquanto a tela de luta estiver ativa
    get blocked() { return this.gameplay && applies() && isPortrait(); },
    onChange: function (fn) { listeners.push(fn); },

    /** Chamar dentro de um clique/toque do jogador (exigência dos navegadores). */
    requestLandscape: function () {
      if (E.Native && E.Native.isNative) { O.status = 'nativo'; return Promise.resolve(O.status); }
      if (!applies()) return Promise.resolve(O.status);
      if (!canLock) { O.status = 'sem-suporte'; return Promise.resolve(O.status); }
      var fs = Promise.resolve();
      if (canFullscreen && !document.fullscreenElement && !document.webkitFullscreenElement) {
        try {
          var p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
          fs = (p && p.then) ? p : Promise.resolve();
        } catch (e) { fs = Promise.reject(e); }
      }
      return fs.then(function () { return screen.orientation.lock('landscape'); })
        .then(function () { O.status = 'travado'; update(); return O.status; },
              function () { O.status = 'recusado'; update(); return O.status; });
    },
    setGameplay: function (v) { O.gameplay = v; update(); },
    update: function () { update(); }
  };

  var last = null;
  function update() {
    var b = O.blocked;
    root.classList.toggle('need-rotate', b);
    var btn = document.getElementById('rotate-fs');
    if (btn) btn.hidden = !(canLock && canFullscreen && !(E.Native && E.Native.isNative));
    if (b !== last) { last = b; listeners.forEach(function (fn) { fn(b); }); }
  }

  if (portraitMQ.addEventListener) portraitMQ.addEventListener('change', update); else portraitMQ.addListener(update);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && O.status === 'travado') O.status = 'recusado'; update(); });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('rotate-fs');
    if (btn) btn.addEventListener('click', function () { E.Audio.unlock(); O.requestLandscape(); });
    update();
  });

  E.Orientation = O;
})(window.EVD = window.EVD || {});
