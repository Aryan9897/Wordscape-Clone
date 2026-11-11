/* Word lookups: which words are valid, which are good answers, and which
   words can be spelled from a set of letters. */
window.SW = window.SW || {};

SW.Dict = (function () {
  const src = window.SW_WORDS;
  const common = src.common.split(' ');
  const uncommon = src.uncommon.split(' ');
  const extra = src.extra.split(' ');

  // Answer pool = common (tier 1) + uncommon (tier 2). Extras are tier 3.
  const pool = common.concat(uncommon);
  const tier = new Map();
  common.forEach((w) => tier.set(w, 1));
  uncommon.forEach((w) => tier.set(w, 2));
  extra.forEach((w) => tier.set(w, 3));

  const A = 97;
  const counts = new Uint8Array(pool.length * 26);
  const masks = new Int32Array(pool.length);
  pool.forEach((w, i) => {
    let m = 0;
    for (let k = 0; k < w.length; k++) {
      const c = w.charCodeAt(k) - A;
      counts[i * 26 + c]++;
      m |= 1 << c;
    }
    masks[i] = m;
  });

  function letterCounts(letters) {
    const c = new Uint8Array(26);
    for (const ch of letters) c[ch.charCodeAt(0) - A]++;
    return c;
  }

  function canSpell(word, letters) {
    const c = letterCounts(letters);
    for (let k = 0; k < word.length; k++) {
      const i = word.charCodeAt(k) - A;
      if (i < 0 || i > 25 || c[i] === 0) return false;
      c[i]--;
    }
    return true;
  }

  /* All answer-pool words (tier <= maxTier) spellable from `letters`. */
  function subwords(letters, minLen, maxTier) {
    const c = letterCounts(letters);
    let mask = 0;
    for (let i = 0; i < 26; i++) if (c[i]) mask |= 1 << i;
    const res = [];
    const maxLen = letters.length;
    for (let i = 0; i < pool.length; i++) {
      if (masks[i] & ~mask) continue;
      const w = pool[i];
      if (w.length < minLen || w.length > maxLen) continue;
      if (tier.get(w) > maxTier) continue;
      let ok = true;
      const o = i * 26;
      for (let k = 0; k < 26; k++) {
        if (counts[o + k] > c[k]) {
          ok = false;
          break;
        }
      }
      if (ok) res.push(w);
    }
    return res;
  }

  function wordsOfLength(len, maxTier) {
    return pool.filter((w) => w.length === len && tier.get(w) <= maxTier);
  }

  return {
    isValid: (w) => tier.has(w),
    tierOf: (w) => tier.get(w) || 0,
    canSpell,
    subwords,
    wordsOfLength
  };
})();
