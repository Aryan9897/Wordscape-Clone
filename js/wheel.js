/* Letter wheel: drag across letters to spell a word. Drag back onto the
   previous letter to undo it. Also supports typing on a keyboard. */
window.SW = window.SW || {};

SW.Wheel = function (el, handlers) {
  const svgNS = 'http://www.w3.org/2000/svg';
  let letters = [];
  let buttons = [];
  let positions = []; // percent coordinates (0-100)
  let chain = []; // selected letter indexes
  let dragging = false;
  let pointerId = null;
  let enabled = true;
  let pointer = null;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'wheel-lines');
  svg.setAttribute('aria-hidden', 'true');
  const poly = document.createElementNS(svgNS, 'polyline');
  const tail = document.createElementNS(svgNS, 'line');
  svg.append(poly, tail);
  el.appendChild(svg);

  function layout(animate) {
    const n = letters.length;
    const r = n <= 4 ? 30 : n <= 6 ? 33 : 35;
    const size = n <= 4 ? 24 : n <= 6 ? 21 : 18.5;
    el.style.setProperty('--ls', size);
    positions = letters.map((_, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
    });
    buttons.forEach((b, i) => {
      b.style.left = positions[i].x + '%';
      b.style.top = positions[i].y + '%';
      if (animate) {
        b.classList.remove('pop');
        void b.offsetWidth;
        b.classList.add('pop');
      }
    });
  }

  function setLetters(list) {
    letters = list.slice();
    buttons.forEach((b) => b.remove());
    buttons = letters.map((ch, i) => {
      const b = document.createElement('div');
      b.className = 'wheel-letter';
      b.textContent = ch.toUpperCase();
      b.dataset.i = i;
      el.appendChild(b);
      return b;
    });
    chain = [];
    layout(true);
    draw();
  }

  function shuffle() {
    if (dragging) return;
    // Rotate positions so the motion reads as a shuffle
    const idx = letters.map((_, i) => i);
    for (let k = 0; k < 6; k++) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      if (idx.some((v, i) => v !== i)) break;
    }
    letters = idx.map((i) => letters[i]);
    buttons = idx.map((i) => buttons[i]);
    buttons.forEach((b, i) => (b.dataset.i = i));
    chain = [];
    layout(false);
    draw();
  }

  function word() {
    return chain.map((i) => letters[i]).join('');
  }

  function draw() {
    buttons.forEach((b, i) => b.classList.toggle('on', chain.includes(i)));
    poly.setAttribute('points', chain.map((i) => positions[i].x + ',' + positions[i].y).join(' '));
    if (dragging && chain.length && pointer) {
      const last = positions[chain[chain.length - 1]];
      tail.setAttribute('x1', last.x);
      tail.setAttribute('y1', last.y);
      tail.setAttribute('x2', pointer.x);
      tail.setAttribute('y2', pointer.y);
      tail.style.opacity = 1;
    } else tail.style.opacity = 0;
    handlers.onChange(word());
  }

  function toLocal(e) {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }

  function hit(p, radius) {
    let best = -1;
    let bestD = radius;
    positions.forEach((q, i) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function add(i) {
    chain.push(i);
    handlers.onSelect(chain.length - 1);
  }

  el.addEventListener('pointerdown', (e) => {
    if (!enabled || dragging) return;
    const p = toLocal(e);
    const i = hit(p, 13);
    if (i < 0) return;
    e.preventDefault();
    dragging = true;
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    pointer = p;
    chain = [];
    add(i);
    draw();
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    pointer = toLocal(e);
    const i = hit(pointer, 10);
    if (i >= 0) {
      if (chain.length > 1 && chain[chain.length - 2] === i) chain.pop();
      else if (!chain.includes(i)) add(i);
    }
    draw();
  });

  function end(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    try {
      el.releasePointerCapture(pointerId);
    } catch (err) {
      /* already released */
    }
    const w = word();
    chain = [];
    draw();
    if (w.length > 1) handlers.onSubmit(w);
    else handlers.onChange('');
  }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  /* Keyboard play */
  function typeLetter(ch) {
    if (!enabled || dragging) return;
    const i = letters.findIndex((l, k) => l === ch && !chain.includes(k));
    if (i < 0) {
      el.classList.remove('nope');
      void el.offsetWidth;
      el.classList.add('nope');
      return;
    }
    add(i);
    draw();
  }
  function backspace() {
    if (dragging) return;
    chain.pop();
    draw();
  }
  function submitTyped() {
    if (dragging) return;
    const w = word();
    chain = [];
    draw();
    if (w.length > 1) handlers.onSubmit(w);
  }
  function clear() {
    if (dragging) return;
    chain = [];
    draw();
  }

  return {
    setLetters,
    shuffle,
    typeLetter,
    backspace,
    submitTyped,
    clear,
    setEnabled: (v) => (enabled = v),
    letters: () => letters.slice()
  };
};
