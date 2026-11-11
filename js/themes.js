/* City themes and the animated night skyline drawn behind the game. */
window.SW = window.SW || {};

SW.Themes = (function () {
  const C = SW.CONFIG;

  /* sky: [top, middle, horizon]. windows/neon are light colours.
     style picks the rooftop shapes; extras add weather and water. */
  const CITIES = [
    {
      name: 'Tokyo', districts: ['Shibuya', 'Shinjuku', 'Akihabara'],
      sky: ['#07061a', '#1a1040', '#3a1d5c'], far: '#1b1638', near: '#0c0a1f',
      windows: ['#ffd9a0', '#9ee7ff', '#ffb3d9'], neon: ['#ff4fa3', '#36e2ff', '#b56bff'],
      accent: '#ff5fae', accent2: '#3fdcff', style: 'antenna', rain: true, stars: false
    },
    {
      name: 'New York', districts: ['Brooklyn', 'Midtown', 'Harlem'],
      sky: ['#040814', '#0d1a33', '#2a2a48'], far: '#141c33', near: '#090d1a',
      windows: ['#ffd27a', '#ffe3a8', '#fff1cc'], neon: ['#ffb347', '#ff6b5e'],
      accent: '#ffb347', accent2: '#7aa7ff', style: 'spire', moon: true, stars: true
    },
    {
      name: 'Hong Kong', districts: ['Kowloon', 'Central', 'Victoria Harbour'],
      sky: ['#05071a', '#16113a', '#3b1f4f'], far: '#1a1536', near: '#0a0919',
      windows: ['#ffe4b0', '#c9f0ff', '#ffc4e1'], neon: ['#ff3d7f', '#2dffc4', '#ffd23d'],
      accent: '#2dffc4', accent2: '#ff3d7f', style: 'tower', water: true, stars: false
    },
    {
      name: 'Paris', districts: ['Montmartre', 'Le Marais', 'Saint-Germain'],
      sky: ['#0a0716', '#1d1430', '#46304a'], far: '#211a33', near: '#100c1c',
      windows: ['#ffcf8a', '#ffe0b0'], neon: ['#ffc46b'],
      accent: '#ffc46b', accent2: '#c79bff', style: 'mansard', moon: true, stars: true
    },
    {
      name: 'London', districts: ['Soho', 'Camden', 'Shoreditch'],
      sky: ['#070a10', '#151c28', '#2c3442'], far: '#1a212d', near: '#0b0f16',
      windows: ['#ffd896', '#f5e6c4'], neon: ['#ff5a5a', '#5ad1ff'],
      accent: '#7fd1ff', accent2: '#ff7a7a', style: 'mixed', fog: true, rain: true
    },
    {
      name: 'Seoul', districts: ['Gangnam', 'Hongdae', 'Itaewon'],
      sky: ['#060616', '#15123a', '#2b1f5a'], far: '#191640', near: '#0a0920',
      windows: ['#c8f7ff', '#ffe9b8', '#e3c8ff'], neon: ['#8c7bff', '#4dffd2', '#ff6bd6'],
      accent: '#8c7bff', accent2: '#4dffd2', style: 'antenna', stars: true
    },
    {
      name: 'Dubai', districts: ['Marina', 'Downtown', 'Deira'],
      sky: ['#05080f', '#0f2030', '#3a3040'], far: '#152330', near: '#091119',
      windows: ['#ffe2a0', '#bfefff'], neon: ['#3fd6ff', '#ffcf5a'],
      accent: '#ffcf5a', accent2: '#3fd6ff', style: 'spire', water: true, stars: true, moon: true
    },
    {
      name: 'Chicago', districts: ['The Loop', 'Wicker Park', 'River North'],
      sky: ['#04070f', '#0c1628', '#1f2a40'], far: '#121b2c', near: '#080c16',
      windows: ['#ffd38a', '#dfe9ff'], neon: ['#4f8bff', '#ff8b4f'],
      accent: '#5f9bff', accent2: '#ff9b5f', style: 'tower', water: true, stars: true
    },
    {
      name: 'Mumbai', districts: ['Bandra', 'Colaba', 'Marine Drive'],
      sky: ['#0a0612', '#22102a', '#4a2036'], far: '#24142c', near: '#110a16',
      windows: ['#ffc870', '#ffe1a6', '#ffb0a0'], neon: ['#ff7a3d', '#ff3d8b'],
      accent: '#ff8a4d', accent2: '#ff4d9b', style: 'mixed', water: true, moon: true
    },
    {
      name: 'Berlin', districts: ['Kreuzberg', 'Mitte', 'Neukölln'],
      sky: ['#050a0c', '#0f1f24', '#223a3c'], far: '#132226', near: '#081113',
      windows: ['#e8f5d0', '#ffd890'], neon: ['#4dffb8', '#ff4d6a'],
      accent: '#4dffb8', accent2: '#ff5f7a', style: 'tvtower', fog: true, stars: true
    },
    {
      name: 'Singapore', districts: ['Marina Bay', 'Chinatown', 'Tiong Bahru'],
      sky: ['#040b0e', '#0b2026', '#1c3a3e'], far: '#10262b', near: '#071316',
      windows: ['#c9fff0', '#ffe7b0'], neon: ['#2dffa6', '#ff5ac8', '#5ac8ff'],
      accent: '#2dffa6', accent2: '#5ac8ff', style: 'tower', water: true, rain: true
    },
    {
      name: 'San Francisco', districts: ['The Mission', 'Nob Hill', 'Embarcadero'],
      sky: ['#070810', '#171a2c', '#3a2e3e'], far: '#1c1e30', near: '#0d0e18',
      windows: ['#ffd48f', '#ffe9c2'], neon: ['#ff6a3d', '#ffd23d'],
      accent: '#ff7a4d', accent2: '#ffd24d', style: 'mixed', fog: true, water: true, moon: true
    }
  ];

  const DISTRICT_LEVELS = C.LEVELS_PER_DISTRICT;
  const CITY_LEVELS = DISTRICT_LEVELS * 3;

  function forLevel(level) {
    const cityIndex = Math.floor((level - 1) / CITY_LEVELS);
    const city = CITIES[cityIndex % CITIES.length];
    const lap = Math.floor(cityIndex / CITIES.length); // after the last city, the tour starts again
    const districtIndex = Math.floor(((level - 1) % CITY_LEVELS) / DISTRICT_LEVELS);
    return {
      city,
      cityIndex,
      lap,
      cityName: city.name + (lap ? ' ' + roman(lap + 1) : ''),
      district: city.districts[districtIndex],
      districtIndex,
      levelInDistrict: ((level - 1) % DISTRICT_LEVELS) + 1,
      seed: cityIndex
    };
  }

  function roman(n) {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
    return s;
  }

  /* ---------------- skyline renderer ---------------- */

  const Sky = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    theme: null, staticLayer: null, stars: [], blinkers: [], drops: [], flicker: [],
    raf: 0, last: 0, t: 0,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(this.raf);
        else this.loop();
      });
      this.resize();
    },

    setTheme(info) {
      if (this.theme && this.theme.seed === info.seed) return;
      this.theme = info;
      const root = document.documentElement.style;
      root.setProperty('--accent', info.city.accent);
      root.setProperty('--accent-2', info.city.accent2);
      root.setProperty('--sky-top', info.city.sky[0]);
      root.setProperty('--sky-mid', info.city.sky[1]);
      this.build();
    },

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      if (this.theme) this.build();
    },

    build() {
      const { w, h, dpr } = this;
      const city = this.theme.city;
      const rng = SW.rng.create('city-' + this.theme.seed);
      const layer = document.createElement('canvas');
      layer.width = Math.round(w * dpr);
      layer.height = Math.round(h * dpr);
      const g = layer.getContext('2d');
      g.scale(dpr, dpr);

      const waterH = city.water ? h * 0.12 : 0;
      const ground = h - waterH;

      // Sky
      const sky = g.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, city.sky[0]);
      sky.addColorStop(0.55, city.sky[1]);
      sky.addColorStop(1, city.sky[2]);
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);

      // Moon
      if (city.moon) {
        const mx = w * (0.15 + rng() * 0.7);
        const my = h * (0.08 + rng() * 0.08);
        const r = Math.max(14, Math.min(w, h) * 0.035);
        const glow = g.createRadialGradient(mx, my, r * 0.5, mx, my, r * 5);
        glow.addColorStop(0, 'rgba(255,240,210,0.25)');
        glow.addColorStop(1, 'rgba(255,240,210,0)');
        g.fillStyle = glow;
        g.fillRect(mx - r * 5, my - r * 5, r * 10, r * 10);
        g.fillStyle = '#f6ecd6';
        g.beginPath();
        g.arc(mx, my, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = city.sky[0];
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(mx + r * 0.45, my - r * 0.2, r * 0.9, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }

      // Stars (animated separately)
      this.stars = [];
      const starCount = city.stars ? Math.round((w * h) / 9000) : Math.round((w * h) / 40000);
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: rng() * w, y: rng() * ground * 0.55, r: rng() * 1.1 + 0.3,
          p: rng() * Math.PI * 2, s: 0.5 + rng() * 1.5
        });
      }

      // Horizon haze glow from city lights
      const haze = g.createLinearGradient(0, ground * 0.55, 0, ground);
      haze.addColorStop(0, 'rgba(0,0,0,0)');
      haze.addColorStop(1, hexA(city.neon[0], 0.18));
      g.fillStyle = haze;
      g.fillRect(0, ground * 0.55, w, ground * 0.45);

      this.blinkers = [];
      this.flicker = [];
      const skylineTop = ground - Math.min(h * 0.42, 420);

      // Three depth layers
      this.drawLayer(g, rng, { base: ground, top: skylineTop + h * 0.02, color: mix(city.far, city.sky[2], 0.35), windows: 0.08, minW: 30, maxW: 70, detail: false });
      this.drawLayer(g, rng, { base: ground, top: skylineTop + h * 0.08, color: city.far, windows: 0.18, minW: 34, maxW: 80, detail: true });
      this.drawLayer(g, rng, { base: ground, top: skylineTop + h * 0.2, color: city.near, windows: 0.32, minW: 40, maxW: 95, detail: true, near: true });

      // Water with reflection
      if (city.water) {
        g.save();
        g.translate(0, ground * 2);
        g.scale(1, -1);
        g.globalAlpha = 0.35;
        g.drawImage(layer, 0, 0, layer.width, layer.height * (ground / h), 0, 0, w, ground);
        g.restore();
        const wg = g.createLinearGradient(0, ground, 0, h);
        wg.addColorStop(0, hexA(city.sky[0], 0.55));
        wg.addColorStop(1, hexA(city.sky[0], 0.95));
        g.fillStyle = wg;
        g.fillRect(0, ground, w, waterH);
        g.strokeStyle = hexA(city.windows[0], 0.12);
        for (let y = ground + 4; y < h; y += 6) {
          g.beginPath();
          const off = rng() * w;
          g.moveTo(off, y);
          g.lineTo(off + 20 + rng() * 60, y);
          g.stroke();
        }
      }

      // Fog
      if (city.fog) {
        for (let i = 0; i < 3; i++) {
          const fy = ground - h * (0.06 + i * 0.09);
          const fg = g.createLinearGradient(0, fy - 40, 0, fy + 40);
          fg.addColorStop(0, 'rgba(180,190,210,0)');
          fg.addColorStop(0.5, 'rgba(180,190,210,0.07)');
          fg.addColorStop(1, 'rgba(180,190,210,0)');
          g.fillStyle = fg;
          g.fillRect(0, fy - 40, w, 80);
        }
      }

      // Rain drops
      this.drops = [];
      if (city.rain) {
        const n = Math.round(w / 6);
        for (let i = 0; i < n; i++) {
          this.drops.push({ x: rng() * w, y: rng() * h, l: 8 + rng() * 14, v: 350 + rng() * 300 });
        }
      }

      this.staticLayer = layer;
      this.drawFrame(0);
      this.loop();
    },

    drawLayer(g, rng, o) {
      const city = this.theme.city;
      let x = -rng() * 30;
      while (x < this.w + 20) {
        const bw = o.minW + rng() * (o.maxW - o.minW);
        const bh = (o.base - o.top) * (0.35 + rng() * 0.65);
        const y = o.base - bh;
        g.fillStyle = o.color;
        g.fillRect(x, y, bw, bh + 1);

        if (o.detail) this.roof(g, rng, x, y, bw, bh, o);

        // Windows
        const cw = o.near ? 5 : 3;
        const ch = o.near ? 7 : 4;
        const gapX = o.near ? 9 : 6;
        const gapY = o.near ? 12 : 8;
        for (let wy = y + 10; wy < o.base - 8; wy += gapY) {
          for (let wx = x + 6; wx < x + bw - 6 - cw; wx += gapX) {
            if (rng() < o.windows) {
              const col = city.windows[Math.floor(rng() * city.windows.length)];
              g.fillStyle = hexA(col, 0.35 + rng() * 0.55);
              g.fillRect(wx, wy, cw, ch);
              if (o.near && rng() < 0.02) this.flicker.push({ x: wx, y: wy, w: cw, h: ch, col, on: true });
            }
          }
        }

        // Neon sign on some near buildings
        if (o.near && rng() < 0.22 && bh > 80) {
          const col = city.neon[Math.floor(rng() * city.neon.length)];
          const sw = Math.min(bw - 12, 18 + rng() * 26);
          const sh = 10 + rng() * 26;
          const sx = x + (bw - sw) / 2;
          const sy = y + 18 + rng() * Math.min(60, bh * 0.3);
          g.save();
          g.shadowColor = col;
          g.shadowBlur = 16;
          g.strokeStyle = col;
          g.lineWidth = 2;
          g.strokeRect(sx, sy, sw, sh);
          g.fillStyle = hexA(col, 0.25);
          g.fillRect(sx, sy, sw, sh);
          g.restore();
        }
        x += bw + (o.near ? 2 + rng() * 10 : rng() * 6);
      }
    },

    roof(g, rng, x, y, bw, bh, o) {
      const city = this.theme.city;
      let style = city.style;
      if (style === 'mixed') style = ['spire', 'mansard', 'tower', 'antenna'][Math.floor(rng() * 4)];
      const cx = x + bw / 2;
      g.fillStyle = o.color;
      if (style === 'spire' && rng() < 0.35) {
        g.beginPath();
        g.moveTo(x + bw * 0.2, y);
        g.lineTo(cx, y - bh * 0.22);
        g.lineTo(x + bw * 0.8, y);
        g.fill();
        g.fillRect(cx - 1, y - bh * 0.32, 2, bh * 0.12);
        this.blinker(cx, y - bh * 0.32, rng);
      } else if (style === 'mansard' && rng() < 0.7) {
        g.beginPath();
        g.moveTo(x - 2, y);
        g.lineTo(x + 6, y - 12);
        g.lineTo(x + bw - 6, y - 12);
        g.lineTo(x + bw + 2, y);
        g.fill();
        for (let i = x + 10; i < x + bw - 10; i += 14) g.fillRect(i, y - 20, 4, 9); // chimneys
      } else if (style === 'tower' && rng() < 0.45) {
        g.fillRect(x + bw * 0.25, y - 18, bw * 0.5, 18);
        g.fillRect(x + bw * 0.4, y - 32, bw * 0.2, 14);
        this.blinker(cx, y - 34, rng);
      } else if (style === 'tvtower' && rng() < 0.12 && o.near) {
        const top = y - bh * 0.9;
        g.fillRect(cx - 2, top, 4, bh * 0.9);
        g.beginPath();
        g.arc(cx, top + bh * 0.15, 10, 0, Math.PI * 2);
        g.fill();
        g.fillRect(cx - 1, top - 30, 2, 30);
        this.blinker(cx, top - 30, rng);
      } else if (rng() < 0.45) {
        // antennas and water tanks
        g.fillRect(cx - 1, y - 22, 2, 22);
        if (rng() < 0.6) this.blinker(cx, y - 22, rng);
        if (rng() < 0.4) g.fillRect(x + 6, y - 9, 12, 9);
      }
    },

    blinker(x, y, rng) {
      if (this.blinkers.length < 30) this.blinkers.push({ x, y, p: rng() * 4, rate: 1.2 + rng() * 1.5 });
    },

    loop() {
      cancelAnimationFrame(this.raf);
      if (this.reduced) return;
      const step = (now) => {
        if (now - this.last > 33) {
          // ~30 fps is plenty for a calm background
          const dt = Math.min(0.1, (now - this.last) / 1000);
          this.last = now;
          this.t += dt;
          this.drawFrame(dt);
        }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    },

    drawFrame(dt) {
      const { ctx: g, dpr, w, h, t } = this;
      if (!this.staticLayer) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(this.staticLayer, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const s of this.stars) {
        const a = 0.35 + 0.45 * Math.sin(t * s.s + s.p);
        g.fillStyle = `rgba(230,235,255,${a.toFixed(3)})`;
        g.fillRect(s.x, s.y, s.r, s.r);
      }
      for (const b of this.blinkers) {
        const on = (t * b.rate + b.p) % 2 < 0.35;
        if (!on) continue;
        g.fillStyle = 'rgba(255,70,70,0.95)';
        g.beginPath();
        g.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,70,70,0.18)';
        g.beginPath();
        g.arc(b.x, b.y, 6, 0, Math.PI * 2);
        g.fill();
      }
      // A few windows switch on and off now and then
      for (const f of this.flicker) {
        if (Math.random() < dt * 0.08) f.on = !f.on;
        if (!f.on) {
          g.fillStyle = this.theme.city.near;
          g.fillRect(f.x, f.y, f.w, f.h);
        }
      }
      if (this.drops.length) {
        g.strokeStyle = 'rgba(170,190,230,0.22)';
        g.lineWidth = 1;
        g.beginPath();
        for (const d of this.drops) {
          d.y += d.v * dt;
          d.x -= d.v * dt * 0.12;
          if (d.y > h) {
            d.y = -20;
            d.x = Math.random() * (w + 60);
          }
          g.moveTo(d.x, d.y);
          g.lineTo(d.x - d.l * 0.12, d.y + d.l);
        }
        g.stroke();
      }
    }
  };

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function mix(a, b, t) {
    const x = parseInt(a.slice(1), 16);
    const y = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  return { CITIES, forLevel, Sky, CITY_LEVELS };
})();
