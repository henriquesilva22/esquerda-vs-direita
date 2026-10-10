/* Tela inicial + fundo animado compartilhado pelos menus */
(function (E) {
  'use strict';
  var bg = document.getElementById('bg'), bctx = bg.getContext('2d');
  var t = 0;
  var duo = null;

  E.MenuBG = {
    active: true,
    dim: 0.55,
    render: function (dt) {
      t += dt;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = window.innerWidth, h = window.innerHeight;
      if (bg.width !== Math.round(w * dpr) || bg.height !== Math.round(h * dpr)) { bg.width = Math.round(w * dpr); bg.height = Math.round(h * dpr); }
      var k = Math.max(bg.width / 1280, bg.height / 720);
      bctx.setTransform(k, 0, 0, k, (bg.width - 1280 * k) / 2, (bg.height - 720 * k) / 2);
      E.Stage.draw(bctx, t, [0.6, 0.6]);
      // lutadores de vitrine no menu
      if (E.Scenes.name === 'menu') {
        if (!duo) duo = [E.getCharacter('rubro'), E.getCharacter('patriota')];
        var s = 1.5;
        [[250, 1, duo[0]], [1030, -1, duo[1]]].forEach(function (d, i) {
          bctx.save(); bctx.translate(d[0], 690); bctx.scale(d[1] * s, s);
          bctx.fillStyle = 'rgba(0,0,0,.35)'; bctx.beginPath(); bctx.ellipse(0, 0, 70, 12, 0, 0, 7); bctx.fill();
          E.Art.drawFighter(bctx, d[2], E.Art.POSES.guard(t + i), {});
          bctx.restore();
        });
      }
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      var g = bctx.createLinearGradient(0, 0, bg.width, 0);
      g.addColorStop(0, 'rgba(120,8,16,' + (this.dim * 0.9) + ')');
      g.addColorStop(0.5, 'rgba(8,4,16,' + this.dim + ')');
      g.addColorStop(1, 'rgba(6,28,80,' + (this.dim * 0.9) + ')');
      bctx.fillStyle = g; bctx.fillRect(0, 0, bg.width, bg.height);
      // feixes diagonais
      bctx.save(); bctx.globalAlpha = 0.08;
      for (var i = 0; i < 6; i++) {
        var x = ((t * 60 + i * 260) % (bg.width + 400)) - 200;
        bctx.fillStyle = i % 2 ? '#3fa9ff' : '#ff5a4d';
        bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x + 80, 0); bctx.lineTo(x - 220, bg.height); bctx.lineTo(x - 300, bg.height); bctx.fill();
      }
      bctx.restore();
    }
  };

  function hookSounds(root) {
    root.querySelectorAll('button').forEach(function (b) {
      if (b.dataset.snd) return; b.dataset.snd = '1';
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') E.Audio.play('hover'); });
    });
  }
  E.hookSounds = hookSounds;

  E.Scenes.register('menu', {
    enter: function () {
      E.MenuBG.active = true; E.MenuBG.dim = 0.5;
      hookSounds(document.querySelector('[data-screen=menu]'));
      E.Audio.music('menu');
      setTimeout(function () { var b = document.getElementById('btn-play'); if (b && matchMedia('(hover:hover)').matches) b.focus({ preventScroll: true }); }, 50);
    }
  });

  document.getElementById('btn-play').addEventListener('click', function () { E.Audio.unlock(); E.Audio.play('confirm'); E.Scenes.go('select', { mode: 'play' }); });
  document.getElementById('btn-chars').addEventListener('click', function () { E.Audio.unlock(); E.Audio.play('click'); E.Scenes.go('select', { mode: 'gallery' }); });
  document.getElementById('btn-settings').addEventListener('click', function () { E.Audio.unlock(); E.Audio.play('click'); E.Scenes.go('settings', { from: 'menu' }); });
})(window.EVD = window.EVD || {});
