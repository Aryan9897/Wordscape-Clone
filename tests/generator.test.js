#!/usr/bin/env node
/* Generates many levels and checks every puzzle is well-formed.
   Run: node tests/generator.test.js [levels=400] */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['words', 'config', 'rng', 'dictionary', 'generator']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx);
}
const { Generator, Dict, CONFIG } = ctx.SW;

const N = Number(process.argv[2] || 400);
const used = new Set();
let failures = 0;
let shortfalls = 0;
let maxDim = 0;
let slowest = 0;
const fail = (lvl, msg) => {
  failures++;
  console.log(`FAIL level ${lvl}: ${msg}`);
};

for (let lvl = 1; lvl <= N; lvl++) {
  const t0 = Date.now();
  const p = Generator.generate(lvl, used);
  slowest = Math.max(slowest, Date.now() - t0);
  used.add(p.key);
  const diff = Generator.difficulty(lvl, ctx.SW.rng.create('skyline-level-' + lvl));

  if (!p.words.includes(p.base)) fail(lvl, 'base word missing');
  if (new Set(p.words).size !== p.words.length) fail(lvl, 'duplicate words');
  if (p.words.length < diff.target) shortfalls++;
  if (p.letters.join('') === p.base) fail(lvl, 'wheel spells the base word');
  for (const w of p.words) {
    if (w.length < p.minLen) fail(lvl, `${w} shorter than ${p.minLen}`);
    if (!Dict.canSpell(w, p.letters)) fail(lvl, `${w} not spellable`);
    if (Dict.tierOf(w) < 1 || Dict.tierOf(w) > 2) fail(lvl, `${w} not an answer-tier word`);
  }
  if (lvl >= CONFIG.MIN_LEN_4_FROM_LEVEL && p.minLen !== 4) fail(lvl, 'min length should be 4');

  // Rebuild the grid and check it.
  const grid = Array.from({ length: p.rows }, () => Array(p.cols).fill(null));
  for (const pl of p.placements) {
    for (let i = 0; i < pl.word.length; i++) {
      const r = pl.dir === 'v' ? pl.r + i : pl.r;
      const c = pl.dir === 'h' ? pl.c + i : pl.c;
      if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) fail(lvl, 'out of bounds');
      else if (grid[r][c] && grid[r][c] !== pl.word[i]) fail(lvl, 'letter clash');
      else grid[r][c] = pl.word[i];
    }
  }
  // Every run of 2+ letters must be exactly a placed word.
  const runs = [];
  for (let r = 0; r < p.rows; r++) {
    let s = '';
    for (let c = 0; c <= p.cols; c++) {
      const ch = c < p.cols ? grid[r][c] : null;
      if (ch) s += ch;
      else {
        if (s.length > 1) runs.push(s);
        s = '';
      }
    }
  }
  for (let c = 0; c < p.cols; c++) {
    let s = '';
    for (let r = 0; r <= p.rows; r++) {
      const ch = r < p.rows ? grid[r][c] : null;
      if (ch) s += ch;
      else {
        if (s.length > 1) runs.push(s);
        s = '';
      }
    }
  }
  if (runs.length !== p.words.length || runs.some((s) => !p.words.includes(s)))
    fail(lvl, `stray letter runs: ${runs.filter((s) => !p.words.includes(s)).join(',')}`);

  // Connected?
  const filled = [];
  grid.forEach((row, r) => row.forEach((ch, c) => ch && filled.push(r + ',' + c)));
  const seen = new Set([filled[0]]);
  const stack = [filled[0]];
  while (stack.length) {
    const [r, c] = stack.pop().split(',').map(Number);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = r + dr + ',' + (c + dc);
      if (grid[r + dr] && grid[r + dr][c + dc] && !seen.has(k)) {
        seen.add(k);
        stack.push(k);
      }
    }
  }
  if (seen.size !== filled.length) fail(lvl, 'grid not connected');
  for (const k of p.coins) if (!filled.includes(k)) fail(lvl, 'coin on empty cell');

  maxDim = Math.max(maxDim, p.rows, p.cols);
  if (lvl <= 6 || lvl % 50 === 0 || lvl === 25 || lvl === 45 || lvl === 101)
    console.log(
      `L${lvl} letters=${p.letters.join('').toUpperCase()} min=${p.minLen} ` +
        `${p.words.length} words ${p.cols}x${p.rows} coins=${p.coins.length}: ${p.words.join(' ')}`
    );
}

console.log(
  `\n${N} levels, ${failures} failures, ${shortfalls} levels below target word count, ` +
    `largest grid side ${maxDim}, slowest ${slowest} ms`
);
process.exit(failures ? 1 : 0);
