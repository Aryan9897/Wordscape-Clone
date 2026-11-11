/* Endless level generator: picks letters, picks answer words, lays them out
   as a connected crossword, and drops a few coin tiles. Deterministic per level. */
window.SW = window.SW || {};

SW.Generator = (function () {
  const C = SW.CONFIG;
  const D = SW.Dict;

  /* How big and how strict each level is. */
  function difficulty(level, rng) {
    const minLen = level >= C.MIN_LEN_4_FROM_LEVEL ? 4 : 3;
    let letters, target;
    if (level <= 4) {
      letters = 4;
      target = 3;
    } else if (level <= 12) {
      letters = 5;
      target = 4 + Math.floor((level - 5) / 4); // 4-5
    } else if (level < C.MIN_LEN_4_FROM_LEVEL) {
      letters = 6;
      target = 6 + Math.floor((level - 13) / 4); // 6-8
    } else if (level <= 44) {
      letters = 6;
      target = 6 + Math.floor((level - 25) / 10); // 6-7, now 4+ letters only
    } else if (level <= 100) {
      letters = 7;
      target = 8 + Math.floor((level - 45) / 14); // 8-12
    } else {
      const eightChance = Math.min(0.6, 0.25 + (level - 100) / 400);
      letters = rng() < eightChance ? 8 : 7;
      target = Math.min(letters === 8 ? 16 : 14, 12 + Math.floor((level - 101) / 40));
    }
    // Uncommon words only help fill bigger levels.
    const maxTier = level < 30 ? 1 : 2;
    return { letters, target, minLen, maxTier };
  }

  const sortKey = (w) => w.split('').sort().join('');

  function pickBase(diff, rng, usedKeys) {
    const bases = rng.shuffle(D.wordsOfLength(diff.letters, 1));
    let best = null;
    for (let i = 0; i < bases.length && i < 600; i++) {
      const base = bases[i];
      const key = sortKey(base);
      if (usedKeys.has(key)) continue;
      const t1 = D.subwords(base, diff.minLen, 1);
      const all = diff.maxTier > 1 ? D.subwords(base, diff.minLen, diff.maxTier) : t1;
      // Leave a few spares so the layout has something to swap in.
      const enough = all.length >= diff.target + 2 && t1.length >= Math.ceil(diff.target * 0.6);
      if (enough) return { base, key, t1, all };
      if (!best || all.length > best.all.length) best = { base, key, t1, all };
    }
    return best;
  }

  /* ---------- crossword layout ---------- */

  const MAX_SIDE = 12; // keeps the grid readable on phones

  function tryLayout(words, needed, rng) {
    const cells = new Map(); // "r,c" -> { ch, h: bool, v: bool }
    const placed = [];
    let minR = 0,
      maxR = 0,
      minC = 0,
      maxC = 0;
    const get = (r, c) => cells.get(r + ',' + c);

    function canPlace(word, r, c, dir) {
      const dr = dir === 'v' ? 1 : 0;
      const dc = dir === 'h' ? 1 : 0;
      if (get(r - dr, c - dc) || get(r + dr * word.length, c + dc * word.length)) return -1;
      let crossings = 0;
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        const cell = get(rr, cc);
        if (cell) {
          if (cell.ch !== word[i] || cell[dir]) return -1;
          crossings++;
        } else if (dir === 'h') {
          if (get(rr - 1, cc) || get(rr + 1, cc)) return -1;
        } else if (get(rr, cc - 1) || get(rr, cc + 1)) return -1;
      }
      return crossings;
    }

    function place(word, r, c, dir) {
      const dr = dir === 'v' ? 1 : 0;
      const dc = dir === 'h' ? 1 : 0;
      for (let i = 0; i < word.length; i++) {
        const key = r + dr * i + ',' + (c + dc * i);
        const cell = cells.get(key) || { ch: word[i], h: false, v: false };
        cell[dir] = true;
        cells.set(key, cell);
      }
      minR = Math.min(minR, r);
      minC = Math.min(minC, c);
      maxR = Math.max(maxR, r + dr * (word.length - 1));
      maxC = Math.max(maxC, c + dc * (word.length - 1));
      placed.push({ word, r, c, dir });
    }

    place(words[0], 0, 0, rng() < 0.75 ? 'h' : 'v');
    const pending = words.slice(1);
    let progress = true;
    while (placed.length < needed && pending.length && progress) {
      progress = false;
      for (let wi = 0; wi < pending.length && placed.length < needed; wi++) {
        const word = pending[wi];
        let best = null;
        for (const [key, cell] of cells) {
          const [r0, c0] = key.split(',').map(Number);
          for (let i = 0; i < word.length; i++) {
            if (word[i] !== cell.ch) continue;
            for (const dir of ['h', 'v']) {
              if (cell[dir]) continue;
              const r = dir === 'v' ? r0 - i : r0;
              const c = dir === 'h' ? c0 - i : c0;
              const x = canPlace(word, r, c, dir);
              if (x < 1) continue;
              const nMinR = Math.min(minR, r);
              const nMinC = Math.min(minC, c);
              const nMaxR = Math.max(maxR, dir === 'v' ? r + word.length - 1 : r);
              const nMaxC = Math.max(maxC, dir === 'h' ? c + word.length - 1 : c);
              const w = nMaxC - nMinC + 1;
              const h = nMaxR - nMinR + 1;
              if (w > MAX_SIDE || h > MAX_SIDE) continue;
              // Prefer crossings, compact grids, and roughly square shapes.
              const score = x * 6 - w * h * 0.35 - Math.abs(w - h * 1.1) * 1.5 + rng() * 2;
              if (!best || score > best.score) best = { r, c, dir, score };
            }
          }
        }
        if (best) {
          place(word, best.r, best.c, best.dir);
          pending.splice(wi, 1);
          wi--;
          progress = true;
        }
      }
    }

    // Normalise to 0,0
    for (const p of placed) {
      p.r -= minR;
      p.c -= minC;
    }
    return { placed, rows: maxR - minR + 1, cols: maxC - minC + 1 };
  }

  function layout(base, words, spares, needed, rng) {
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const others = rng.shuffle(words.slice());
      // Longer words first gives more crossing options; keep some randomness.
      others.sort((a, b) => b.length - a.length + (rng() - 0.5) * 2.2);
      const order = [base, ...others, ...rng.shuffle(spares.slice())];
      const res = tryLayout(order, needed, rng);
      const area = res.rows * res.cols;
      const score = res.placed.length * 1000 - area - Math.abs(res.cols - res.rows * 1.1) * 4;
      if (!best || score > best.score) best = { ...res, score };
      if (res.placed.length >= needed && attempt >= 8) break;
    }
    return best;
  }

  /* ---------- level ---------- */

  function chooseWords(info, diff, rng) {
    const base = info.base;
    const t1 = rng.shuffle(info.t1.filter((w) => w !== base));
    const t2 = rng.shuffle(info.all.filter((w) => w !== base && D.tierOf(w) > 1));
    // Mix of lengths: weight longer words up a little in later levels.
    t1.sort((a, b) => (b.length - a.length) * 0.15 + (rng() - 0.5));
    const pool = t1.concat(t2);
    const chosen = pool.slice(0, diff.target - 1);
    const spares = pool.slice(diff.target - 1);
    return { chosen, spares };
  }

  function generate(level, usedKeys) {
    const rng = SW.rng.create('skyline-level-' + level);
    const diff = difficulty(level, rng);
    const info = pickBase(diff, rng, usedKeys || new Set());
    const { chosen, spares } = chooseWords(info, diff, rng);
    const needed = Math.min(diff.target, 1 + chosen.length + spares.length);
    const grid = layout(info.base, chosen, spares, needed, rng);

    // Wheel letters: shuffled, and never spelling the base word as-is.
    let letters = info.base.split('');
    for (let i = 0; i < 10; i++) {
      rng.shuffle(letters);
      if (letters.join('') !== info.base) break;
    }

    // Coin tiles, preferring crossing cells ("between words").
    const coins = [];
    if (level >= 3 && rng() < C.GRID_COIN_CHANCE) {
      const seen = new Map();
      for (const p of grid.placed) {
        for (let i = 0; i < p.word.length; i++) {
          const k = p.dir === 'h' ? p.r + ',' + (p.c + i) : p.r + i + ',' + p.c;
          seen.set(k, (seen.get(k) || 0) + 1);
        }
      }
      const crossings = rng.shuffle([...seen.keys()].filter((k) => seen.get(k) > 1));
      const singles = rng.shuffle([...seen.keys()].filter((k) => seen.get(k) === 1));
      const n = grid.placed.length >= 8 ? 2 : 1;
      coins.push(...crossings.concat(singles).slice(0, n));
    }

    return {
      level,
      base: info.base,
      key: info.key,
      letters,
      minLen: diff.minLen,
      words: grid.placed.map((p) => p.word),
      placements: grid.placed,
      rows: grid.rows,
      cols: grid.cols,
      coins
    };
  }

  return { generate, difficulty };
})();
