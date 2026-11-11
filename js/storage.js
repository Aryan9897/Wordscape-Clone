/* Save data in localStorage. Every read/write is guarded: private windows and
   blocked storage just mean progress is not kept between visits. */
window.SW = window.SW || {};

SW.Storage = (function () {
  const C = SW.CONFIG;

  function fresh() {
    return {
      version: 1,
      level: 1,
      coins: C.START_COINS,
      extraTotal: 0, // lifetime extra words; every 10 pays out
      usedKeys: [], // letter sets used recently, so bases do not repeat
      settings: { music: true, sfx: true, musicVolume: 0.55 },
      stats: { wordsFound: 0, hintsUsed: 0, adsWatched: 0, coinsFromTiles: 0 },
      current: null // state of the level in progress
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      if (!raw) return fresh();
      const data = JSON.parse(raw);
      const base = fresh();
      return {
        ...base,
        ...data,
        settings: { ...base.settings, ...(data.settings || {}) },
        stats: { ...base.stats, ...(data.stats || {}) }
      };
    } catch (e) {
      return fresh();
    }
  }

  function save(data) {
    try {
      if (data.usedKeys.length > 500) data.usedKeys = data.usedKeys.slice(-500);
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable; keep playing */
    }
  }

  function reset() {
    try {
      localStorage.removeItem(C.SAVE_KEY);
    } catch (e) {
      /* ignore */
    }
    return fresh();
  }

  return { load, save, reset };
})();
