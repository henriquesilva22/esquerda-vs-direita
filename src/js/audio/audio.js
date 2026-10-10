/* Áudio sintetizado (WebAudio) — efeitos e trilha arcade, sem arquivos externos */
(function (E) {
  'use strict';
  var AC = null, master, sfxBus, musicBus, noiseBuf;
  var pending = null;
  var music = { on: false, timer: null, step: 0, next: 0, track: 'menu' };

  function ensure() {
    if (AC) return true;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      AC = new Ctor();
      master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
      var comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
      sfxBus = AC.createGain(); sfxBus.connect(comp);
      musicBus = AC.createGain(); musicBus.connect(comp);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 1.5, AC.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
      return true;
    } catch (e) { AC = null; return false; }
  }
  function applyVolumes() {
    if (!AC) return;
    sfxBus.gain.value = E.Settings.data.sfx;
    musicBus.gain.value = E.Settings.data.music * 0.55;
  }

  function tone(o) {
    var t = (o.at || AC.currentTime) + (o.delay || 0);
    var osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + o.d + 0.05);
  }
  function noise(o) {
    var t = (o.at || AC.currentTime) + (o.delay || 0);
    var src = AC.createBufferSource(); src.buffer = noiseBuf;
    var f = AC.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.d);
    f.Q.value = o.q || 1;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.v || 0.3, t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + o.d + 0.05);
  }

  var SFX = {
    hover: function () { tone({ f: 880, d: 0.05, type: 'triangle', v: 0.06 }); },
    click: function () { tone({ f: 520, to: 1040, d: 0.08, type: 'square', v: 0.09 }); },
    confirm: function () { tone({ f: 523, d: 0.09, v: 0.12 }); tone({ f: 784, d: 0.16, v: 0.12, delay: 0.08 }); tone({ f: 1046, d: 0.25, v: 0.12, delay: 0.16 }); },
    back: function () { tone({ f: 600, to: 300, d: 0.12, type: 'triangle', v: 0.12 }); },
    denied: function () { tone({ f: 160, d: 0.14, type: 'sawtooth', v: 0.12 }); tone({ f: 130, d: 0.16, type: 'sawtooth', v: 0.12, delay: 0.09 }); },
    punch: function () { noise({ f: 1800, to: 400, d: 0.09, v: 0.25 }); },
    kick: function () { noise({ f: 1200, to: 200, d: 0.14, v: 0.3 }); },
    whoosh: function () { noise({ filter: 'bandpass', f: 600, to: 2400, d: 0.22, v: 0.25, q: 2 }); },
    hit: function () { tone({ f: 180, to: 60, d: 0.12, type: 'sine', v: 0.5 }); noise({ f: 3000, to: 500, d: 0.08, v: 0.35 }); },
    heavy: function () { tone({ f: 140, to: 40, d: 0.25, type: 'sine', v: 0.7 }); noise({ f: 2500, to: 200, d: 0.2, v: 0.45 }); },
    block: function () { tone({ f: 1400, d: 0.08, type: 'square', v: 0.08 }); tone({ f: 2100, d: 0.12, type: 'triangle', v: 0.08, delay: 0.01 }); noise({ filter: 'highpass', f: 3000, d: 0.06, v: 0.2 }); },
    coin: function () { for (var i = 0; i < 5; i++) { tone({ f: 988, d: 0.06, v: 0.07, delay: i * 0.09 }); tone({ f: 1319, d: 0.12, v: 0.07, delay: i * 0.09 + 0.05 }); } },
    paper: function () { for (var i = 0; i < 5; i++) noise({ filter: 'highpass', f: 2500, d: 0.07, v: 0.12, delay: i * 0.08 }); },
    wave: function () { var o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain(), t = AC.currentTime;
      o.type = 'sawtooth'; o.frequency.value = 220; l.frequency.value = 18; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + 0.75); l.stop(t + 0.75); },
    horn: function () { tone({ f: 146, d: 0.7, type: 'sawtooth', v: 0.18, a: 0.08 }); tone({ f: 147.5, d: 0.7, type: 'sawtooth', v: 0.14, a: 0.08 }); tone({ f: 220, to: 196, d: 0.7, type: 'triangle', v: 0.1, a: 0.1 }); },
    stomp: function () { tone({ f: 90, to: 30, d: 0.4, type: 'sine', v: 0.8 }); noise({ f: 800, to: 100, d: 0.4, v: 0.5 }); },
    engine: function () { tone({ f: 60, to: 90, d: 0.5, type: 'sawtooth', v: 0.2 }); noise({ f: 400, d: 0.5, v: 0.25 }); },
    smoke: function () { noise({ f: 900, to: 200, d: 0.5, v: 0.35, a: 0.03 }); tone({ f: 900, to: 200, d: 0.25, type: 'sine', v: 0.08 }); },
    shield: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone({ f: f, d: 0.35, type: 'triangle', v: 0.1, delay: i * 0.05 }); }); },
    charge: function () { tone({ f: 120, to: 900, d: 0.75, type: 'sawtooth', v: 0.12 }); noise({ filter: 'bandpass', f: 400, to: 4000, d: 0.75, v: 0.15, q: 3 }); },
    beam: function () { tone({ f: 70, d: 1.1, type: 'sawtooth', v: 0.3, a: 0.02 }); tone({ f: 110, to: 90, d: 1.1, type: 'square', v: 0.12 }); noise({ f: 1800, d: 1.1, v: 0.3, a: 0.02 }); },
    superFlash: function () { tone({ f: 1760, to: 440, d: 0.4, type: 'square', v: 0.1 }); noise({ filter: 'highpass', f: 4000, d: 0.3, v: 0.3 }); },
    ready: function () { tone({ f: 1318, d: 0.07, type: 'triangle', v: 0.06 }); },
    round: function () { tone({ f: 392, d: 0.18, v: 0.16 }); tone({ f: 523, d: 0.3, v: 0.16, delay: 0.15 }); },
    fight: function () { tone({ f: 523, d: 0.1, v: 0.18 }); tone({ f: 659, d: 0.1, v: 0.18, delay: 0.1 }); tone({ f: 784, d: 0.1, v: 0.18, delay: 0.2 }); tone({ f: 1046, d: 0.45, v: 0.2, delay: 0.3 }); noise({ f: 6000, d: 0.5, v: 0.15, delay: 0.3 }); },
    ko: function () { tone({ f: 300, to: 40, d: 1.2, type: 'sawtooth', v: 0.25 }); noise({ f: 1200, to: 80, d: 1.2, v: 0.45 }); },
    win: function () { [523, 659, 784, 1046, 784, 1046].forEach(function (f, i) { tone({ f: f, d: 0.22, v: 0.14, delay: i * 0.13 }); }); }
  };

  /* --- trilha simples em loop --- */
  var TRACKS = {
    menu:   { bpm: 112, root: 45, bass: [0, 0, 7, 0, 3, 3, 10, 7], lead: [12, 15, 19, 15, 17, 15, 12, 10], drums: 'x...o...x.x.o...' },
    battle: { bpm: 150, root: 40, bass: [0, 0, 12, 0, 3, 5, 3, 10], lead: [12, 0, 15, 12, 19, 17, 15, 12], drums: 'x.x.o..xx.x.o.oo' }
  };
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function schedule() {
    if (!music.on || !AC) return;
    var tr = TRACKS[music.track];
    var stepDur = 60 / tr.bpm / 4;
    while (music.next < AC.currentTime + 0.2) {
      var s = music.step, t = music.next;
      var bar = Math.floor(s / 16) % 4;
      var shift = [0, 0, 5, 3][bar];
      if (s % 2 === 0) tone({ at: t, f: midi(tr.root + tr.bass[(s / 2) % 8] + shift), d: stepDur * 1.8, type: 'sawtooth', v: 0.09, bus: musicBus });
      if (s % 4 === 2 || (music.track === 'battle' && s % 8 === 7)) tone({ at: t, f: midi(tr.root + 24 + tr.lead[(s >> 1) % 8] + shift), d: stepDur * 1.6, type: 'square', v: 0.035, bus: musicBus });
      var dr = tr.drums[s % 16];
      if (dr === 'x') tone({ at: t, f: 140, to: 40, d: 0.14, type: 'sine', v: 0.35, bus: musicBus });
      if (dr === 'o') noise({ at: t, f: 2400, to: 900, d: 0.12, v: 0.16, bus: musicBus });
      if (s % 2 === 1) noise({ at: t, filter: 'highpass', f: 7000, d: 0.03, v: 0.05, bus: musicBus });
      music.step++; music.next += stepDur;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!AC) return;
    if (document.hidden) AC.suspend(); else if (AC.state === 'suspended') AC.resume();
  });

  E.Audio = {
    unlock: function () {
      if (!ensure()) return;
      if (AC.state === 'suspended') AC.resume();
      if (pending) { var tr = pending; pending = null; this.music(tr); }
    },
    get unlocked() { return !!AC; },
    play: function (name) { if (!AC || !SFX[name] || E.Settings.data.sfx <= 0) return; try { SFX[name](); } catch (e) {} },
    applyVolumes: applyVolumes,
    music: function (track) {
      if (!AC) { pending = track; return; }
      if (music.on && music.track === track) return;
      music.track = track; music.step = 0; music.next = AC.currentTime + 0.05; music.on = true;
      if (!music.timer) music.timer = setInterval(schedule, 50);
    },
    stopMusic: function () { music.on = false; },
    suspend: function () { if (AC && AC.state === 'running') AC.suspend(); },
    resume: function () { if (AC && AC.state === 'suspended') AC.resume(); }
  };
})(window.EVD = window.EVD || {});
