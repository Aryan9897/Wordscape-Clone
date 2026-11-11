/* Procedural lofi music and soft sound effects, all made with Web Audio.
   Nothing is downloaded, so there are no music licences to worry about. */
window.SW = window.SW || {};

SW.Audio = (function () {
  let ctx = null;
  let master, musicBus, musicFilter, sfxBus, drumBus, delay, delayGain, wobble;
  let noiseBuf = null;
  let crackleSrc = null;
  let playing = false;
  let timer = 0;
  let nextTime = 0;
  let step = 0; // 8th-note counter
  let settings = { music: true, sfx: true, musicVolume: 0.55 };

  const BPM = 72;
  const EIGHTH = 60 / BPM / 2;
  const SWING = 0.18; // delays every other 8th a little

  const KEYS = [0, -3, 2, -5, 5]; // C, A, D, G, F (as offsets from C)
  // Four-chord loops (MIDI notes around middle C, relative to C major).
  const PROGRESSIONS = [
    [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]], // Fmaj9 Em7 Dm9 Cmaj9
    [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 52, 55, 60, 59]], // Dm9 G13 Cmaj9 Am9
    [[45, 52, 55, 59, 60], [41, 52, 57, 60, 64], [48, 55, 59, 62, 64], [43, 50, 53, 57, 59]], // Am9 Fmaj7 Cmaj9 G9sus
    [[52, 55, 59, 62], [57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65]] // Em7 Am7 Dm7 G7
  ];
  const PENTA = [0, 2, 4, 7, 9];
  let prog = PROGRESSIONS[0];
  let key = 0;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 2300;
    musicFilter.Q.value = 0.4;
    musicBus.connect(musicFilter).connect(master);

    drumBus = ctx.createGain();
    drumBus.gain.value = 0.8;
    const drumLp = ctx.createBiquadFilter();
    drumLp.type = 'lowpass';
    drumLp.frequency.value = 3800;
    drumBus.connect(drumLp).connect(musicBus);

    // Soft echo on the keys
    delay = ctx.createDelay(1);
    delay.delayTime.value = EIGHTH * 3;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.22;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 1500;
    delay.connect(dlp).connect(fb).connect(delay);
    dlp.connect(delayGain).connect(musicBus);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.6;
    sfxBus.connect(master);

    // Tape wobble: slow pitch drift applied to every music oscillator
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    wobble = ctx.createGain();
    wobble.gain.value = 7; // cents
    lfo.connect(wobble);
    lfo.start();

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
    return ctx;
  }

  /* ---------- instruments ---------- */

  function wob(o) {
    wobble.connect(o.detune);
    o.onended = () => {
      try {
        wobble.disconnect(o.detune);
      } catch (e) {
        /* already gone */
      }
    };
  }

  function keysNote(n, t, dur, vel) {
    const f = midi(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.02 * vel, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    g.connect(tone);
    tone.connect(musicBus);
    tone.connect(delay);
    [
      ['sine', 1, 1],
      ['triangle', 2, 0.18],
      ['sine', 3.01, 0.05]
    ].forEach(([type, mult, amp]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      wob(o);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  function bass(n, t, dur) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(n);
    wob(o);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function bell(n, t) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midi(n);
    wob(o);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g);
    g.connect(musicBus);
    g.connect(delay);
    o.start(t);
    o.stop(t + 1.7);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.42, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(drumBus);
    o.start(t);
    o.stop(t + 0.4);
  }

  function noiseHit(t, type, freq, q, vol, len) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(drumBus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + len + 0.02);
  }

  function startCrackle() {
    // Vinyl: quiet hiss plus random little pops
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = buf;
    crackleSrc.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2500;
    f.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    crackleSrc.connect(f).connect(g).connect(musicBus);
    crackleSrc.start();
  }

  /* ---------- sequencer ---------- */

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 8);
    const pos = s % 8;
    const chord = prog[bar % 4].map((n) => n + key);

    if (pos === 0) {
      // Strum the chord gently
      chord.forEach((n, i) => keysNote(n, t + i * 0.018, EIGHTH * 7.5, 0.8 + Math.random() * 0.3));
      bass(chord[0] - 12 - (chord[0] > 50 ? 12 : 0), t, EIGHTH * 3);
    }
    if (pos === 5 && Math.random() < 0.6) {
      chord.slice(1, 4).forEach((n, i) => keysNote(n, t + i * 0.02, EIGHTH * 2.5, 0.45));
    }
    if (pos === 3 || (pos === 6 && Math.random() < 0.5)) {
      bass(chord[0] - 12 - (chord[0] > 50 ? 12 : 0) + (pos === 6 ? 7 : 0), t, EIGHTH * 1.6);
    }
    // Sparse melody from the pentatonic scale
    if (Math.random() < (pos % 2 ? 0.14 : 0.22)) {
      const deg = PENTA[Math.floor(Math.random() * PENTA.length)];
      bell(72 + key + deg + (Math.random() < 0.3 ? 12 : 0), t);
    }

    // Drums: boom-bap with swing
    if (pos === 0 || (pos === 5 && Math.random() < 0.5) || (pos === 3 && Math.random() < 0.25)) kick(t);
    if (pos === 2 || pos === 6) {
      noiseHit(t, 'bandpass', 1800, 0.8, 0.12, 0.22);
    }
    if (Math.random() < 0.85) noiseHit(t, 'highpass', 7000, 0.7, pos % 2 ? 0.025 : 0.04, 0.05);

    // Every 8 bars pick a new loop; sometimes a new key too
    if (pos === 7 && bar % 8 === 7) {
      prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
      if (Math.random() < 0.4) key = KEYS[Math.floor(Math.random() * KEYS.length)];
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.25) {
      const swing = step % 2 ? EIGHTH * SWING : 0;
      scheduleStep(step, nextTime + swing);
      nextTime += EIGHTH;
      step++;
    }
  }

  function startMusic() {
    if (!ensure() || playing) return;
    ctx.resume();
    playing = true;
    nextTime = ctx.currentTime + 0.15;
    step = 0;
    prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
    if (!crackleSrc) startCrackle();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(settings.musicVolume, ctx.currentTime + 3);
    timer = setInterval(tick, 50);
  }

  function stopMusic() {
    if (!ctx || !playing) return;
    playing = false;
    clearInterval(timer);
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  }

  /* Duck everything, e.g. while an ad plays. */
  function setMuted(m) {
    if (!ctx) return;
    master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.1);
  }

  /* ---------- sound effects ---------- */

  function tone(freq, t, dur, type, vol, glideTo) {
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const SFX = {
    select(i) {
      const n = 72 + [0, 2, 4, 7, 9, 12, 14, 16, 19][Math.min(i, 8)];
      tone(midi(n), ctx.currentTime, 0.25, 'sine', 0.16);
      tone(midi(n + 12), ctx.currentTime, 0.12, 'triangle', 0.03);
    },
    found() {
      const t = ctx.currentTime;
      [76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.08, 0.6, 'sine', 0.16));
    },
    extra() {
      const t = ctx.currentTime;
      [81, 88].forEach((n, i) => tone(midi(n), t + i * 0.07, 0.45, 'triangle', 0.09));
    },
    already() {
      tone(midi(64), ctx.currentTime, 0.25, 'sine', 0.12);
    },
    invalid() {
      tone(220, ctx.currentTime, 0.28, 'triangle', 0.1, 150);
    },
    coin() {
      const t = ctx.currentTime;
      tone(midi(88), t, 0.12, 'square', 0.035);
      tone(midi(95), t + 0.07, 0.4, 'sine', 0.12);
    },
    hint() {
      const t = ctx.currentTime;
      [84, 88, 91, 96].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.5, 'sine', 0.06));
    },
    shuffle() {
      const t = ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(600, t);
      f.frequency.exponentialRampToValueAtTime(3000, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      s.connect(f).connect(g).connect(sfxBus);
      s.start(t);
      s.stop(t + 0.35);
    },
    complete() {
      const t = ctx.currentTime;
      [72, 76, 79, 83, 86, 91].forEach((n, i) => tone(midi(n), t + i * 0.09, 1.2, 'sine', 0.12));
    },
    tap() {
      tone(midi(79), ctx.currentTime, 0.08, 'sine', 0.06);
    }
  };

  function sfx(name, arg) {
    if (!settings.sfx || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      SFX[name](arg);
    } catch (e) {
      /* audio is never worth crashing over */
    }
  }

  function apply(s) {
    settings = { ...settings, ...s };
    if (!ctx) return;
    if (settings.music) {
      if (!playing) startMusic();
      else musicBus.gain.setTargetAtTime(settings.musicVolume, ctx.currentTime, 0.2);
    } else stopMusic();
  }

  /* Browsers only allow audio after a tap/click; call this from one. */
  function unlock(s) {
    settings = { ...settings, ...s };
    if (!ensure()) return;
    ctx.resume();
    if (settings.music) startMusic();
  }

  return { unlock, apply, sfx, setMuted };
})();
