/* Crossword board: renders cells, reveals letters, shows coin tiles. */
window.SW = window.SW || {};

SW.Grid = function (el) {
  let cells = new Map(); // key -> { el, ch }
  let puzzle = null;

  function cellKeys(p) {
    const keys = [];
    for (let i = 0; i < p.word.length; i++) {
      keys.push(p.dir === 'h' ? p.r + ',' + (p.c + i) : p.r + i + ',' + p.c);
    }
    return keys;
  }

  function render(pz, state) {
    puzzle = pz;
    el.innerHTML = '';
    cells = new Map();
    const inner = document.createElement('div');
    inner.className = 'grid-inner';
    inner.style.setProperty('--cols', pz.cols);
    inner.style.setProperty('--rows', pz.rows);
    el.appendChild(inner);
    const revealed = new Set(state.revealed);
    const coins = new Set(state.coinsLeft);
    // Cells in found words are solid; other revealed cells came from hints.
    const solid = new Set();
    pz.placements.forEach((p) => {
      if (state.found.includes(p.word)) cellKeys(p).forEach((k) => solid.add(k));
    });
    for (const p of pz.placements) {
      cellKeys(p).forEach((k, i) => {
        if (cells.has(k)) return;
        const [r, c] = k.split(',').map(Number);
        const d = document.createElement('div');
        d.className = 'cell';
        d.style.gridRow = r + 1;
        d.style.gridColumn = c + 1;
        const span = document.createElement('span');
        span.textContent = p.word[i].toUpperCase();
        d.appendChild(span);
        if (revealed.has(k)) d.classList.add('open', 'static', solid.has(k) ? 'solid' : 'hinted');
        if (coins.has(k) && !revealed.has(k)) {
          const coin = document.createElement('i');
          coin.className = 'cell-coin';
          d.appendChild(coin);
        }
        inner.appendChild(d);
        cells.set(k, { el: d, ch: p.word[i] });
      });
    }
    fit();
  }

  function fit() {
    if (!puzzle) return;
    const inner = el.firstChild;
    const box = el.getBoundingClientRect();
    const gap = 0.1; // gap as a share of cell size
    const size = Math.min(
      box.width / (puzzle.cols + (puzzle.cols - 1) * gap),
      box.height / (puzzle.rows + (puzzle.rows - 1) * gap),
      64
    );
    inner.style.setProperty('--cell', Math.floor(size) + 'px');
    inner.style.setProperty('--gap', Math.max(2, Math.floor(size * gap)) + 'px');
  }
  window.addEventListener('resize', fit);

  function reveal(keys, opts) {
    keys.forEach((k, i) => {
      const c = cells.get(k);
      if (!c) return;
      const coin = c.el.querySelector('.cell-coin');
      if (coin) {
        if (opts.collect) coin.classList.add('collect');
        else coin.classList.add('drop');
        setTimeout(() => coin.remove(), 700);
      }
      if (c.el.classList.contains('open')) {
        // A hinted letter turns solid once its word is found
        if (opts.solid && c.el.classList.contains('hinted')) {
          c.el.classList.remove('hinted');
          c.el.classList.add('solid');
        }
        if (opts.flash) flash(c.el, i);
        return;
      }
      c.el.style.animationDelay = i * 60 + 'ms';
      c.el.classList.add('open', 'reveal', opts.solid ? 'solid' : 'hinted');
    });
  }

  function flash(node, i) {
    node.style.animationDelay = (i || 0) * 50 + 'ms';
    node.classList.remove('flash');
    void node.offsetWidth;
    node.classList.add('flash');
  }

  function flashWord(keys) {
    keys.forEach((k, i) => {
      const c = cells.get(k);
      if (c) flash(c.el, i);
    });
  }

  function cellEl(k) {
    const c = cells.get(k);
    return c && c.el;
  }

  return { render, reveal, flashWord, cellKeys, cellEl, fit };
};
