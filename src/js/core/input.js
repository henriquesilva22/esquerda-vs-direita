/* Entrada híbrida: teclado + botões na tela (mouse/toque) */
(function (E) {
  'use strict';
  var keys = {};          // teclas pressionadas
  var touch = {};         // botões de toque segurados
  var queue = [];         // ações de disparo único
  var listeners = [];     // atalhos globais (Esc, Enter...)
  var capture = null;     // usado na tela de configurações para remapear

  var FIXED = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    block: ['ShiftLeft', 'ShiftRight', 'ArrowDown']
  };

  function bindFor(action) {
    var b = E.Settings.data.binds;
    return b[action];
  }

  function onDown(e) {
    if (capture) { e.preventDefault(); var cb = capture; capture = null; cb(e.code); return; }
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT') return;
    var inBattle = E.Scenes.name === 'battle';
    if (inBattle && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    if (FIXED.jump.indexOf(e.code) >= 0) queue.push({ type: 'jump' });
    var b = E.Settings.data.binds;
    if (e.code === b.punch) queue.push({ type: 'punch' });
    if (e.code === b.kick) queue.push({ type: 'kick' });
    ['s1', 's2', 's3', 's4'].forEach(function (s, i) { if (e.code === b[s]) queue.push({ type: 'skill', idx: i }); });
    listeners.forEach(function (fn) { fn(e); });
  }
  function onUp(e) { keys[e.code] = false; }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', function () { keys = {}; touch = {}; });

  function anyKey(list) { for (var i = 0; i < list.length; i++) if (keys[list[i]]) return true; return false; }

  E.Input = {
    FIXED: FIXED,
    held: function (name) { return !!touch[name] || anyKey(FIXED[name] || []); },
    press: function (type, idx) { queue.push({ type: type, idx: idx }); },
    setTouch: function (name, v) { touch[name] = v; },
    consume: function () { var q = queue; queue = []; return q; },
    clear: function () { queue = []; touch = {}; },
    onKey: function (fn) { listeners.push(fn); },
    captureNext: function (cb) { capture = cb; },
    cancelCapture: function () { capture = null; },
    bindFor: bindFor,

    /* Liga botões de toque com data-hold / data-press dentro de root.
     * - Dentro de [data-pad] o dedo pode deslizar entre os botões sem soltar (◀ ▶ ▲ DEF).
     * - Botões com data-repeat repetem o golpe enquanto o dedo fica pressionado. */
    wireTouch: function (root) {
      function tick() { if (E.Haptics) E.Haptics.impact('light'); }
      root.querySelectorAll('[data-pad]').forEach(function (pad) {
        var active = {}; // pointerId -> elemento sob o dedo
        function enter(id, el) {
          var prev = active[id];
          if (prev === el) return;
          if (prev) { prev.classList.remove('is-down'); var hn = prev.getAttribute('data-hold'); if (hn) touch[hn] = false; }
          active[id] = el || null;
          if (!el) return;
          el.classList.add('is-down'); tick();
          var h = el.getAttribute('data-hold'), pr = el.getAttribute('data-press');
          if (h) touch[h] = true;
          if (pr) queue.push({ type: pr });
        }
        function target(e) {
          var el = document.elementFromPoint(e.clientX, e.clientY);
          el = el && el.closest ? el.closest('[data-hold],[data-press]') : null;
          return el && pad.contains(el) ? el : null;
        }
        pad.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          try { pad.setPointerCapture(e.pointerId); } catch (x) {}
          enter(e.pointerId, target(e));
        });
        pad.addEventListener('pointermove', function (e) { if (e.pointerId in active) enter(e.pointerId, target(e)); });
        function up(e) { if (e.pointerId in active) { enter(e.pointerId, null); delete active[e.pointerId]; } }
        pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
        pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      root.querySelectorAll('[data-press]').forEach(function (el) {
        if (el.closest('[data-pad]')) return;
        var name = el.getAttribute('data-press'), timer = null;
        function stop() { clearInterval(timer); timer = null; el.classList.remove('is-down'); }
        el.addEventListener('pointerdown', function (e) {
          e.preventDefault(); queue.push({ type: name }); tick();
          el.classList.add('is-down');
          try { el.setPointerCapture(e.pointerId); } catch (x) {}
          clearInterval(timer);
          if (el.hasAttribute('data-repeat')) timer = setInterval(function () { queue.push({ type: name }); }, 230);
          else setTimeout(stop, 120);
        });
        el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('lostpointercapture', stop);
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
    }
  };
})(window.EVD = window.EVD || {});
