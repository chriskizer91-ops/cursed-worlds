// sound.js: the few sounds the hunting and fishing games need, made in code with the Web Audio API (no recordings).
// Defines window.GameSound: shot(), crack(), thump(), splash(size), plunk(), tick(), reel(on), win(), snap(), whirr().
// Sound can only start after a tap, so the first call that comes from a tap wakes it up. Quiet when muted.
(function (root) {
  'use strict';
  let ac = null, master = null, muted = false, reelSrc = null;
  function ctx() {
    if (muted) return null;
    try {
      if (!ac) { const C = root.AudioContext || root.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function noise(len) { const a = ctx(); const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * len)), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; }
  function env(g, t0, a, peak, d) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
  function burst(len, type, freq, q, peak, decay, when) {
    const a = ctx(); if (!a) return; const t0 = a.currentTime + (when || 0), n = noise(len), f = a.createBiquadFilter(), g = a.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7; n.connect(f); f.connect(g); g.connect(master); env(g, t0, 0.003, peak, decay); n.start(t0); n.stop(t0 + len);
  }
  function tone(type, f0, f1, len, peak, when) {
    const a = ctx(); if (!a) return; const t0 = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + len); o.connect(g); g.connect(master); env(g, t0, 0.005, peak, len); o.start(t0); o.stop(t0 + len + 0.05);
  }
  const S = {
    // the rifle: a sharp crack, a low boom, and the echo rolling off the woods
    shot() { burst(0.12, 'highpass', 900, 0.5, 0.9, 0.09); burst(0.5, 'lowpass', 420, 0.8, 1, 0.42); tone('sine', 110, 40, 0.3, 0.8); burst(0.7, 'bandpass', 600, 0.4, 0.12, 0.6, 0.18); },
    thump() { tone('sine', 140, 50, 0.18, 0.5); burst(0.1, 'lowpass', 300, 0.7, 0.3, 0.08); },
    whirr() { for (let i = 0; i < 6; i++) burst(0.07, 'bandpass', 1400 + i * 120, 3, 0.18, 0.06, i * 0.035); },
    splash(size) { const k = size || 1; burst(0.4 * k, 'bandpass', 1200 / Math.sqrt(k), 0.6, 0.35 * Math.min(1.5, k), 0.35 * k); },
    plunk() { tone('sine', 520, 180, 0.12, 0.35); burst(0.12, 'bandpass', 1600, 1.5, 0.12, 0.1); },
    tick() { burst(0.02, 'highpass', 3000, 0.7, 0.12, 0.015); },
    snap() { burst(0.08, 'highpass', 2500, 0.6, 0.6, 0.06); tone('triangle', 900, 300, 0.12, 0.2); },
    win() { tone('triangle', 660, 660, 0.18, 0.25); tone('triangle', 880, 880, 0.3, 0.25, 0.12); tone('triangle', 1320, 1320, 0.35, 0.18, 0.24); },
    // the reel clicking while you wind it in
    reel(on) {
      const a = ctx(); if (!a) return;
      if (on && !reelSrc) { reelSrc = setInterval(() => S.tick(), 70); }
      if (!on && reelSrc) { clearInterval(reelSrc); reelSrc = null; }
    },
    mute(m) { muted = !!m; if (muted) S.reel(false); },
    get muted() { return muted; }
  };
  root.GameSound = S;
})(typeof window !== 'undefined' ? window : globalThis);
