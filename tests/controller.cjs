// DOM/controller integration only. Phaser rendering is stubbed, so these are
// not browser, canvas, GPU, touch-layout or screenshot tests.
// Run with: F033_DOM_TEST_MODULE=/path/to/node_modules/linkedom npm run test:dom
const fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  assert = require('assert');
const ROOT = path.resolve(__dirname, '../dist');
const dependency = process.env.F033_DOM_TEST_MODULE;
if (!dependency) {
  console.error('Set F033_DOM_TEST_MODULE to the installed linkedom package path.');
  process.exit(1);
}
const { parseHTML } = require(dependency);

// Any Phaser game object: every unknown method is chainable and records its args.
function make() {
  const state = {
    x: 0,
    y: 0,
    scaleY: 1,
    anims: { currentAnim: null, isPlaying: false, stop() {} }
  };
  const p = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'symbol') return undefined;
      if (key === 'play')
        return k => {
          target.anims.currentAnim = { key: k };
          return p;
        };
      if (key === 'destroy') return () => (target.destroyed = true);
      return (...args) => {
        target[key + 'Args'] = args;
        return p;
      };
    }
  });
  return p;
}

async function session(Sim, saved = new Map()) {
  const { window, document } = parseHTML(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  let instance;
  let clock = 0;
  class StubScene {
    constructor() {
      this.keys = new Set();
      this.load = {
        on() {},
        image: (id, url) => {
          assert(fs.existsSync(path.join(ROOT, url)), url);
          this.keys.add(id);
        },
        spritesheet: (id, url) => {
          assert(fs.existsSync(path.join(ROOT, url)), url);
          this.keys.add(id);
        }
      };
      this.add = new Proxy({}, { get: () => () => make() });
      this.make = { graphics: () => make() };
      this.textures = {
        get: () => ({ getSourceImage: () => ({ width: 1672, height: 620 }) }),
        createCanvas: () => ({ context: { drawImage() {} }, refresh() {} })
      };
      this.anims = { create() {} };
      this.input = { on() {} };
      this.time = { now: 0, delayedCall: (_, cb) => cb() };
      this.tweens = { killTweensOf() {}, isTweening: () => false, add: cfg => cfg.onComplete?.() };
      this.cameras = { main: { zoom: 1, pan() {}, zoomTo() {}, shake() {}, centerOn() {} } };
      this.game = { canvas: { style: {} }, renderer: { type: 1 } };
    }
  }
  class StubGame {
    constructor(cfg) {
      this.loop = { wake() {}, sleep() {} };
      this.scale = { refresh() {}, getParentBounds() {} };
      instance = new cfg.scene[0]();
      instance.preload();
      setTimeout(() => instance.create(), 0);
    }
  }
  class StubAudio {
    constructor() {
      this._volume = 1;
      this.paused = true;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    set volume(v) {
      assert(Number.isFinite(v) && v >= 0 && v <= 1, 'volume ' + v);
      this._volume = v;
    }
    get volume() {
      return this._volume;
    }
  }
  Object.defineProperty(document, 'hidden', { value: false, writable: true });
  const context = vm.createContext({
    ...Sim,
    document,
    window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
    console,
    Audio: StubAudio,
    Phaser: {
      Scene: StubScene,
      Game: StubGame,
      AUTO: 0,
      CANVAS: 1,
      WEBGL: 2,
      Scale: { FIT: 1, CENTER_BOTH: 1 }
    },
    localStorage: { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) },
    navigator: {},
    performance: { now: () => clock },
    structuredClone,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: cb => setTimeout(() => cb(0), 0),
    location: { search: '', reload() {} },
    fetch: async url => ({
      ok: true,
      json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, url), 'utf8'))
    })
  });
  vm.runInContext(
    fs
      .readFileSync(path.join(ROOT, 'app.js'), 'utf8')
      .replace(/^import[\s\S]*?from '\.\/sim\.js';/, ''),
    context
  );
  for (let i = 0; i < 40 && !document.getElementById('boot').hidden; i++)
    await new Promise(r => setTimeout(r, 5));
  assert.equal(document.getElementById('boot').hidden, true, 'controller boot completed');
  const click = selector => {
    const el = document.querySelector(selector);
    assert(el, 'Missing ' + selector);
    assert(!el.disabled, 'Disabled ' + selector);
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
  };
  const key = k => {
    const e = new window.Event('keydown', { bubbles: true });
    e.key = k;
    e.preventDefault = () => {};
    document.body.dispatchEvent(e);
  };
  const advance = seconds => {
    for (let i = 0; i < Math.round(seconds * 10); i++) {
      clock += 100;
      instance.time.now = clock;
      instance.update(clock, 100);
    }
  };
  const text = id => document.getElementById(id).textContent;
  return { document, window, click, key, advance, text, saved };
}

