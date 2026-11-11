# Skyline Words

A calm, endless word puzzle for the web. Drag across letters on a wheel to fill a
crossword, while a night-time city skyline glows behind you and lofi beats play.

Plain HTML, CSS and JavaScript. No build step and no dependencies at runtime.

## Play it

Open `index.html` in a browser, or serve the folder:

```bash
node tools/serve.js
```

Then visit http://localhost:5173.

## How it works

| Rule | Where to change it |
| --- | --- |
| Levels are endless and generated on the fly; each level always generates the same way | `js/generator.js` |
| Early levels: 4 letters, 3 words. Grows to 7–8 letters and up to 16 words | `difficulty()` in `js/generator.js` |
| From level 25, words must be 4+ letters (answers and extras) | `MIN_LEN_4_FROM_LEVEL` in `js/config.js` |
| Real words that aren't in the grid go to the extra words list | `submit()` in `js/game.js` |
| Every 10 extra words found (lifetime) gives 3 coins | `EXTRA_WORDS_*` in `js/config.js` |
| Finishing a level gives 1 coin per word in it | `finishLevel()` in `js/game.js` |
| Coin tiles sit in the grid, mostly where words cross. Found by you = +5 coins; revealed by a hint = lost | `GRID_COIN_*` in `js/config.js` |
| Letter hint costs 100, word hint costs 200 (never the longest, all-letter word) | `HINT_*` in `js/config.js` |
| Rewarded ads: +50 coins from the coin menu, or a free letter hint when you can't afford one | `ADS` in `js/config.js` |

Cities rotate every 24 levels (3 districts × 8 levels): Tokyo, New York, Hong Kong,
Paris, London, Seoul, Dubai, Chicago, Mumbai, Berlin, Singapore, San Francisco, then
the tour repeats (Tokyo II, ...). Each city has its own colours, weather and skyline,
all drawn in code (`js/themes.js`).

Music is generated live with the Web Audio API (`js/audio.js`): jazzy 7th/9th
chords, sub bass, swung brushed drums, tape wobble and vinyl crackle. No audio files,
so no licensing.

Progress saves in the browser's localStorage.

## Ads

`SW.CONFIG.ADS.provider` is `'mock'` by default, which shows a simulated 5-second ad
so you can test the flow. To go live with Google's H5 Games Ads:

1. Get an AdSense account approved for H5 games.
2. Set `provider: 'h5'` and your `client` id (`ca-pub-...`) in `js/config.js`.
3. Keep `testMode: true` until Google approves the site, then set it to `false`.

The H5 adapter is in `js/ads.js`. Other ad networks can be added there behind the same
`showRewarded()` promise.

## In-app purchases (later)

Not built. Coins all flow through `setCoins()` in `js/game.js`, and `IAP_ENABLED` in
the config is reserved for a future shop.

## Developer tools

- `node tests/generator.test.js 600` generates 600 levels and checks every grid
  (no stray letter runs, connected, words spellable, min-length rule, grid ≤ 12×12).
- In the browser console: `SW.debug.solve()`, `SW.debug.goto(50)`, `SW.debug.addCoins(500)`.
- Rebuild the dictionary: `npm install wordlist-english` somewhere, then
  `node tools/build-wordlist.js <path>/node_modules/wordlist-english`.

## Credits

Word lists from SCOWL, Copyright 2000-2016 Kevin Atkinson and contributors:

> Permission to use, copy, modify, distribute and sell these word lists, the
> associated scripts, the output created from the scripts, and its documentation for
> any purpose is hereby granted without fee, provided that the above copyright notice
> appears in all copies and that both that copyright notice and this permission
> notice appear in supporting documentation. Kevin Atkinson makes no representations
> about the suitability of this array for any purpose. It is provided "as is" without
> express or implied warranty.
