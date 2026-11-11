/* Main game controller: screens, rules, coins, hints, extras, ads. */
(function () {
  const C = SW.CONFIG;
  const D = SW.Dict;
  const $ = (s) => document.querySelector(s);

  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M17 14l3 3-3 3M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M13.1 9.8C13.9 8.2 14.9 7 16.5 7H20M17 4l3 3-3 3"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M5 4.5h9.5a3 3 0 013 3V20H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h9.5M9 8h5"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0012 3z"/></svg>',
    word: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="5" height="8" rx="1.2"/><rect x="9.5" y="8" width="5" height="8" rx="1.2"/><rect x="16" y="8" width="5" height="8" rx="1.2"/><path d="M12 3.5v2M7 4.8l1 1.4M17 4.8l-1 1.4"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    tv: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12.5" rx="2.5"/><path d="M8.5 3l3.5 3 3.5-3M10.5 9.8v5.4l4.3-2.7z"/></svg>'
  };
  const coinSvg = '<i class="coin-ico" aria-hidden="true"></i>';

  let S = SW.Storage.load();
  let P = null; // current puzzle
  let L = null; // current level state (S.current)
  let wordKeys = []; // cell keys per word index
  let busy = false; // true while a modal is up or a level is ending

  const grid = SW.Grid($('#grid'));
  const wheel = SW.Wheel($('#wheel'), {
    onChange: (w) => showPreview(w),
    onSubmit: (w) => submit(w),
    onSelect: (i) => SW.Audio.sfx('select', i)
  });

  const save = () => SW.Storage.save(S);

  /* ---------------- HUD ---------------- */

  function setCoins(delta, fromEl) {
    S.coins = Math.max(0, S.coins + delta);
    save();
    document.querySelectorAll('.coin-count').forEach((n) => (n.textContent = S.coins));
    if (delta > 0) {
      document.querySelectorAll('.coins').forEach((n) => {
        n.classList.remove('bump');
        void n.offsetWidth;
        n.classList.add('bump');
      });
      floatText('+' + delta, fromEl || $('#game .coins'), 'gold');
    }
    updateHintButtons();
  }

  function updateHintButtons() {
    if (!P) return;
    $('#btn-hint-letter').classList.toggle('poor', S.coins < C.HINT_LETTER_COST);
    $('#btn-hint-word').classList.toggle('poor', S.coins < C.HINT_WORD_COST || !wordHintCandidates().length);
    const prog = S.extraTotal % C.EXTRA_WORDS_PER_REWARD;
    $('#btn-extras').style.setProperty('--prog', prog / C.EXTRA_WORDS_PER_REWARD);
    $('#extras-count').textContent = prog + '/' + C.EXTRA_WORDS_PER_REWARD;
  }

  function updateTitle() {
    const t = SW.Themes.forLevel(L.level);
    $('#lvl-district').textContent = t.cityName + ' · ' + t.district;
    $('#lvl-number').textContent = 'Level ' + L.level;
  }

  function renderHome() {
    const t = SW.Themes.forLevel(S.level);
    SW.Themes.Sky.setTheme(t);
    $('#home-city').textContent = t.cityName;
    $('#home-district').textContent = t.district + ' · ' + t.levelInDistrict + ' of ' + C.LEVELS_PER_DISTRICT;
    const dots = $('#home-dots');
    dots.innerHTML = '';
    for (let i = 1; i <= C.LEVELS_PER_DISTRICT; i++) {
      const d = document.createElement('i');
      if (i < t.levelInDistrict) d.className = 'done';
      else if (i === t.levelInDistrict) d.className = 'now';
      dots.appendChild(d);
    }
    $('#play-label').textContent = 'Play · Level ' + S.level;
    document.querySelectorAll('.coin-count').forEach((n) => (n.textContent = S.coins));
  }

  function show(screen) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === screen));
    if (screen === 'game') requestAnimationFrame(() => grid.fit());
  }

  /* ---------------- feedback ---------------- */

  let previewTimer = 0;
  function showPreview(w, cls) {
    const el = $('#preview');
    clearTimeout(previewTimer);
    el.className = 'preview' + (w ? ' show' : '') + (cls ? ' ' + cls : '');
    el.textContent = w.toUpperCase();
  }
  function settlePreview(w, cls) {
    showPreview(w, cls);
    previewTimer = setTimeout(() => showPreview(''), cls === 'bad' ? 450 : 600);
  }

  function toast(msg, ms) {
    const root = $('#toast-root');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    root.innerHTML = '';
    root.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 1600);
    setTimeout(() => t.remove(), (ms || 1600) + 400);
  }

  function floatText(text, anchor, cls) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float ' + (cls || '');
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top + r.height / 2 + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }

  /* A coin flies from a tile to the coin counter. */
  function flyCoin(fromEl) {
    const to = $('#game .coins');
    if (!fromEl || !to) return;
    const a = fromEl.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const c = document.createElement('i');
    c.className = 'coin-ico flying';
    c.style.left = a.left + a.width / 2 + 'px';
    c.style.top = a.top + a.height / 2 + 'px';
    document.body.appendChild(c);
    requestAnimationFrame(() => {
      c.style.transform = `translate(${b.left + 18 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.8)`;
      c.style.opacity = '0.2';
    });
    setTimeout(() => c.remove(), 750);
  }

  function flyToExtras(word) {
    const from = $('#preview').getBoundingClientRect();
    const to = $('#btn-extras').getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fly-word';
    f.textContent = word.toUpperCase();
    f.style.left = from.left + from.width / 2 + 'px';
    f.style.top = from.top + from.height / 2 + 'px';
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      f.style.transform = `translate(calc(-50% + ${to.left + to.width / 2 - from.left - from.width / 2}px), calc(-50% + ${to.top + to.height / 2 - from.top - from.height / 2}px)) scale(.3)`;
      f.style.opacity = '0';
    });
    setTimeout(() => f.remove(), 700);
  }

  /* ---------------- level flow ---------------- */

  function startLevel() {
    if (!S.current || S.current.level !== S.level) {
      const puzzle = SW.Generator.generate(S.level, new Set(S.usedKeys));
      S.usedKeys.push(puzzle.key);
      S.current = {
        level: S.level,
        puzzle,
        found: [],
        revealed: [],
        extras: [],
        coinsLeft: puzzle.coins.slice(),
        tileCoins: 0,
        hintsUsed: 0
      };
      save();
    }
    L = S.current;
    P = L.puzzle;
    wordKeys = P.placements.map((p) => grid.cellKeys(p));
    SW.Themes.Sky.setTheme(SW.Themes.forLevel(L.level));
    grid.render(P, L);
    wheel.setLetters(P.letters);
    showPreview('');
    updateTitle();
    updateHintButtons();
    busy = false;
    show('game');

    if (L.level === C.MIN_LEN_4_FROM_LEVEL && !S.seenMinLenNotice) {
      S.seenMinLenNotice = true;
      save();
      openModal({
        title: 'New rule in town',
        body: '<p>From here on, words need <b>4 or more letters</b>. Three-letter words won’t count, even as extras.</p>',
        actions: [{ label: 'Got it', primary: true }]
      });
    }
  }

  function submit(word) {
    if (busy) return;
    const idx = P.words.indexOf(word);
    if (idx >= 0) {
      if (L.found.includes(word)) {
        SW.Audio.sfx('already');
        settlePreview(word, 'dup');
        grid.flashWord(wordKeys[idx]);
        return;
      }
      SW.Audio.sfx('found');
      settlePreview(word, 'good');
      markFound(idx, true);
      return;
    }
    if (word.length < P.minLen) {
      SW.Audio.sfx('invalid');
      settlePreview(word, 'bad');
      if (D.isValid(word)) toast(P.minLen + '+ letter words only');
      return;
    }
    if (D.isValid(word) && D.canSpell(word, P.letters)) {
      if (L.extras.includes(word)) {
        SW.Audio.sfx('already');
        settlePreview(word, 'dup');
        toast('Already in your extra words');
        return;
      }
      L.extras.push(word);
      S.extraTotal++;
      SW.Audio.sfx('extra');
      settlePreview(word, 'extra');
      flyToExtras(word);
      if (S.extraTotal % C.EXTRA_WORDS_PER_REWARD === 0) {
        setTimeout(() => {
          SW.Audio.sfx('coin');
          toast(C.EXTRA_WORDS_PER_REWARD + ' extra words! +' + C.EXTRA_WORDS_REWARD + ' coins');
          setCoins(C.EXTRA_WORDS_REWARD, $('#btn-extras'));
        }, 450);
      } else toast('Extra word!', 900);
      save();
      updateHintButtons();
      return;
    }
    SW.Audio.sfx('invalid');
    settlePreview(word, 'bad');
  }

  /* Reveal cells; byPlayer decides whether coin tiles pay out. */
  function revealCells(keys, byPlayer, opts) {
    const fresh = keys.filter((k) => !L.revealed.includes(k));
    fresh.forEach((k) => L.revealed.push(k));
    const coinHits = fresh.filter((k) => L.coinsLeft.includes(k));
    grid.reveal(keys, { collect: byPlayer, solid: !!(opts && opts.solid), flash: opts && opts.flash });
    coinHits.forEach((k) => {
      L.coinsLeft.splice(L.coinsLeft.indexOf(k), 1);
      if (byPlayer) {
        const cell = grid.cellEl(k);
        setTimeout(() => {
          SW.Audio.sfx('coin');
          flyCoin(cell);
          L.tileCoins += C.GRID_COIN_VALUE;
          S.stats.coinsFromTiles += C.GRID_COIN_VALUE;
          setCoins(C.GRID_COIN_VALUE, cell);
        }, 250);
      }
    });
  }

  function markFound(idx, byPlayer) {
    const word = P.words[idx];
    if (L.found.includes(word)) return;
    L.found.push(word);
    if (byPlayer) S.stats.wordsFound++;
    revealCells(wordKeys[idx], byPlayer, { flash: true, solid: true });
    autoComplete();
    save();
    updateHintButtons();
    if (L.found.length === P.words.length) finishLevel();
  }

  /* Words whose letters are all showing (via hints or crossings) count as found. */
  function autoComplete() {
    P.words.forEach((w, i) => {
      if (!L.found.includes(w) && wordKeys[i].every((k) => L.revealed.includes(k))) {
        L.found.push(w);
        grid.reveal(wordKeys[i], { solid: true });
      }
    });
  }

  function finishLevel() {
    busy = true;
    wheel.setEnabled(false);
    const reward = P.words.length;
    const done = L;
    const t = SW.Themes.forLevel(done.level);
    const next = SW.Themes.forLevel(done.level + 1);
    S.level = done.level + 1;
    S.current = null;
    S.coins += reward;
    save();

    setTimeout(() => {
      SW.Audio.sfx('complete');
      let headline = 'Level ' + done.level + ' complete';
      let sub = t.cityName + ' · ' + t.district;
      if (next.cityIndex !== t.cityIndex) {
        headline = t.cityName + ' cleared!';
        sub = 'Next stop: ' + next.cityName;
      } else if (next.district !== t.district) {
        headline = t.district + ' cleared!';
        sub = 'Next up: ' + next.district;
      }
      const rows = [
        `<div class="sum-row"><span>${reward} words found</span><b>+${reward} ${coinSvg}</b></div>`
      ];
      if (done.tileCoins) rows.push(`<div class="sum-row"><span>Coin tiles</span><b>+${done.tileCoins} ${coinSvg}</b></div>`);
      if (done.extras.length)
        rows.push(`<div class="sum-row"><span>Extra words</span><b>${done.extras.length}</b></div>`);
      openModal({
        title: headline,
        cls: 'win',
        body: `<p class="sum-sub">${sub}</p><div class="sum">${rows.join('')}</div>
               <div class="sum-total">${coinSvg}<span class="coin-count">${S.coins}</span></div>`,
        actions: [{ label: 'Next level', primary: true, run: () => startLevel() }],
        noClose: true
      });
      document.querySelectorAll('.coin-count').forEach((n) => (n.textContent = S.coins));
      wheel.setEnabled(true);
    }, 900);
  }

  /* ---------------- hints ---------------- */

  function letterHintCell() {
    const open = new Set(L.revealed);
    const words = P.words.map((w, i) => i).filter((i) => !L.found.includes(P.words[i]));
    const options = [];
    words.forEach((i) => {
      const k = wordKeys[i].find((key) => !open.has(key));
      if (k) options.push(k);
    });
    // Avoid spending a hint on a coin tile when there is a choice.
    const plain = options.filter((k) => !L.coinsLeft.includes(k));
    const pool = plain.length ? plain : options;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function giveLetterHint() {
    const k = letterHintCell();
    if (!k) return false;
    SW.Audio.sfx('hint');
    revealCells([k], false);
    L.hintsUsed++;
    S.stats.hintsUsed++;
    autoComplete();
    save();
    updateHintButtons();
    if (L.found.length === P.words.length) finishLevel();
    return true;
  }

  function wordHintCandidates() {
    // Never the longest word that uses every letter.
    return P.words.map((w, i) => i).filter((i) => !L.found.includes(P.words[i]) && P.words[i].length < P.letters.length);
  }

  function onLetterHint() {
    if (busy) return;
    if (S.coins < C.HINT_LETTER_COST) return offerAdHint();
    setCoins(-C.HINT_LETTER_COST);
    giveLetterHint();
  }

  function onWordHint() {
    if (busy) return;
    const cands = wordHintCandidates();
    if (!cands.length) {
      toast('Only the longest word is left. Try a letter hint!');
      return;
    }
    if (S.coins < C.HINT_WORD_COST) return offerAdHint();
    setCoins(-C.HINT_WORD_COST);
    const i = cands[Math.floor(Math.random() * cands.length)];
    SW.Audio.sfx('hint');
    L.hintsUsed++;
    S.stats.hintsUsed++;
    markFound(i, false);
  }

  /* ---------------- ads ---------------- */

  async function watchAd(name) {
    const ok = await SW.Ads.showRewarded(name);
    if (!ok) {
      toast('No reward this time');
      return false;
    }
    S.stats.adsWatched++;
    save();
    return true;
  }

  function offerAdHint() {
    openModal({
      title: 'Need a hand?',
      body: `<p>You need <b>${C.HINT_LETTER_COST}</b> ${coinSvg} for a letter hint. Watch a short ad to reveal a letter for free.</p>`,
      actions: [
        {
          label: 'Watch ad · free hint',
          icon: ICON.tv,
          primary: true,
          run: async () => {
            if (await watchAd('free-letter-hint')) giveLetterHint();
          }
        },
        { label: 'Not now' }
      ]
    });
  }

  function openCoinMenu() {
    openModal({
      title: 'Coins',
      body: `<div class="sum-total">${coinSvg}<span class="coin-count">${S.coins}</span></div>
        <p>Find every word in a level to earn one coin per word. Every ${C.EXTRA_WORDS_PER_REWARD} extra words pays ${C.EXTRA_WORDS_REWARD} coins, and look out for coin tiles in the grid.</p>`,
      actions: [
        {
          label: `Watch ad · +${C.ADS.coinReward}`,
          icon: ICON.tv,
          primary: true,
          run: async () => {
            if (await watchAd('coins')) {
              SW.Audio.sfx('coin');
              setCoins(C.ADS.coinReward);
            }
          }
        },
        { label: 'Close' }
      ]
    });
  }

  /* ---------------- modals ---------------- */

  function openModal(o) {
    busy = true;
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${o.cls || ''}" role="dialog" aria-modal="true" aria-label="${o.title}">
        <h2>${o.title}</h2><div class="modal-body">${o.body}</div><div class="modal-actions"></div></div>`;
    const actions = wrap.querySelector('.modal-actions');
    const close = () => {
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 200);
      if (!root.querySelector('.modal-wrap:not(.out)')) busy = false;
    };
    (o.actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.primary ? 'primary' : 'ghost');
      b.innerHTML = (a.icon || '') + '<span>' + a.label + '</span>';
      b.addEventListener('click', () => {
        SW.Audio.sfx('tap');
        close();
        if (a.run) a.run();
      });
      actions.appendChild(b);
    });
    if (!o.noClose) {
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) close();
      });
    }
    root.appendChild(wrap);
    if (o.onOpen) o.onOpen(wrap, close);
    return close;
  }

  function openExtras() {
    const prog = S.extraTotal % C.EXTRA_WORDS_PER_REWARD;
    const list = L.extras.length
      ? `<div class="chips">${L.extras.map((w) => `<span>${w.toUpperCase()}</span>`).join('')}</div>`
      : '<p class="muted">No extra words in this level yet. Real words that aren’t in the grid land here.</p>';
    openModal({
      title: 'Extra words',
      body: `${list}
        <div class="meter"><span style="width:${(prog / C.EXTRA_WORDS_PER_REWARD) * 100}%"></span></div>
        <p class="muted">${prog} of ${C.EXTRA_WORDS_PER_REWARD} toward +${C.EXTRA_WORDS_REWARD} ${coinSvg} · ${S.extraTotal} found all time</p>`,
      actions: [{ label: 'Close' }]
    });
  }

  function openSettings() {
    const st = S.settings;
    openModal({
      title: 'Settings',
      body: `
        <label class="row"><span>Music</span><input type="checkbox" id="set-music" ${st.music ? 'checked' : ''}><i class="switch"></i></label>
        <label class="row"><span>Music volume</span><input type="range" id="set-vol" min="0" max="1" step="0.05" value="${st.musicVolume}"></label>
        <label class="row"><span>Sound effects</span><input type="checkbox" id="set-sfx" ${st.sfx ? 'checked' : ''}><i class="switch"></i></label>
        <details class="how"><summary>How to play</summary>
          <p>Drag across the letters in the circle to spell a word, then let go. On a keyboard, type letters and press Enter (Space shuffles).</p>
          <p>Fill the whole grid to finish the level and earn a coin for every word in it. Real words that aren't in the grid go into your extra words.</p>
          <p>Hints: ${C.HINT_LETTER_COST} coins reveals a letter, ${C.HINT_WORD_COST} reveals a whole word (never the longest one).</p>
        </details>
        <button class="btn danger small" id="set-reset">Reset progress</button>
        <p class="muted tiny">Word lists from SCOWL by Kevin Atkinson.</p>`,
      actions: [{ label: 'Done', primary: true }],
      onOpen: (wrap, close) => {
        const apply = () => {
          save();
          SW.Audio.apply(S.settings);
        };
        wrap.querySelector('#set-music').addEventListener('change', (e) => {
          st.music = e.target.checked;
          apply();
        });
        wrap.querySelector('#set-sfx').addEventListener('change', (e) => {
          st.sfx = e.target.checked;
          apply();
        });
        wrap.querySelector('#set-vol').addEventListener('input', (e) => {
          st.musicVolume = Number(e.target.value);
          apply();
        });
        wrap.querySelector('#set-reset').addEventListener('click', () => {
          close();
          openModal({
            title: 'Reset progress?',
            body: '<p>This sends you back to level 1 and resets your coins. It can’t be undone.</p>',
            actions: [
              {
                label: 'Reset',
                primary: true,
                run: () => {
                  const settings = S.settings;
                  S = SW.Storage.reset();
                  S.settings = settings;
                  save();
                  P = null;
                  renderHome();
                  show('home');
                }
              },
              { label: 'Cancel' }
            ]
          });
        });
      }
    });
  }

  /* ---------------- wiring ---------------- */

  function icon(sel, svg) {
    const el = $(sel);
    el.insertAdjacentHTML('afterbegin', svg);
  }

  function init() {
    icon('#btn-back', ICON.back);
    icon('#btn-settings', ICON.gear);
    icon('#btn-settings-game', ICON.gear);
    icon('#btn-shuffle', ICON.shuffle);
    icon('#btn-extras', ICON.book);
    icon('#btn-hint-letter', ICON.bulb);
    icon('#btn-hint-word', ICON.word);
    icon('#play', ICON.play);
    $('#cost-letter').textContent = C.HINT_LETTER_COST;
    $('#cost-word').textContent = C.HINT_WORD_COST;
    document.title = C.GAME_NAME;

    SW.Themes.Sky.init($('#sky'));
    SW.Ads.init();
    renderHome();

    $('#play').addEventListener('click', () => {
      SW.Audio.unlock(S.settings);
      SW.Audio.sfx('tap');
      startLevel();
    });
    $('#btn-back').addEventListener('click', () => {
      if (busy) return;
      SW.Audio.sfx('tap');
      renderHome();
      show('home');
    });
    $('#btn-settings').addEventListener('click', () => {
      SW.Audio.unlock(S.settings);
      openSettings();
    });
    $('#btn-settings-game').addEventListener('click', () => !busy && openSettings());
    document.querySelectorAll('.coins').forEach((b) =>
      b.addEventListener('click', () => {
        SW.Audio.unlock(S.settings);
        if (!busy) openCoinMenu();
      })
    );
    $('#btn-shuffle').addEventListener('click', () => {
      if (busy) return;
      SW.Audio.sfx('shuffle');
      wheel.shuffle();
    });
    $('#btn-extras').addEventListener('click', () => !busy && openExtras());
    $('#btn-hint-letter').addEventListener('click', onLetterHint);
    $('#btn-hint-word').addEventListener('click', onWordHint);

    document.addEventListener('keydown', (e) => {
      if (!$('#game').classList.contains('active') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (busy) {
        if (e.key === 'Enter') {
          const btn = document.querySelector('.modal-wrap:not(.out) .btn.primary');
          if (btn) btn.click();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (/^[a-z]$/.test(k)) wheel.typeLetter(k);
      else if (e.key === 'Backspace') wheel.backspace();
      else if (e.key === 'Enter') wheel.submitTyped();
      else if (e.key === 'Escape') wheel.clear();
      else if (e.key === ' ') {
        e.preventDefault();
        SW.Audio.sfx('shuffle');
        wheel.shuffle();
      } else return;
      e.preventDefault();
    });
  }

  init();

  // Handy for testing from the browser console.
  window.SW.debug = {
    state: () => S,
    puzzle: () => P,
    solve: () => P && P.words.forEach((w) => submit(w)),
    addCoins: (n) => setCoins(n),
    goto: (lvl) => {
      S.level = lvl;
      S.current = null;
      save();
      startLevel();
    }
  };
})();
