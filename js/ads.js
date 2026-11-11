/* Rewarded ads. showRewarded() resolves true only if the player watched the
   whole ad. Two providers:
     'mock' - a simulated ad overlay, for development and testing
     'h5'   - Google AdSense H5 Games Ads (adBreak API); needs an approved account
   Switch with SW.CONFIG.ADS.provider. */
window.SW = window.SW || {};

SW.Ads = (function () {
  const cfg = SW.CONFIG.ADS;
  let h5Loaded = false;

  function loadH5() {
    if (h5Loaded) return;
    h5Loaded = true;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) {
      window.adsbygoogle.push(o);
    };
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + cfg.h5.client;
    s.setAttribute('data-ad-client', cfg.h5.client);
    s.setAttribute('data-ad-frequency-hint', '30s');
    if (cfg.h5.testMode) s.setAttribute('data-adbreak-test', 'on');
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  }

  function init() {
    if (cfg.provider === 'h5') loadH5();
  }

  function showH5(name) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (!done) {
          done = true;
          resolve(v);
        }
      };
      window.adBreak({
        type: 'reward',
        name,
        beforeAd: () => SW.Audio.setMuted(true),
        afterAd: () => SW.Audio.setMuted(false),
        beforeReward: (showAdFn) => showAdFn(), // the player already chose to watch
        adDismissed: () => finish(false),
        adViewed: () => finish(true),
        adBreakDone: () => finish(false) // no ad was available
      });
    });
  }

  function showMock() {
    return new Promise((resolve) => {
      SW.Audio.setMuted(true);
      const el = document.createElement('div');
      el.className = 'ad-overlay';
      el.innerHTML = `
        <div class="ad-box" role="dialog" aria-label="Advertisement">
          <div class="ad-tag">Ad · simulated</div>
          <div class="ad-art"><div class="ad-sun"></div></div>
          <p class="ad-copy">Your ad network's video would play here.</p>
          <div class="ad-bar"><span></span></div>
          <button class="btn ghost ad-skip">Close (no reward)</button>
        </div>`;
      document.body.appendChild(el);
      const bar = el.querySelector('.ad-bar span');
      const btn = el.querySelector('.ad-skip');
      const total = cfg.mockSeconds * 1000;
      const start = performance.now();
      let finished = false;
      const frame = (now) => {
        const p = Math.min(1, (now - start) / total);
        bar.style.width = p * 100 + '%';
        if (p < 1) raf = requestAnimationFrame(frame);
        else {
          finished = true;
          btn.textContent = 'Collect reward';
          btn.classList.remove('ghost');
        }
      };
      let raf = requestAnimationFrame(frame);
      btn.addEventListener('click', () => {
        cancelAnimationFrame(raf);
        el.remove();
        SW.Audio.setMuted(false);
        resolve(finished);
      });
    });
  }

  function showRewarded(name) {
    return cfg.provider === 'h5' ? showH5(name) : showMock();
  }

  return { init, showRewarded };
})();