(async () => {
  const Sim = await import(new URL('../dist/sim.js', 'file://' + __filename).href);
  const s = await session(Sim);
  s.click('#title [data-act="new-week"]');
  assert.equal(s.document.getElementById('game').hidden, false);
  assert(s.text('overlay').includes('Opening night'), 'night intro card');
  s.advance(5);
  assert(s.text('clock').includes('11:00'), 'intro card holds the clock');
  s.click('#overlay [data-act="begin"]');
  s.advance(0.2);
  s.key(' ');
  assert(s.document.querySelector('#service [data-act="cook"]'), 'Space takes the order');
  s.key(' ');
  s.advance(8.5);
  assert(s.text('burners').includes('Serve plate'));
  s.click('#burners [data-act="serve"]');
  s.advance(23);
  assert(s.text('streak').startsWith('1'), 'serving a human starts a streak');
  s.click('#table-list [data-id="102"]');
  s.click('#service [data-action="coffee"]');
  s.advance(3);
  assert(!s.text('service').includes('Fresh coffee turns cold'));
  s.advance(1.5);
  assert(s.text('service').includes('Fresh coffee turns cold'));
  assert(s.text('service').includes('Suspicious'), 'evidence board flags one tell');
  s.key('r');
  s.advance(4.5);
  assert(s.text('service').includes('missing from the polished dispenser'));
  assert(s.text('service').includes('Confirmed · Hollow Driver'), 'evidence board confirms');
  s.key('f');
  assert(s.text('toasts').includes('justified'));
  assert(s.text('toasts').includes('Hollow Driver'));
  s.click('#hud [data-act="pause"]');
  s.click('#overlay [data-act="save-menu"]');
  const checkpoint = JSON.parse(s.saved.get('f033-game-v1'));
  assert.equal(checkpoint.state.phase, 'shift');
  assert.equal(checkpoint.progress.lanterns, 3);
  assert.equal(checkpoint.state.streak, 2);

  const t = await session(Sim, s.saved);
  t.click('#title [data-act="settings"]');
  const volume = t.document.querySelector('#volume');
  volume.value = '.2';
  volume.dispatchEvent(new t.window.Event('change', { bubbles: true }));
  assert.equal(
    JSON.parse(t.saved.get('f033-game-v1')).progress.cash,
    checkpoint.progress.cash,
    'settings preserves run'
  );
  const esc = new t.window.Event('keydown', { bubbles: true });
  esc.key = 'Escape';
  volume.dispatchEvent(esc);
  assert.equal(
    t.document.getElementById('overlay').hidden,
    true,
    'Escape closes settings from a focused slider'
  );
  t.click('#title [data-act="continue"]');
  assert.equal(t.document.getElementById('game').hidden, false);
  assert(t.text('overlay').includes('A moment to breathe'), 'continue resumes paused');
  t.click('#overlay [data-act="resume"]');
  t.advance(600);
  assert(t.text('overlay').includes('Shift receipt'));
  assert(t.document.querySelector('#overlay .stars'), 'night rating shown');
  t.key('Escape');
  assert.equal(
    t.document.getElementById('overlay').hidden,
    false,
    'result cannot be dismissed into frozen play'
  );
  t.click('#overlay [data-act="next"]');
  assert(t.text('night').includes('NIGHT 2'));
  assert(t.text('overlay').includes('Downpour'), 'night two conditions');
  assert(JSON.parse(t.saved.get('f033-profile-v1')).stats.nights >= 1, 'profile records nights');

  const report = {
    status: 'passed',
    scope: 'DOM/controller integration with stubbed Phaser renderer',
    checks: [
      'Boot and start menu',
      'Night intro card pauses the clock',
      'Take order, cook and serve through keyboard and DOM buttons',
      'Service streak',
      'Four-second evidence reveals',
      'Evidence board: suspicious then confirmed',
      'Two-clue refusal by keyboard',
      'Pause/save/menu checkpoint',
      'Menu settings preserve save',
      'Escape closes settings from a focused control',
      'Continue resumes paused',
      'Receipt with star rating survives Escape',
      'Next night starts with new conditions',
      'Profile stats persist'
    ],
    browser_rendering_verified: false,
    physical_mobile_verified: false
  };
  fs.mkdirSync(path.join(ROOT, 'verification'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'verification/controller.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
