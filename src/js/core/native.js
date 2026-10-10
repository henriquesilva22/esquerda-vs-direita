/* Integração com o app nativo (Capacitor): vibração, barra de status, ciclo de vida.
 * No navegador tudo aqui vira no-op seguro, exceto a vibração do Android (navigator.vibrate). */
(function (E) {
  'use strict';
  var Cap = window.Capacitor;
  var isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  E.isApp = isNative || !!window.EVD_APP;
  if (E.isApp) document.documentElement.classList.add('is-app');

  function plugin(name) {
    try {
      if (!isNative || !Cap.isPluginAvailable || !Cap.isPluginAvailable(name)) return null;
      return (Cap.Plugins && Cap.Plugins[name]) || (Cap.registerPlugin ? Cap.registerPlugin(name) : null);
    } catch (e) { return null; }
  }
  var Haptics = plugin('Haptics'), StatusBar = plugin('StatusBar'), App = plugin('App');
  var canVibrate = !!Haptics || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches);
  var last = 0;

  E.Haptics = {
    supported: canVibrate,
    /** força: 'light' | 'medium' | 'heavy' */
    impact: function (force) {
      if (!canVibrate || E.Settings.data.haptics === false) return;
      var now = performance.now(); if (now - last < 45) return; last = now;
      try {
        if (Haptics) Haptics.impact({ style: force === 'heavy' ? 'HEAVY' : force === 'medium' ? 'MEDIUM' : 'LIGHT' });
        else navigator.vibrate(force === 'heavy' ? 40 : force === 'medium' ? 22 : 10);
      } catch (e) {}
    }
  };

  E.Native = {
    isNative: isNative,
    init: function () {
      if (StatusBar) { try { StatusBar.hide(); } catch (e) {} }
      if (App) {
        try {
          App.addListener('appStateChange', function (s) {
            if (!s.isActive) { E.Audio.suspend(); if (E.Scenes.name === 'battle' && E.pauseBattle) E.pauseBattle(); }
            else E.Audio.resume();
          });
          // botão "voltar" do Android: pausa a luta ou volta uma tela
          App.addListener('backButton', function () {
            var n = E.Scenes.name;
            if (n === 'battle' && E.pauseBattle) E.pauseBattle(true);
            else if (n === 'select' || n === 'settings') E.Scenes.go('menu');
            else if (n === 'menu' && App.minimizeApp) App.minimizeApp();
          });
        } catch (e) {}
      }
    }
  };
})(window.EVD = window.EVD || {});
