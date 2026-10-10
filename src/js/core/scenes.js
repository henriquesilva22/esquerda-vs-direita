/* Gerenciador de cenas + laço principal */
(function (E) {
  'use strict';
  var scenes = {};
  var current = null, currentName = null;
  var last = 0;

  E.Scenes = {
    register: function (name, scene) { scenes[name] = scene; },
    go: function (name, params) {
      if (current && current.exit) current.exit();
      document.querySelectorAll('[data-screen]').forEach(function (el) { el.hidden = el.getAttribute('data-screen') !== name; });
      current = scenes[name]; currentName = name;
      document.body.setAttribute('data-scene', name);
      if (current && current.enter) current.enter(params || {});
    },
    get name() { return currentName; },
    get current() { return current; },
    start: function () {
      function frame(ts) {
        var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
        last = ts;
        try {
          if (current && current.update) current.update(dt);
          if (current && current.render) current.render();
          if (E.MenuBG && E.MenuBG.active) E.MenuBG.render(dt);
        } catch (err) { console.error(err); }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };
})(window.EVD = window.EVD || {});
