/* Game-wide tunables. Change numbers here, not in the game code. */
window.SW = window.SW || {};

SW.CONFIG = {
  GAME_NAME: 'Skyline Words',
  SAVE_KEY: 'skyline-words-save-v1',

  // Economy
  START_COINS: 200,
  HINT_LETTER_COST: 100, // reveal one letter
  HINT_WORD_COST: 200, // reveal one whole word (never the longest, all-letter word)
  EXTRA_WORDS_PER_REWARD: 10, // every 10 extra words found (lifetime)...
  EXTRA_WORDS_REWARD: 3, // ...gives 3 coins
  GRID_COIN_VALUE: 5, // coin tiles hidden in the grid
  GRID_COIN_CHANCE: 0.6, // chance a level has coin tiles (from level 3)

  // Difficulty
  MIN_LEN_4_FROM_LEVEL: 25, // from this level on, 3-letter words are not allowed
  LEVELS_PER_DISTRICT: 8, // levels in each district; every city has 3 districts

  // Rewarded ads. provider: 'mock' (simulated ad, for development) or 'h5'
  // (Google AdSense H5 Games Ads; needs an approved AdSense account).
  ADS: {
    provider: 'mock',
    coinReward: 50, // coins for watching an ad from the coin menu
    mockSeconds: 5,
    h5: {
      client: 'ca-pub-0000000000000000', // your AdSense publisher id
      testMode: true // keep true until your account is approved
    }
  },

  // Purchases are not built yet. When they are, the shop can read this flag.
  IAP_ENABLED: false
};
