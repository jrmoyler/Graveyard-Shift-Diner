import {
  Diner,
  RUSH_TIMES,
  SEATS,
  SHIFT_SECONDS,
  INSPECT_SECONDS,
  NIGHT_EVENTS,
  UPGRADE_PRICES,
  normaliseSettings
} from './sim.js';

// ---------------------------------------------------------------------------
// Constants, content tables and small helpers
// ---------------------------------------------------------------------------

const $ = id => document.getElementById(id);
const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const money = n => '$' + Number(n).toFixed(2);
const SAVE = 'f033-game-v1';
const SETTINGS = 'f033-settings-v1';
const PROFILE = 'f033-profile-v1';
const DOT_HOME = { x: 950, y: 535 };
const DOOR = { x: 40, y: 540 };

let model;
let content;
let engine;
let scene;
let overlay = null;
let guideTab = 'hollow-driver';
let sceneReady = false;
let renderClock = 0;
let saveClock = 0;
let lastUI = '';
let resultUnlocks = [];

const displayNames = {
  earl: 'Earl',
  vonda: 'Vonda',
  'pruitt-twins': 'The Pruitt twins',
  'coach-hale': 'Coach Hale',
  ines: 'Ines',
  ricky: 'Ricky'
};
const playerName = c => (c.regularId ? displayNames[c.regularId] : 'Traveler');
const recipe = c => content.recipes.find(r => r.id === c.recipeId);
const seatName = i => (i < 6 ? 'Table ' + (i + 1) : 'Counter ' + (i - 5));
const tableName = c => (c.seat === null ? 'At the door' : seatName(c.seat));
const creatureName = id => content.creatures.find(c => c.id === id)?.name || id;

const tutorial = [
  'Earl is a familiar face. Take his order, then start cooking. (Space does the next step.)',
  'Coffee takes 8 seconds. When the burner glows, serve Earl.',
  "The next guest's coffee feels wrong. Open the field guide (G).",
  'Hollow Drivers show two tells. Check the next guest’s reflection (R).',
  'Two independent tells. The evidence board confirms it — refuse service (F).',
  'You know the routine now. Keep the grill moving and trust evidence.'
];

const observations = {
  'no-reflection': 'The customer is missing from the polished dispenser.',
  'cold-coffee': 'Fresh coffee turns cold instantly. No steam rises.',
  'knows-name': 'The stranger knows Dot’s name without an introduction.',
  'wet-footprints': 'The bootprints remain wet after the floor should have dried.',
  'echo-sentence': 'The guest answers with your previous sentence.',
  'refuses-salt': 'The guest refuses to touch the salt.',
  'extra-knuckles': 'Five fingers—but an extra joint on the middle and ring fingers.',
  'shadow-offset': 'The shadow points eight degrees away from the light.',
  'usual-first-visit': 'A first-time guest orders “the usual.”',
  'drawn-to-neon': 'The guest keeps turning toward the neon.',
  'sleeve-dust': 'Fine wing-like dust coats the sleeves.',
  'never-blinks': 'During the observation, the guest never blinks.',
  'duplicate-regular': 'The guest matches a regular who was already seated.',
  'mirrored-hair': 'The familiar hair part runs the opposite way.',
  'wrong-hand': 'The guest uses the opposite hand from the familiar regular.',
  'no-car': 'No vehicle is waiting for this guest outside.',
  'cold-breath': 'The guest’s breath fogs in the warm diner.',
  'old-coins': 'The payment coins are old and heavily worn.'
};

const actionMeta = {
  hands: { key: 'H', icon: 'hands', short: 'Hands' },
  reflection: { key: 'R', icon: 'reflection', short: 'Reflection' },
  question: { key: 'Q', icon: 'question', short: 'Question' },
  salt: { key: 'S', icon: 'salt', short: 'Salt' },
  coffee: { key: 'C', icon: 'coffee', short: 'Coffee' }
};

const upgrades = [
  [
    'mirror',
    'Counter mirror',
    'Free reflection checks for the two counter seats.',
    'upgrades/mirror'
  ],
  ['bell', 'Door bell', 'A wrong-pitch chime when a Pale Hitcher arrives.', 'props/door-bell'],
  ['burners', 'Extra burners', 'Four additional cooking slots.', 'upgrades/burner-upgrade'],
  ['salt', 'Table salt', 'A free salt observation for each arriving guest.', 'props/salt-pepper'],
  ['cook', 'Hired cook', 'Cooking times reduced by 25%.', 'upgrades/hired-cook-work']
];

const achievements = {
  'first-light': ['First light', 'Survive your first night.'],
  'sharp-eyes': ['Sharp eyes', 'Refuse ten creatures across all runs.'],
  'benefit-doubt': ['Benefit of the doubt', 'Serve a regular after spotting their harmless habit.'],
  'hot-streak': ['Hot streak', 'Reach a service streak of eight.'],
  'perfect-night': ['Perfect night', 'Earn all three stars in a single night.'],
  'full-grill': ['Full grill', 'Keep every burner cooking at once.'],
  'old-friends': ['Old friends', 'Hear a regular’s whole story.'],
  'still-burning': ['Still burning', 'Survive the full seven-night week.'],
  'night-owl': ['Night owl', 'Reach night ten in Endless mode.']
};

// ---------------------------------------------------------------------------
// Persistent profile: lifetime stats and achievements across runs
// ---------------------------------------------------------------------------

const profile = {
  data: {
    achievements: {},
    stats: { creaturesRefused: 0, humansServed: 0, nights: 0, bestStreak: 0, bestEndless: 0 }
  },
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE));
      if (raw && typeof raw === 'object') {
        if (raw.achievements && typeof raw.achievements === 'object')
          for (const id of Object.keys(achievements))
            if (Number.isFinite(raw.achievements[id]))
              this.data.achievements[id] = raw.achievements[id];
        if (raw.stats && typeof raw.stats === 'object')
          for (const key of Object.keys(this.data.stats))
            if (Number.isFinite(raw.stats[key])) this.data.stats[key] = raw.stats[key];
      }
    } catch {}
  },
  save() {
    try {
      localStorage.setItem(PROFILE, JSON.stringify(this.data));
    } catch {}
  },
  bump(key, by = 1) {
    this.data.stats[key] = (this.data.stats[key] || 0) + by;
  },
  max(key, value) {
    this.data.stats[key] = Math.max(this.data.stats[key] || 0, value);
  },
  unlock(id) {
    if (!achievements[id] || this.data.achievements[id]) return;
    this.data.achievements[id] = Date.now();
    this.save();
    resultUnlocks.push(id);
    toast('Achievement unlocked · ' + achievements[id][0], 'achievement');
    audio.play('sfx-register');
  }
};

// ---------------------------------------------------------------------------
// Audio: looping beds, pooled one-shots and an inspection duck
// ---------------------------------------------------------------------------

class AudioDesk {
  constructor() {
    this.tracks = {};
    this.pool = {};
    this.duck = 1;
  }
  play(id, gain = 1) {
    if (!model?.settings.volume) return;
    const list = (this.pool[id] ||= []);
    let a = list.find(x => x.paused || x.ended);
    if (!a) {
      if (list.length >= 4) return;
      a = new Audio('assets/audio/' + id + '.ogg');
      list.push(a);
    }
    a.volume = Math.min(1, model.settings.volume * (id === 'sfx-refuse-door' ? 0.5 : 0.65) * gain);
    try {
      a.currentTime = 0;
    } catch {}
    a.play()?.catch?.(() => {});
  }
  start() {
    for (const id of [
      'music-jukebox',
      'music-dread-drone',
      'sfx-neon-buzz',
      'amb-fluorescent',
      'amb-road-wind'
    ]) {
      const a = this.tracks[id] || (this.tracks[id] = new Audio('assets/audio/' + id + '.ogg'));
      a.loop = true;
      a.play()?.catch?.(() => {});
    }
    this.mix();
  }
  mix() {
    if (!model) return;
    // Music sits back while Dot concentrates on an inspection.
    this.duck += ((model.busy ? 0.45 : 1) - this.duck) * 0.15;
    const v = model.settings.volume;
    const levels = {
      'music-jukebox': model.settings.music ? 0.38 * this.duck : 0,
      'music-dread-drone': (0.18 * model.s.dread) / 100,
      'sfx-neon-buzz': 0.055,
      'amb-fluorescent': 0.05,
      'amb-road-wind':
        0.06 + (model.eventId === 'downpour' || model.eventId === 'fogbank' ? 0.08 : 0)
    };
    for (const [id, a] of Object.entries(this.tracks)) {
      a.volume = Math.min(1, v * (levels[id] ?? 0));
      if (id === 'music-jukebox') a.playbackRate = 1 - 0.05 * (3 - model.progress.lanterns);
    }
  }
  pause() {
    Object.values(this.tracks).forEach(a => a.pause());
    Object.values(this.pool)
      .flat()
      .forEach(a => a.pause());
  }
}
const audio = new AudioDesk();

function haptic(pattern) {
  if (model?.settings.haptics && !model.settings.reducedMotion) navigator.vibrate?.(pattern);
}

// ---------------------------------------------------------------------------
// Toasts, captions, banners
// ---------------------------------------------------------------------------

function toast(text, kind = '') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  }, 4200);
}

function caption(s) {
  $('caption').textContent = model.settings.subtitles ? s : '';
}

let bannerTimer;
function banner(text, kind = '') {
  const el = $('banner');
  el.textContent = text;
  el.className = kind;
  el.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (el.hidden = true), 2600);
}

// ---------------------------------------------------------------------------
// Save / settings
// ---------------------------------------------------------------------------

function save() {
  try {
    if (model.s.phase === 'menu') {
      const previous = readSave();
      if (previous) {
        previous.settings = model.settings;
        localStorage.setItem(SAVE, JSON.stringify(previous));
      }
    } else localStorage.setItem(SAVE, JSON.stringify(model.export()));
    localStorage.setItem(SETTINGS, JSON.stringify(model.settings));
  } catch {
    toast('This browser could not save progress. Keep this tab open.', 'bad');
  }
}

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE));
  } catch {
    return null;
  }
}

function settings() {
  document.body.classList.toggle('grain', !model.settings.grainOff);
  document.body.classList.toggle('contrast', model.settings.highContrast);
  document.body.classList.toggle('reduced-motion', model.settings.reducedMotion);
  scene?.applyCinematic();
  audio.mix();
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

const PAUSING = ['pause', 'settings', 'intro', 'controls', 'records'];

function syncPause() {
  model.s.paused = document.hidden || PAUSING.includes(overlay);
  if (model.s.paused) audio.pause();
  else if (model.s.phase === 'shift') audio.start();
}

function openOverlay(name) {
  overlay = name;
  if (name === 'guide') model.guideOpened();
  syncPause();
  renderOverlay();
  render(true);
}

function closeOverlay(force = false) {
  if (overlay === 'result' && !force) return;
  overlay = null;
  $('overlay').hidden = true;
  $('game').inert = false;
  $('title').inert = false;
  syncPause();
  lastUI = '';
  render(true);
}

function button(action, label, disabled = false, extra = '') {
  return (
    '<button data-act="' +
    action +
    '" ' +
    (disabled ? 'disabled ' : '') +
    extra +
    '>' +
    label +
    '</button>'
  );
}

const kbd = k => '<kbd>' + k + '</kbd>';
const icon = (name, cls = 'icon') =>
  '<img class="' + cls + '" src="assets/ui/icons/' + name + '.svg" alt="">';

function start(mode) {
  closeOverlay(true);
  resultUnlocks = [];
  model.newRun(mode, mode === 'endless' ? (Date.now() >>> 0) % 100000 : 33033);
  engine.loop.wake();
  scene?.resetNight();
  save();
  render(true);
  openOverlay('intro');
}

function continueGame() {
  const saved = readSave();
  if (!saved) return;
  try {
    model.restore(saved);
  } catch {
    toast('The save was invalid. Start a new week.', 'bad');
    return;
  }
  overlay = null;
  $('overlay').hidden = true;
  settings();
  engine.loop.wake();
  scene?.resetNight();
  if (['summary', 'fired', 'dark', 'win'].includes(model.s.phase)) {
    overlay = 'result';
    renderOverlay();
    engine.loop.sleep();
  } else if (model.s.phase === 'shift') {
    render(true);
    openOverlay('pause');
    return;
  }
  render(true);
}

function stars(list, animate) {
  const labels = [
    'Rent paid outright',
    'Clean judgement: no creature served, no human refused',
    'Full service: nobody walked out'
  ];
  return (
    '<div class="stars' +
    (animate ? ' animate' : '') +
    '">' +
    list
      .map(
        (on, i) =>
          '<span class="star ' +
          (on ? 'on' : '') +
          '" style="--i:' +
          i +
          '" title="' +
          labels[i] +
          '">★</span>'
      )
      .join('') +
    '</div><ul class="star-key">' +
    list
      .map(
        (on, i) =>
          '<li class="' + (on ? 'on' : '') + '">' + (on ? '★ ' : '☆ ') + labels[i] + '</li>'
      )
      .join('') +
    '</ul>'
  );
}

function eventChips(ev) {
  const chip = (v, label, good) =>
    v === 1 ? '' : '<span class="chip ' + (good ? 'good' : 'bad') + '">' + label + '</span>';
  return (
    chip(ev.patience, 'Patience drain ×' + ev.patience, ev.patience < 1) +
    chip(ev.tips, 'Tips ×' + ev.tips, ev.tips > 1) +
    chip(ev.cook, 'Grill time ×' + ev.cook, ev.cook < 1) +
    (ev.creatures ? '<span class="chip bad">More creatures</span>' : '')
  );
}

function renderOverlay() {
  if (!overlay) {
    $('overlay').hidden = true;
    return;
  }
  $('overlay').hidden = false;
  $('game').inert = true;
  $('title').inert = true;
  let body = '';
  let title = '';
  let narrow = false;
  let cls = '';
  const p = model.progress;

  if (overlay === 'intro') {
    const ev = model.event;
    title = 'Night ' + p.night + (p.mode === 'week' ? ' of 7' : ' · Endless');
    narrow = true;
    cls = 'intro';
    body =
      '<p class="eyebrow">TONIGHT’S CONDITIONS</p><h3 class="event-name">' +
      esc(ev.name) +
      '</h3><p>' +
      esc(ev.blurb) +
      '</p><div class="chips">' +
      (eventChips(ev) || '<span class="chip">Standard service</span>') +
      '</div><dl class="intro-facts"><dt>Rent due at 5 a.m.</dt><dd>' +
      money(model.rent) +
      '</dd><dt>Guests expected</dt><dd>' +
      (model.s.plan.length + model.s.customers.length) +
      '</dd><dt>Rushes</dt><dd>' +
      RUSH_TIMES.map(t => clockText(t)).join(' · ') +
      '</dd><dt>Lanterns</dt><dd>' +
      p.lanterns +
      ' / 3</dd></dl>' +
      (p.night === 1
        ? '<p class="quiet">Tip: Space always performs the next step for the selected guest.</p>'
        : '') +
      '<div class="actions">' +
      button('begin', 'Open the doors', false, 'data-focus') +
      '</div>';
  } else if (overlay === 'pause') {
    title = 'A moment to breathe';
    narrow = true;
    body =
      '<p>The shift clock is paused at ' +
      clockText() +
      '.</p><div class="actions">' +
      button('resume', 'Resume', false, 'data-focus') +
      button('settings', 'Settings') +
      button('controls', 'Controls') +
      '</div><div class="actions">' +
      button('save-menu', 'Save & return to menu', false, 'class="secondary"') +
      '</div>';
  } else if (overlay === 'settings') {
    title = 'Settings';
    narrow = true;
    body =
      '<label class="setting">Volume<input id="volume" data-setting="volume" type="range" min="0" max="1" step=".05" value="' +
      model.settings.volume +
      '"></label>';
    const groups = [
      [
        'Audio & visuals',
        [
          ['music', 'Jukebox music'],
          ['cinematic', 'Cinematic lighting (bloom, vignette, grading)'],
          ['flickerOff', 'Flicker off'],
          ['grainOff', 'Grain off']
        ]
      ],
      [
        'Assists',
        [
          ['evidenceBoard', 'Evidence board deductions'],
          ['slowPatience', 'Patience slows 25%'],
          ['subtitles', 'Sound captions']
        ]
      ],
      [
        'Accessibility',
        [
          ['highContrast', 'High contrast'],
          ['reducedMotion', 'Reduced motion'],
          ['haptics', 'Vibration on supported devices']
        ]
      ]
    ];
    for (const [heading, list] of groups) {
      body += '<h3 class="setting-group">' + heading + '</h3>';
      for (const [key, label] of list)
        body +=
          '<label class="setting">' +
          label +
          '<input type="checkbox" data-setting="' +
          key +
          '" ' +
          (model.settings[key] ? 'checked' : '') +
          '></label>';
    }
    body += '<p class="quiet">Visual settings never remove the textual evidence.</p>';
  } else if (overlay === 'controls') {
    title = 'Controls';
    narrow = true;
    const rows = [
      ['1 – 8', 'Select a table or counter seat'],
      ['← / →', 'Cycle between guests'],
      ['Space', 'Next step: take order, start cooking or serve'],
      ['H R Q S C', 'Inspect hands, reflection, question, salt, coffee'],
      ['E / F', 'Serve / refuse'],
      ['G', 'Field guide (the shift keeps running)'],
      ['Esc / P', 'Pause'],
      [
        'Gamepad',
        'A next step · Y refuse · X guide · LB/RB cycle · D-pad + RT inspect · Start pause'
      ]
    ];
    body =
      '<dl class="controls">' +
      rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') +
      '</dl>';
  } else if (overlay === 'records') {
    title = 'Records';
    const st = profile.data.stats;
    const got = Object.keys(profile.data.achievements).length;
    const saved = readSave();
    const starMap = saved?.progress?.stars || {};
    body =
      '<div class="records-grid"><div class="record"><strong>' +
      (st.nights || 0) +
      '</strong><span>nights closed</span></div>' +
      '<div class="record"><strong>' +
      (st.creaturesRefused || 0) +
      '</strong><span>creatures refused</span></div>' +
      '<div class="record"><strong>' +
      (st.humansServed || 0) +
      '</strong><span>guests served</span></div>' +
      '<div class="record"><strong>' +
      (st.bestStreak || 0) +
      '</strong><span>best streak</span></div>' +
      '<div class="record"><strong>' +
      (st.bestEndless || 0) +
      '</strong><span>best endless night</span></div></div>' +
      (Object.keys(starMap).length
        ? '<h3>Current run</h3><p class="star-row">' +
          Object.entries(starMap)
            .map(
              ([n, s]) =>
                '<span>Night ' + esc(n) + ' ' + '★'.repeat(s) + '☆'.repeat(3 - s) + '</span>'
            )
            .join('') +
          '</p>'
        : '') +
      '<h3>Achievements · ' +
      got +
      ' / ' +
      Object.keys(achievements).length +
      '</h3><ul class="achievements">' +
      Object.entries(achievements)
        .map(
          ([id, [name, desc]]) =>
            '<li class="' +
            (profile.data.achievements[id] ? 'got' : '') +
            '"><strong>' +
            (profile.data.achievements[id] ? '★ ' : '☆ ') +
            esc(name) +
            '</strong><span>' +
            esc(desc) +
            '</span></li>'
        )
        .join('') +
      '</ul>';
  } else if (overlay === 'credits') {
    title = 'Credits';
    narrow = true;
    body =
      '<h3>Graveyard Shift Diner · Fusion F033</h3><p>Concept: John-Ross Moyler · Collective AI Inc.</p><p>Hand-painted asset family generated for this project. Original synthesized organ music and foley. Engine: Phaser 3.90.0.</p><p>Pacifico and IBM Plex Mono, distributed under the SIL Open Font License.</p><p><a href="PHASER-LICENSE.md" target="_blank" rel="noopener">Phaser license</a> · <a href="assets/fonts/Pacifico-OFL.txt" target="_blank" rel="noopener">Pacifico license</a> · <a href="assets/fonts/IBMPlexMono-OFL.txt" target="_blank" rel="noopener">IBM Plex Mono license</a></p><p><a href="graveyard-shift-diner-game.zip" download>Download the portable game build</a></p>';
  } else if (overlay === 'guide') {
    title = 'Field guide';
    const unlocked = content.creatures.filter(c => p.guide.includes(c.id));
    const c = unlocked.find(c => c.id === guideTab);
    const r = content.regulars.find(r => r.id === guideTab);
    let page;
    if (c)
      page =
        '<img src="assets/characters/seated/' +
        c.id +
        '.png" alt="' +
        esc(c.name) +
        '"><h3>' +
        esc(c.name) +
        '</h3><p>Each encounter carries exactly two of these three tells.</p><ol>' +
        c.tells
          .map(t => {
            const action = content.tells.find(x => x.id === t)?.action;
            return (
              '<li>' +
              esc(observations[t]) +
              ' <span class="tag">' +
              esc(actionMeta[action]?.short || action) +
              '</span></li>'
            );
          })
          .join('') +
        '</ol><p class="quiet">One unusual trait can be harmless. Find independent evidence.</p>';
    else if (r) {
      const exception = p.exceptions[r.id] || [];
      const steps = p.stories[r.id] || 0;
      page =
        '<h3>' +
        esc(displayNames[r.id]) +
        '</h3><p>Regular · a person with a history.</p><p>' +
        ((r.id === 'earl' || exception.length) && r.false_tell
          ? 'Known harmless habit: ' + esc(observations[r.false_tell])
          : 'Record observed exceptions during service.') +
        '</p><h4>Stories remembered · ' +
        steps +
        ' / 5</h4><ul>' +
        r.story_steps
          .slice(0, steps)
          .map(s => '<li>' + esc(s) + '</li>')
          .join('') +
        '</ul>' +
        (steps ? '' : '<p class="quiet">Serve this regular well to learn their story.</p>');
    } else {
      guideTab = unlocked[0]?.id;
      page = '<p>Select an entry.</p>';
    }
    body =
      '<p class="quiet">' +
      (model.s.phase === 'shift'
        ? 'The shift keeps running while you read.'
        : 'New entries arrive as the week progresses.') +
      '</p><div class="guide-layout"><nav class="guide-nav"><h3>Creatures</h3>' +
      unlocked
        .map(c =>
          button(
            'guide-entry',
            esc(c.name),
            false,
            'data-id="' + c.id + '"' + (c.id === guideTab ? ' class="selected"' : '')
          )
        )
        .join('') +
      '<h3>Regulars</h3>' +
      content.regulars
        .map(r =>
          button(
            'guide-entry',
            esc(displayNames[r.id]),
            false,
            'data-id="' + r.id + '"' + (r.id === guideTab ? ' class="selected"' : '')
          )
        )
        .join('') +
      '</nav><article class="guide-page">' +
      page +
      '</article></div>';
  } else if (overlay === 'result') {
    const r = model.s.receipt;
    const phase = model.s.phase;
    cls = 'result ' + phase;
    title =
      phase === 'dark'
        ? 'The diner goes dark'
        : phase === 'fired'
          ? 'The last shift'
          : phase === 'win'
            ? 'Seven nights. Still burning.'
            : 'Closing time';
    const outcome =
      phase === 'dark'
        ? 'Every Lantern is gone. The diner belongs to the road now.'
        : phase === 'fired'
          ? 'A second rent loan ends your week.'
          : phase === 'win'
            ? 'You kept the doors open and the light alive.'
            : 'Count the receipts, improve the diner, then return for another shift.';
    const rows = [
      [
        'Night',
        r.night + (r.event && NIGHT_EVENTS[r.event] ? ' · ' + NIGHT_EVENTS[r.event].name : '')
      ],
      ['Sales', money(r.sales)],
      ['Tips', money(r.tips)],
      ['Wrong refusals', '−' + money(r.lostSales)],
      ['Rent', '−' + money(r.rent)],
      ['Rent loan', r.loan ? 'Yes · reputation −10' : 'None'],
      ['Human guests served', r.humansServed],
      ['Creatures refused', r.creaturesRefused],
      ['Humans wrongly refused', r.humansRefused],
      ['Customers walked out', r.walkouts],
      ['Best streak', r.bestStreak ?? 0],
      ['Lanterns lost', r.lanternsLost]
    ];
    body =
      '<p>' +
      outcome +
      '</p>' +
      (r.stars ? stars(r.stars, !model.settings.reducedMotion) : '') +
      '<div class="receipt"><h2>Shift receipt</h2><dl>' +
      rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') +
      '</dl><hr><dl><dt>Cash left</dt><dd data-count="' +
      p.cash +
      '">' +
      money(p.cash) +
      '</dd><dt>Reputation</dt><dd>' +
      p.reputation +
      '</dd><dt>Lanterns</dt><dd>' +
      p.lanterns +
      ' / 3</dd></dl></div>';
    if (resultUnlocks.length)
      body +=
        '<div class="unlocks"><h3>Unlocked tonight</h3>' +
        resultUnlocks
          .map(id => '<span class="chip good">★ ' + esc(achievements[id][0]) + '</span>')
          .join('') +
        '</div>';
    if (phase === 'summary') {
      body +=
        '<h2 class="between">Between shifts</h2><div class="upgrades">' +
        upgrades
          .map(([id, name, desc, art]) => {
            const own = p.upgrades.includes(id);
            const price = UPGRADE_PRICES[id];
            return (
              '<article class="upgrade ' +
              (own ? 'owned' : '') +
              '"><img src="assets/' +
              art +
              '.png" alt=""><div><h3>' +
              name +
              '</h3><p>' +
              desc +
              '</p>' +
              button(
                'buy',
                own ? 'Installed' : 'Install · $' + price,
                own || p.cash < price,
                'data-id="' + id + '"'
              ) +
              '</div></article>'
            );
          })
          .join('') +
        '</div><div class="actions">' +
        button('next', 'Open for night ' + (p.night + 1), false, 'data-focus') +
        button('save-menu', 'Save & return to menu', false, 'class="secondary"') +
        '</div>';
    } else
      body +=
        '<div class="actions">' +
        button('new-week', 'New week', false, 'data-focus') +
        button('new-endless', 'Endless mode') +
        button('save-menu', 'Return to menu', false, 'class="secondary"') +
        '</div>';
  }
  $('overlay').innerHTML =
    '<section class="modal ' +
    (narrow ? 'narrow ' : '') +
    cls +
    '" role="dialog" aria-modal="true" aria-label="' +
    esc(title) +
    '"><div class="modal-header"><h2>' +
    title +
    '</h2>' +
    (['result', 'intro'].includes(overlay)
      ? ''
      : button('close', '×', false, 'aria-label="Close dialog" class="secondary close"')) +
    '</div>' +
    body +
    '</section>';
  if (overlay === 'result' && !model.settings.reducedMotion)
    countUp($('overlay').querySelector('[data-count]'));
  (
    $('overlay').querySelector('[data-focus]') ||
    $('overlay').querySelector('button:not([disabled]):not(.close),input')
  )?.focus({ preventScroll: true });
  $('overlay').scrollTop = 0;
}

function countUp(el) {
  if (!el) return;
  const target = Number(el.dataset.count);
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 900);
    el.textContent = money(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// HUD and panels
// ---------------------------------------------------------------------------

function clockText(t = model.s.time) {
  const minute = Math.floor((t / SHIFT_SECONDS) * 360) + 23 * 60;
  const hour = Math.floor(minute / 60) % 24;
  return (
    (hour % 12 || 12) + ':' + String(minute % 60).padStart(2, '0') + ' ' + (hour < 12 ? 'AM' : 'PM')
  );
}

function patienceColour(p) {
  return p > 35 ? 'var(--ok)' : p > 15 ? 'var(--amber)' : 'var(--red)';
}

function statusOf(c) {
  if (c.state === 'lingering') return 'Will not leave';
  if (c.state === 'eating') return 'Eating';
  if (c.state === 'queued') return 'At the door';
  if (c.ready) return 'Plate ready';
  if (c.state === 'waiting')
    return model.s.jobs.some(j => j.customer === c.id) ? 'On the grill' : 'Order taken';
  return 'Wants to order';
}

const verdictText = {
  unknown: ['Unread', 'No evidence yet.'],
  suspicious: ['Suspicious', 'One tell. It may be a harmless habit — find a second.'],
  cleared: ['Cleared', 'No creature fits the evidence. Safe to serve.'],
  confirmed: ['Confirmed', 'Two independent tells. Refuse service.']
};

// Rebuild a container's HTML without losing keyboard focus on equivalent controls.
function patch(el, html) {
  if (el._html === html) return;
  el._html = html;
  const active = document.activeElement;
  const key =
    active && el.contains(active) && active.dataset.act
      ? [active.dataset.act, active.dataset.action || '', active.dataset.id || '']
      : null;
  el.innerHTML = html;
  if (key) {
    const sel = '[data-act="' + key[0] + '"]' + (key[1] ? '[data-action="' + key[1] + '"]' : '');
    const next =
      [...el.querySelectorAll(sel)].find(b => !key[2] || b.dataset.id === key[2]) ||
      el.querySelector(sel);
    next?.focus({ preventScroll: true });
  }
}

function renderMenu() {
  const exists = readSave();
  $('menu-actions').innerHTML =
    (exists && exists.state?.phase !== 'menu'
      ? button(
          'continue',
          'Continue · night ' + (exists.progress?.night ?? 1),
          false,
          'class="primary"'
        )
      : '') +
    button('new-week', 'Start a new week', false, exists ? '' : 'class="primary"') +
    button('new-endless', 'Endless shift') +
    '<div class="menu-row">' +
    button('records', 'Records') +
    button('settings', 'Settings') +
    button('controls', 'Controls') +
    button('credits', 'Credits') +
    '</div>';
  const st = profile.data.stats;
  const got = Object.keys(profile.data.achievements).length;
  $('menu-records').textContent = st.nights
    ? 'Nights closed: ' +
      st.nights +
      ' · Best streak: ' +
      st.bestStreak +
      ' · Achievements ' +
      got +
      '/' +
      Object.keys(achievements).length
    : 'One shift: 10 minutes · Seven nights to survive';
}

function render(force = false) {
  if (!model || !sceneReady) return;
  const menu = model.s.phase === 'menu';
  const wasHidden = $('game').hidden;
  $('title').hidden = !menu;
  $('game').hidden = menu;
  if (!menu && wasHidden && engine?.scale)
    requestAnimationFrame(() => {
      engine.scale.getParentBounds();
      engine.scale.refresh();
    });
  if (menu) {
    renderMenu();
    return;
  }
  const s = model.s;
  const p = model.progress;
  $('cash').textContent = money(p.cash) + ' / ' + money(model.rent);
  $('rent-meter').style.width = Math.min(100, (p.cash / model.rent) * 100) + '%';
  $('rent-meter').classList.toggle('full', p.cash >= model.rent);
  $('night').textContent = 'NIGHT ' + p.night + (p.mode === 'week' ? ' / 7' : ' · ENDLESS');
  $('clock').textContent = clockText();
  $('shift-meter').style.width = (s.time / SHIFT_SECONDS) * 100 + '%';
  $('rep').textContent = p.reputation + ' / 100';
  patch(
    $('lanterns'),
    [0, 1, 2]
      .map(
        i =>
          '<img class="lantern ' +
          (i < p.lanterns ? 'lit' : 'out') +
          '" src="assets/ui/icons/lantern.svg" alt="">'
      )
      .join('') +
      '<span class="sr-only">' +
      p.lanterns +
      ' of 3</span>'
  );
  $('streak').textContent =
    (s.streak || 0) + (s.streak ? ' · tips ×' + model.streakBonus.toFixed(1) : '');
  $('streak-box').classList.toggle('hot', s.streak >= 3);
  $('dread').textContent =
    'DREAD ' + Math.round(s.dread) + ' / 100' + (s.dread > 50 ? ' · patience drains faster' : '');
  $('dread-meter').style.width = s.dread + '%';
  $('dread-veil').style.opacity = String(Math.min(0.85, s.dread / 100));
  $('event-chip').textContent = model.event.name;
  const toClose = Math.max(0, Math.ceil((SHIFT_SECONDS - s.time) / 60));
  $('arrival-count').textContent =
    s.plan.length + ' arrivals left · ' + toClose + ' min until close';
  $('tutorial').textContent =
    s.tutorial && !s.tutorial.done
      ? tutorial[s.tutorial.step]
      : s.time >= 450 && p.night === 7
        ? 'The Night Manager is watching. Three arrivals. Check the evidence.'
        : s.time > 540
          ? 'Last minute. Finish the grill before the lights go out.'
          : '';
  if (s.inspection) {
    const c = model.getCustomer(s.inspection.customer);
    $('scan').hidden = false;
    $('scan-label').textContent =
      'Inspecting ' +
      (c ? playerName(c) : 'guest') +
      ' · ' +
      (actionMeta[s.inspection.action]?.short || s.inspection.action) +
      ' · ' +
      s.inspection.remaining.toFixed(1) +
      's';
    $('scan-meter').style.width = (1 - s.inspection.remaining / INSPECT_SECONDS) * 100 + '%';
  } else $('scan').hidden = true;

  const signature = [
    Math.floor(s.time),
    s.phase,
    s.selected,
    s.streak,
    model.settings.evidenceBoard,
    s.inspection ? Math.ceil(s.inspection.remaining * 4) : '',
    ...s.customers.map(
      c =>
        c.id +
        ':' +
        c.state +
        ':' +
        Math.ceil(c.patience) +
        ':' +
        c.known.join(',') +
        ':' +
        (c.checks || []).join(',') +
        ':' +
        c.ready +
        ':' +
        Math.ceil(c.eating || 0)
    ),
    ...s.jobs.map(j => Math.ceil(j.remaining * 4))
  ].join('|');
  if (!force && signature === lastUI) return;
  lastUI = signature;

  patch(
    $('table-list'),
    SEATS.map((seat, i) => {
      const c = model.active.find(c => c.seat === i);
      if (!c)
        return (
          '<button data-act="select" data-id="0" disabled class="seat empty"><span class="seat-name">' +
          seatName(i) +
          ' <kbd>' +
          (i + 1) +
          '</kbd></span><small>Empty</small></button>'
        );
      const d = model.settings.evidenceBoard ? model.deduce(c) : null;
      const live = ['ordering', 'waiting'].includes(c.state);
      return (
        '<button data-act="select" data-id="' +
        c.id +
        '" class="seat ' +
        (c.id === s.selected ? 'selected ' : '') +
        (c.ready ? 'ready ' : '') +
        (d ? 'v-' + d.status : '') +
        '" aria-pressed="' +
        (c.id === s.selected) +
        '"><span class="seat-name">' +
        seatName(i) +
        ' <kbd>' +
        (i + 1) +
        '</kbd></span>' +
        '<span class="seat-guest">' +
        esc(playerName(c)) +
        (d && d.status !== 'unknown'
          ? '<i class="dot" title="' + verdictText[d.status][0] + '"></i>'
          : '') +
        '</span><small>' +
        statusOf(c) +
        '</small>' +
        (live
          ? '<div class="patience"><span style="width:' +
            (c.patience / 60) * 100 +
            '%;background:' +
            patienceColour(c.patience) +
            '"></span></div>'
          : '') +
        '</button>'
      );
    }).join('')
  );
  patch(
    $('queue'),
    model.active
      .filter(c => c.state === 'queued')
      .map(c =>
        button(
          'select',
          'Guest waiting at the door · ' + Math.ceil(c.patience) + 's',
          false,
          'data-id="' + c.id + '" class="secondary"'
        )
      )
      .join('')
  );
  renderService();
  renderKitchen();
}

function renderService() {
  const s = model.s;
  const c = model.getCustomer(s.selected);
  const usable = c && !['gone', 'refused'].includes(c.state);
  if (!usable) {
    patch(
      $('service'),
      '<h2>Work the floor</h2><p>Select a table or a guest at the door. Take orders, keep the burners moving, and inspect the details before serving.</p><p class="quiet">' +
        kbd('1–8') +
        ' seats · ' +
        kbd('←→') +
        ' cycle · ' +
        kbd('Space') +
        ' next step · ' +
        kbd('H') +
        kbd('R') +
        kbd('Q') +
        kbd('S') +
        kbd('C') +
        ' inspect · ' +
        kbd('E') +
        ' serve · ' +
        kbd('F') +
        ' refuse</p>'
    );
    return;
  }
  const r = recipe(c);
  const busy = model.busy;
  const job = s.jobs.find(j => j.customer === c.id);
  const before = ['ordering', 'waiting', 'queued'].includes(c.state);
  const full = s.jobs.length >= model.burners;
  const checks = c.checks || [];
  const reflected = checks.includes('reflection');
  const step = model.nextStep(c.id);
  let evidence = '';
  if (c.known.includes('extra-knuckles'))
    evidence +=
      '<img class="evidence-image" src="assets/tells/hand-extra-knuckles.png" alt="Five fingers with extra knuckle joints">';
  if (reflected)
    evidence +=
      '<div class="mirror" aria-label="' +
      (c.tells.includes('no-reflection')
        ? 'No customer reflection'
        : 'Customer reflection visible') +
      '">' +
      (c.tells.includes('no-reflection')
        ? ''
        : '<img src="assets/characters/seated/' + c.art + '.png" alt="Reflection">') +
      '</div>';

  let primary;
  if (c.state === 'ordering')
    primary = button(
      'order',
      'Take order ' + kbd('Space'),
      busy,
      'data-id="' + c.id + '" class="primary"'
    );
  else if (c.state === 'waiting' && c.ready)
    primary = button(
      'serve',
      'Serve ' + esc(r.name) + ' ' + kbd('Space'),
      busy,
      'data-id="' + c.id + '" class="primary"'
    );
  else if (c.state === 'waiting')
    primary = button(
      'cook',
      job
        ? 'Cooking · ' + Math.ceil(job.remaining) + 's'
        : full
          ? 'All burners busy'
          : 'Start cooking ' + kbd('Space'),
      busy || Boolean(job) || full,
      'data-id="' + c.id + '" class="primary"'
    );
  else
    primary =
      '<p class="state-note">' +
      esc(
        c.state === 'lingering'
          ? 'The guest will not leave. Their Lantern is already spent.'
          : c.state === 'eating'
            ? 'Eating · ' + Math.ceil(c.eating) + 's until they pay'
            : 'Waiting for a seat.'
      ) +
      '</p>';

  let board = '';
  if (model.settings.evidenceBoard && before) {
    const d = model.deduce(c);
    const [label, note] = verdictText[d.status];
    board =
      '<div class="board v-' +
      d.status +
      '"><div class="board-head"><span class="eyebrow">EVIDENCE BOARD</span><strong>' +
      label +
      (d.status === 'confirmed' ? ' · ' + esc(creatureName(d.candidates[0])) : '') +
      '</strong></div><p>' +
      note +
      '</p>' +
      (d.status === 'suspicious'
        ? '<p class="quiet">Could be: ' +
          d.candidates.map(id => esc(creatureName(id))).join(', ') +
          ', or a harmless human.</p>'
        : '') +
      (d.unchecked.length && d.status !== 'confirmed' && d.status !== 'cleared'
        ? '<p class="quiet">Unchecked: ' +
          d.unchecked.map(a => actionMeta[a]?.short || a).join(' · ') +
          '</p>'
        : '') +
      '</div>';
  }

  patch(
    $('service'),
    '<div class="service-head"><div><span class="eyebrow">' +
      tableName(c) +
      ' · ' +
      statusOf(c) +
      '</span><h2>' +
      esc(playerName(c)) +
      '</h2></div>' +
      (before
        ? '<div class="ring" style="--p:' +
          (c.patience / 60) * 100 +
          ';--c:' +
          patienceColour(c.patience) +
          '" role="img" aria-label="Patience ' +
          Math.ceil(c.patience) +
          ' of 60"><span>' +
          Math.ceil(c.patience) +
          '</span></div>'
        : '') +
      '</div><div class="portrait"><img src="assets/characters/seated/' +
      c.art +
      '.png" alt="Selected guest">' +
      (checks.includes('coffee') && !c.tells.includes('cold-coffee')
        ? '<img class="steam" src="assets/effects/coffee-steam.png" alt="Coffee steam">'
        : '') +
      (c.known.includes('cold-breath')
        ? '<img class="steam" src="assets/effects/cold-breath.png" alt="Cold breath">'
        : '') +
      '</div><div class="order-line"><img src="assets/food/' +
      r.id +
      '.png" alt=""><p>' +
      esc(r.name) +
      '<br><strong>' +
      money(c.price) +
      '</strong></p></div>' +
      '<div class="service-actions">' +
      primary +
      '</div>' +
      '<div class="inspect-actions">' +
      content.actions
        .map(a => {
          const m = actionMeta[a.id];
          const done = checks.includes(a.id);
          const hit = c.known.some(t => content.tells.find(x => x.id === t)?.action === a.id);
          const now = s.inspection?.customer === c.id && s.inspection.action === a.id;
          return button(
            'inspect',
            icon(m.icon) +
              '<span>' +
              esc(a.visible_label) +
              '</span>' +
              kbd(m.key) +
              (done ? '<i class="check">' + (hit ? '!' : '✓') + '</i>' : ''),
            busy || !before,
            'data-id="' +
              c.id +
              '" data-action="' +
              a.id +
              '" class="' +
              (done ? 'done ' : '') +
              (hit ? 'hit ' : '') +
              (now ? 'now' : '') +
              '" aria-keyshortcuts="' +
              m.key +
              '"'
          );
        })
        .join('') +
      '</div><p class="cost">' +
      (busy
        ? 'Inspecting ' +
          esc(actionMeta[s.inspection.action]?.short || s.inspection.action) +
          ' · ' +
          s.inspection.remaining.toFixed(1) +
          's'
        : 'Each check takes 4 seconds. The rest of the diner keeps moving.') +
      '</p>' +
      board +
      '<ul class="clues">' +
      c.known.map(t => '<li>' + esc(observations[t]) + '</li>').join('') +
      (checks.length && !c.known.length
        ? '<li class="normal">No unusual evidence found in the completed checks.</li>'
        : '') +
      '</ul>' +
      evidence +
      (c.line ? '<p class="speech">“' + esc(c.line) + '”</p>' : '') +
      '<div class="final-actions">' +
      button(
        'serve',
        'Serve ' + kbd('E'),
        busy || !c.ready || !before,
        'data-id="' + c.id + '"' + (step === 'serve' ? ' class="primary"' : '')
      ) +
      button(
        'refuse',
        'Refuse ' + kbd('F'),
        busy || !before,
        'data-id="' + c.id + '" class="danger"'
      ) +
      '</div><p class="cost">A wrong refusal costs ' +
      money(c.price) +
      ' and 8 reputation. One tell may be harmless.</p>'
  );
}

function renderKitchen() {
  const s = model.s;
  $('kitchen-label').textContent =
    s.jobs.length +
    ' / ' +
    model.burners +
    ' burners · ' +
    Math.round(model.cookFactor * 100) +
    '% grill time';
  patch(
    $('burners'),
    Array.from({ length: model.burners }, (_, i) => {
      const j = s.jobs[i];
      if (!j)
        return (
          '<div class="burner empty"><span>Burner ' + (i + 1) + '</span><small>free</small></div>'
        );
      const c = model.getCustomer(j.customer);
      const r = recipe(c);
      const pct = ((j.duration - j.remaining) / j.duration) * 100;
      return (
        '<div class="burner ' +
        (j.ready ? 'ready' : 'cooking') +
        '"><div class="burner-art" style="--p:' +
        pct +
        '"><img src="assets/food/' +
        r.id +
        '.png" alt=""></div><div><p>' +
        esc(r.name) +
        '</p><p class="quiet">' +
        tableName(c) +
        ' · ' +
        esc(playerName(c)) +
        '</p>' +
        (j.ready
          ? button('serve', 'Serve plate', model.busy, 'data-id="' + c.id + '" class="primary"')
          : '<p class="timer">' +
            Math.ceil(j.remaining) +
            's</p><div class="meter"><span style="width:' +
            pct +
            '%"></span></div>') +
        '</div></div>'
      );
    }).join('')
  );
}

// ---------------------------------------------------------------------------
// Actions and events
// ---------------------------------------------------------------------------

function cycle(dir) {
  const seated = model.active
    .filter(c => c.seat !== null || c.state === 'queued')
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  if (!seated.length) return;
  const i = seated.findIndex(c => c.id === model.s.selected);
  const next = seated[(i + dir + seated.length) % seated.length];
  model.select(next.id);
  render(true);
}

function act(action, el) {
  const id = Number(el?.dataset?.id) || model.s.selected;
  if (action === 'new-week' || action === 'new-endless') {
    if (model.s.phase === 'shift') save();
    start(action === 'new-week' ? 'week' : 'endless');
    return;
  }
  if (action === 'continue') return continueGame();
  if (action === 'pause') return openOverlay('pause');
  if (['settings', 'credits', 'guide', 'controls', 'records'].includes(action))
    return openOverlay(action);
  if (action === 'resume' || action === 'close') return closeOverlay();
  if (action === 'begin') {
    closeOverlay(true);
    banner('Night ' + model.progress.night + ' · ' + model.event.name, 'intro');
    return;
  }
  if (action === 'guide-entry') {
    guideTab = el.dataset.id;
    renderOverlay();
    return;
  }
  if (action === 'save-menu') {
    save();
    closeOverlay(true);
    model.s.phase = 'menu';
    audio.pause();
    engine.loop.sleep();
    render(true);
    return;
  }
  if (action === 'next') {
    closeOverlay(true);
    resultUnlocks = [];
    if (model.nextNight()) {
      engine.loop.wake();
      scene?.resetNight();
      save();
      render(true);
      openOverlay('intro');
      return;
    }
    render(true);
    return;
  }
  if (action === 'buy') {
    if (model.buy(el.dataset.id)) {
      audio.play('sfx-register');
      save();
      renderOverlay();
    }
    return;
  }
  if (action === 'select') {
    if (id) model.select(id);
    render(true);
    return;
  }
  if (model.s.phase !== 'shift' || overlay) return;
  let ok = false;
  if (action === 'next-step') {
    const step = model.nextStep(id);
    if (step) return act(step, { dataset: { id: String(id) } });
  }
  if (action === 'order') ok = model.order(id);
  if (action === 'cook') ok = model.cook(id);
  if (action === 'serve') ok = model.serve(id);
  if (action === 'refuse') ok = model.refuse(id);
  if (action === 'inspect') ok = model.inspect(id, el.dataset.action);
  if (!ok) {
    const c = model.getCustomer(id);
    toast(
      model.busy
        ? 'Finish the current inspection first.'
        : !c || ['gone', 'refused'].includes(c.state)
          ? 'Select a guest first.'
          : action === 'cook' && model.s.jobs.length >= model.burners
            ? 'Every burner is busy.'
            : action === 'serve' || action === 'next-step'
              ? c.state === 'waiting'
                ? 'The plate is not ready yet.'
                : 'Nothing to do for this guest right now.'
              : 'That action is not available yet.'
    );
  }
  processEvents();
  render(true);
}

function processEvents() {
  for (const e of model.drain()) {
    const c = e.id ? model.getCustomer(e.id) : null;
    if (e.type === 'bell') {
      audio.play(e.wrong ? 'sfx-wrong-bell' : 'sfx-door-bell');
      caption(e.wrong ? 'The door bell rings at the wrong pitch.' : 'The door bell rings.');
    }
    if (e.type === 'arrival') scene?.arrive(c);
    if (e.type === 'cook') {
      audio.play('sfx-grill-sizzle');
      scene?.dotAction('pour', e.id);
      if (e.full && model.burners >= 4) profile.unlock('full-grill');
    }
    if (e.type === 'order') scene?.dotAction('idle', e.id);
    if (e.type === 'serve') {
      audio.play('sfx-plate-set');
      scene?.dotAction('serve', e.id);
      caption('A plate is set down.');
      if (!e.creature) profile.bump('humansServed');
      if (e.habit) profile.unlock('benefit-doubt');
    }
    if (e.type === 'inspect') {
      scene?.dotAction('inspect', e.id);
      scene?.focusSeat(c);
    }
    if (e.type === 'inspected') {
      scene?.focusSeat(null);
      scene?.dotAction('idle');
    }
    if (e.type === 'reveal' && !e.free && e.found.length) {
      scene?.floatText(c, 'Tell found', '#f2b84b');
      const d = model.deduce(c);
      if (d.status === 'confirmed' && model.settings.evidenceBoard) {
        haptic(40);
        scene?.floatText(c, 'Confirmed: ' + creatureName(d.candidates[0]), '#ff6b75', 40);
      }
    }
    if (e.type === 'ready') {
      caption('A plate is ready on the grill.');
      scene?.pulse(c);
    }
    if (e.type === 'pay') {
      audio.play('sfx-register');
      caption('The register rings.');
      scene?.floatText(c, '+' + money(e.amount), '#9fe0a4');
      if (c?.state === 'gone') scene?.leave(c, false);
    }
    if (e.type === 'refuse') {
      audio.play('sfx-refuse-door');
      scene?.dotAction('refuse', e.id);
      scene?.leave(c, true);
      if (e.correct) {
        profile.bump('creaturesRefused');
        if (profile.data.stats.creaturesRefused >= 10) profile.unlock('sharp-eyes');
        scene?.floatText(c, 'Justified', '#7fd3d6');
        toast('The refusal was justified. It was a ' + creatureName(e.creature) + '.', 'good');
      } else {
        haptic([60, 40, 60]);
        scene?.time.delayedCall(950, () => scene.dotAction('flinch'));
        scene?.shake(0.004);
        scene?.floatText(c, '−' + money(e.price) + ' · −8 rep', '#ff6b75');
        toast('That was a human. Lost ' + money(e.price) + ' and 8 reputation.', 'bad');
      }
    }
    if (e.type === 'streak') {
      profile.max('bestStreak', e.streak);
      if (e.streak >= 8) profile.unlock('hot-streak');
      banner('Streak ×' + e.streak + ' · tips ×' + model.streakBonus.toFixed(1), 'streak');
    }
    if (e.type === 'streak-lost') caption('The service streak is broken.');
    if (e.type === 'rush') {
      banner('Rush incoming · headlights on Route 9', 'rush');
      audio.play('sfx-door-bell', 0.6);
      haptic(30);
    }
    if (e.type === 'story' && e.line) {
      toast(e.line, 'story');
      if (e.complete) profile.unlock('old-friends');
    }
    if (e.type === 'walkout') {
      caption('An impatient guest leaves.');
      scene?.floatText(c, 'Walked out', '#ff6b75');
      scene?.leave(c, false);
    }
    if (e.type === 'close') {
      if (e.lost) {
        audio.play('sfx-lantern-gutter');
        haptic([80, 60, 120]);
        scene?.shake(0.007);
        caption(e.lost + ' Lantern' + (e.lost === 1 ? '' : 's') + ' goes out.');
      }
      profile.bump('nights');
      if (e.phase !== 'dark' && e.phase !== 'fired') profile.unlock('first-light');
      if (e.stars === 3) profile.unlock('perfect-night');
      if (e.phase === 'win') profile.unlock('still-burning');
      if (model.progress.mode === 'endless') {
        profile.max('bestEndless', model.progress.night);
        if (model.progress.night >= 10) profile.unlock('night-owl');
      }
      profile.save();
      save();
      audio.pause();
      overlay = 'result';
      renderOverlay();
      engine.loop.sleep();
    }
  }
}

// ---------------------------------------------------------------------------
// Gamepad
// ---------------------------------------------------------------------------

const pad = { prev: [] };
function pollGamepad() {
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!gp || !model) return;
  const down = gp.buttons.map(b => b.pressed);
  const hit = i => down[i] && !pad.prev[i];
  pad.prev = down;
  if (hit(9)) return overlay ? closeOverlay() : model.s.phase === 'shift' && openOverlay('pause');
  const root = overlay ? $('overlay') : model.s.phase === 'menu' ? $('title') : null;
  if (root) {
    const list = [...root.querySelectorAll('button:not([disabled]),input')];
    const i = list.indexOf(document.activeElement);
    if (hit(12) || hit(13)) list[(i + (hit(13) ? 1 : -1) + list.length) % list.length]?.focus();
    if (hit(0)) (root.contains(document.activeElement) ? document.activeElement : list[0])?.click();
    if (hit(1) && overlay) closeOverlay();
    return;
  }
  if (model.s.phase !== 'shift') return;
  if (hit(4)) cycle(-1);
  if (hit(5)) cycle(1);
  if (hit(0)) act('next-step');
  if (hit(3)) act('refuse');
  if (hit(2)) openOverlay('guide');
  const inspect = { 12: 'hands', 15: 'reflection', 13: 'question', 14: 'salt', 7: 'coffee' };
  for (const [i, action] of Object.entries(inspect))
    if (hit(Number(i))) act('inspect', { dataset: { id: String(model.s.selected), action } });
}

// ---------------------------------------------------------------------------
// Phaser scene: presentation only
// ---------------------------------------------------------------------------

class DinerScene extends Phaser.Scene {
  constructor() {
    super('Diner');
    this.views = new Map();
    this.lastFlicker = 0;
    this.actionEnds = 0;
    this.hoverSeat = -1;
    this.grade = null;
    this.lastDread = -1;
    this.arrivals = new Map();
  }

  get motion() {
    return !model.settings.reducedMotion;
  }

  preload() {
    this.load.on('progress', v => {
      $('boot-progress').value = v;
      $('boot-label').textContent = 'Preparing the diner · ' + Math.round(v * 100) + '%';
    });
    this.load.on('loaderror', file => {
      console.error('Asset failed', file.src);
      $('boot-label').textContent = 'Some assets could not load. Check the connection and reload.';
    });
    this.load.image('room', 'assets/environment/diner-original.png');
    for (const id of Object.keys(content.clips))
      this.load.spritesheet('dot-' + id, 'assets/animations/dot/' + id + '.png', {
        frameWidth: 512,
        frameHeight: 512
      });
    for (const id of content.characterIds) {
      this.load.image('seat-' + id, 'assets/characters/seated/' + id + '.png');
      this.load.image('stand-' + id, 'assets/characters/standing/' + id + '.png');
    }
    for (const id of ['coffee-steam', 'cold-breath', 'door-fog', 'sleeve-dust', 'wet-footprints'])
      this.load.image(id, 'assets/effects/' + id + '.png');
    for (const r of content.recipes)
      this.load.image('food-' + r.id, 'assets/food/' + r.id + '.png');
    this.load.image('cup', 'assets/props/coffee-cup.png');
    this.load.image('manager', 'assets/upgrades/night-manager.png');
    this.load.image('hired-cook', 'assets/upgrades/hired-cook-work.png');
    this.load.image('mirror', 'assets/upgrades/mirror.png');
    this.load.image('salt', 'assets/props/salt-pepper.png');
  }

  create() {
    scene = this;
    this.add.image(640, 312.5, 'room').setDisplaySize(1280, 475).setDepth(0);
    // Actual furniture pixels occlude seated torsos; Dot remains in the foreground.
    const source = this.textures.get('room').getSourceImage();
    const fg = this.textures.createCanvas('furniture', 1280, 600);
    fg.context.drawImage(
      source,
      0,
      310,
      source.width,
      source.height - 310,
      0,
      75 + (310 * 1280) / source.width,
      1280,
      ((source.height - 310) * 1280) / source.width
    );
    fg.refresh();
    this.add.image(0, 0, 'furniture').setOrigin(0).setDepth(20);
    for (const [id, c] of Object.entries(content.clips))
      this.anims.create({
        key: 'dot-' + id,
        frames: c.frames.map(frame => ({ key: 'dot-' + id, frame })),
        frameRate: c.frameRate,
        repeat: c.repeat
      });
    this.dot = this.add
      .sprite(DOT_HOME.x, DOT_HOME.y, 'dot-idle')
      .setOrigin(0.5, 0.953125)
      .setDisplaySize(310, 310)
      .setDepth(30);
    this.dot.play('dot-idle');
    this.fog = this.add
      .image(90, 450, 'door-fog')
      .setDisplaySize(220, 180)
      .setAlpha(0.25)
      .setDepth(35);
    this.manager = this.add
      .image(1225, 300, 'manager')
      .setDisplaySize(120, 190)
      .setDepth(15)
      .setVisible(false);
    this.hired = this.add
      .image(1180, 400, 'hired-cook')
      .setOrigin(0.5, 0.95)
      .setDisplaySize(255, 255)
      .setDepth(12)
      .setVisible(false);
    this.mirrors = [6, 7].map(i =>
      this.add.image(SEATS[i].x, 180, 'mirror').setDisplaySize(90, 85).setDepth(5).setVisible(false)
    );
    this.salts = SEATS.map(p =>
      this.add
        .image(p.x + 14, p.y + 3, 'salt')
        .setDisplaySize(20, 20)
        .setDepth(26)
        .setVisible(false)
    );
    this.light = this.add
      .rectangle(640, 300, 1280, 600, 0x06090c, 0.2)
      .setDepth(50)
      .setVisible(false);
    this.overlayG = this.add.graphics().setDepth(40);
    this.underG = this.add.graphics().setDepth(9);

    // Soft dust motes drifting through the fluorescent light.
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('mote', 12, 12);
    g.destroy();
    this.motes = this.add
      .particles(0, 0, 'mote', {
        x: { min: 0, max: 1280 },
        y: { min: 90, max: 520 },
        lifespan: 9000,
        speedX: { min: -5, max: 5 },
        speedY: { min: -7, max: -1 },
        scale: { start: 0.18, end: 0.05 },
        alpha: { start: 0.28, end: 0 },
        frequency: 350,
        blendMode: 'ADD'
      })
      .setDepth(45);

    this.input.on('pointerdown', p => {
      const i = this.seatAt(p.worldX, p.worldY);
      if (i >= 0) {
        const c = model.active.find(c => c.seat === i);
        if (c) {
          model.select(c.id);
          render(true);
        }
      }
    });
    this.input.on('pointermove', p => {
      this.hoverSeat = this.seatAt(p.worldX, p.worldY);
      this.game.canvas.style.cursor =
        this.hoverSeat >= 0 && model.active.some(c => c.seat === this.hoverSeat)
          ? 'pointer'
          : 'default';
    });
    this.applyCinematic();
    sceneReady = true;
    $('boot').hidden = true;
    settings();
    render(true);
    engine.loop.sleep();
  }

  seatAt(x, y) {
    return SEATS.findIndex(s => Math.abs(x - s.x) < 60 && y > s.y - 190 && y < s.y + 70);
  }

  // WebGL-only post-processing: vignette, bloom on the neon and dread grading.
  applyCinematic() {
    const cam = this.cameras?.main;
    if (!cam?.postFX) return;
    try {
      cam.postFX.clear();
      this.grade = null;
      if (!model.settings.cinematic || this.game.renderer.type !== Phaser.WEBGL) return;
      cam.postFX.addBloom(0xffffff, 1, 1, 1, 0.55, 4);
      cam.postFX.addVignette(0.5, 0.5, 0.92, 0.32);
      this.grade = cam.postFX.addColorMatrix();
      this.lastDread = -1;
    } catch (error) {
      console.warn('Post-processing unavailable', error);
      this.grade = null;
    }
  }

  resetNight() {
    for (const v of this.views.values()) Object.values(v).forEach(o => o.destroy?.());
    this.views.clear();
    this.arrivals.clear();
    this.focusSeat(null, true);
    if (this.dot) {
      this.tweens.killTweensOf(this.dot);
      this.dot.setPosition(DOT_HOME.x, DOT_HOME.y).setFlipX(false).play('dot-idle');
    }
  }

  focusSeat(c, instant = false) {
    const cam = this.cameras?.main;
    if (!cam) return;
    if (!this.motion || instant || !c || c.seat === null) {
      if (instant || !this.motion) {
        cam.zoom = 1;
        cam.centerOn(640, 300);
      } else {
        cam.pan(640, 300, 250, 'Sine.easeInOut');
        cam.zoomTo(1, 250, 'Sine.easeInOut');
      }
      return;
    }
    cam.pan(SEATS[c.seat].x, 250, 250, 'Sine.easeInOut');
    cam.zoomTo(1.9, 250, 'Sine.easeInOut');
  }

  shake(intensity) {
    if (this.motion) this.cameras.main.shake(180, intensity);
  }

  // A standing figure walks in from the door, then settles into the seat.
  arrive(c) {
    if (!c || c.seat === null || !this.motion) return;
    const pos = SEATS[c.seat];
    const walker = this.add
      .image(DOOR.x, DOOR.y, 'stand-' + c.art)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(200, 200)
      .setDepth(28)
      .setAlpha(0);
    const duration = 500 + Math.abs(pos.x - DOOR.x) * 0.9;
    this.tweens.add({ targets: walker, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: walker,
      x: pos.x,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => (walker.y = DOOR.y + Math.abs(Math.sin(walker.x / 26)) * -5),
      onComplete: () =>
        this.tweens.add({
          targets: walker,
          alpha: 0,
          duration: 220,
          onComplete: () => walker.destroy()
        })
    });
    this.arrivals.set(c.id, this.time.now + duration);
  }

  // Leaving guests walk back out; refused creatures dissolve into the fog.
  leave(c, refused) {
    if (!c || c.seat === null) return;
    const v = this.views.get(c.id);
    if (v) {
      Object.values(v).forEach(o => o.destroy?.());
      this.views.delete(c.id);
    }
    if (!this.motion) return;
    const pos = SEATS[c.seat];
    const walker = this.add
      .image(pos.x, DOOR.y, 'stand-' + c.art)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(200, 200)
      .setDepth(28);
    if (refused && c.creature) {
      walker.setTint(0x8c2b33);
      const puff = this.add
        .image(pos.x, DOOR.y - 90, 'door-fog')
        .setDisplaySize(260, 200)
        .setAlpha(0)
        .setDepth(29);
      this.tweens.add({
        targets: puff,
        alpha: 0.6,
        duration: 300,
        yoyo: true,
        onComplete: () => puff.destroy()
      });
      this.tweens.add({
        targets: walker,
        alpha: 0,
        scaleY: walker.scaleY * 1.08,
        duration: 700,
        ease: 'Cubic.easeIn',
        onComplete: () => walker.destroy()
      });
      return;
    }
    this.tweens.add({
      targets: walker,
      x: DOOR.x,
      duration: 500 + Math.abs(pos.x - DOOR.x) * 0.9,
      ease: 'Sine.easeIn',
      onUpdate: () => (walker.y = DOOR.y + Math.abs(Math.sin(walker.x / 26)) * -5)
    });
    this.tweens.add({
      targets: walker,
      alpha: 0,
      delay: 300 + Math.abs(pos.x - DOOR.x) * 0.7,
      duration: 400,
      onComplete: () => walker.destroy()
    });
  }

  floatText(c, text, color, offset = 0) {
    if (!c || c.seat === null) return;
    const pos = SEATS[c.seat];
    const t = this.add
      .text(pos.x, pos.y - 190 - offset, text, {
        fontFamily: 'Plex, monospace',
        fontSize: '20px',
        color,
        stroke: '#0e1418',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      y: t.y - (this.motion ? 40 : 0),
      alpha: 0,
      delay: 700,
      duration: 900,
      ease: 'Sine.easeIn',
      onComplete: () => t.destroy()
    });
  }

  pulse(c) {
    const v = c && this.views.get(c.id);
    if (v) v.pulseUntil = this.time.now + 1200;
  }

  dotAction(action, id) {
    if (!this.dot) return;
    const c = id ? model.getCustomer(id) : null;
    const play = () => {
      this.dot.play('dot-' + action);
      this.actionEnds = this.time.now + 900;
    };
    if (c?.seat !== null && c?.seat !== undefined) {
      const x = Math.min(1130, SEATS[c.seat].x + 70);
      this.tweens.killTweensOf(this.dot);
      if (this.motion && Math.abs(x - this.dot.x) > 4) {
        this.dot.setFlipX(x < this.dot.x);
        this.dot.play('dot-walk');
        this.tweens.add({
          targets: this.dot,
          x,
          duration: Math.min(500, 120 + Math.abs(x - this.dot.x) * 0.6),
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.dot.setFlipX(true);
            play();
          }
        });
      } else {
        this.dot.x = x;
        this.dot.setFlipX(true);
        play();
      }
    } else play();
    this.lastMove = this.time.now;
  }

  // Draw per-guest indicators: patience rings, order icons, selection glow.
  drawIndicators(time) {
    const og = this.overlayG;
    const ug = this.underG;
    og.clear();
    ug.clear();
    for (const c of model.active) {
      if (c.seat === null) continue;
      const v = this.views.get(c.id);
      if (!v) continue;
      const pos = SEATS[c.seat];
      const selected = c.id === model.s.selected;
      const hover = c.seat === this.hoverSeat;
      const bx = pos.x;
      const by = pos.y - 172;
      if (selected || hover) {
        ug.fillStyle(selected ? 0xe8f5e1 : 0x7fd3d6, selected ? 0.16 : 0.1);
        ug.fillEllipse(pos.x, pos.y - 70, 150, 190);
      }
      const live = ['ordering', 'waiting'].includes(c.state);
      v.badge.setVisible(false);
      v.mark.setVisible(false);
      if (live) {
        const p = c.patience / 60;
        const col = p > 35 / 60 ? 0x9fe0a4 : p > 15 / 60 ? 0xf2b84b : 0xff6b75;
        og.fillStyle(0x0e1418, 0.82);
        og.fillCircle(bx, by, 20);
        og.lineStyle(4, 0x2a3940, 1);
        og.strokeCircle(bx, by, 20);
        og.lineStyle(4, col, 1);
        og.beginPath();
        og.arc(bx, by, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p, false);
        og.strokePath();
        if (selected) {
          og.lineStyle(2, 0xe8f5e1, 0.9);
          og.strokeCircle(bx, by, 26);
        }
        if (c.state === 'ordering') {
          v.mark.setText('!').setVisible(true).setPosition(bx, by);
        } else {
          const pulse = c.ready ? 1 + Math.sin(time * 0.01) * 0.12 : 1;
          v.badge
            .setVisible(true)
            .setPosition(bx, by)
            .setDisplaySize(30 * pulse, 30 * pulse)
            .setAlpha(c.ready ? 1 : 0.55);
          if (c.ready) {
            og.lineStyle(3, 0xf2b84b, 0.5 + Math.sin(time * 0.01) * 0.4);
            og.strokeCircle(bx, by, 25);
          }
        }
        if (p < 0.25 && this.motion) v.body.x = pos.x + Math.sin(time * 0.04) * 1.2;
      } else if (c.state === 'lingering') {
        v.mark.setText('…').setVisible(true).setPosition(bx, by).setColor('#ff6b75');
      }
      if (model.s.inspection?.customer === c.id) {
        const k = 1 - model.s.inspection.remaining / INSPECT_SECONDS;
        og.lineStyle(3, 0x7fd3d6, 0.9);
        og.beginPath();
        og.arc(pos.x, pos.y - 80, 95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false);
        og.strokePath();
      }
    }
  }

  update(time, delta) {
    if (!sceneReady) return;
    if (model.s.phase !== 'shift') {
      if (model.events.length) processEvents();
      this.lastNow = 0;
      return;
    }
    // Drive the simulation from wall-clock time so a slow device still gets a
    // ten-minute shift; clamp so a stalled frame never skips the game ahead.
    const now = performance.now();
    model.tick(this.lastNow ? Math.min((now - this.lastNow) / 1000, 0.25) : 0);
    this.lastNow = now;
    processEvents();
    if (model.s.phase !== 'shift') return;
    const liveIds = new Set(model.s.customers.map(c => c.id));
    for (const [id, v] of this.views) {
      if (!liveIds.has(id)) {
        Object.values(v).forEach(o => o.destroy?.());
        this.views.delete(id);
      }
    }
    for (const c of model.s.customers) {
      if (['gone', 'refused'].includes(c.state)) {
        const v = this.views.get(c.id);
        if (v) {
          Object.values(v).forEach(o => o.destroy?.());
          this.views.delete(c.id);
        }
        continue;
      }
      if (c.seat === null) continue;
      const pos = SEATS[c.seat];
      let v = this.views.get(c.id);
      if (!v) {
        const body = this.add
          .image(pos.x, pos.y, 'seat-' + c.art)
          .setOrigin(0.5, 0.953125)
          .setDisplaySize(150, 150)
          .setDepth(10);
        const steam = this.add
          .image(pos.x + 37, pos.y - 22, 'coffee-steam')
          .setDisplaySize(24, 55)
          .setAlpha(0.35)
          .setDepth(25);
        const breath = this.add
          .image(pos.x + 25, pos.y - 80, 'cold-breath')
          .setDisplaySize(50, 30)
          .setAlpha(0.45)
          .setDepth(11);
        const dust = this.add
          .image(pos.x - 28, pos.y - 40, 'sleeve-dust')
          .setDisplaySize(30, 30)
          .setAlpha(0.3)
          .setDepth(11);
        const cup = this.add
          .image(pos.x + 37, pos.y + 8, 'cup')
          .setDisplaySize(28, 28)
          .setDepth(24);
        const footprints = this.add
          .image(pos.x + 6, pos.y + 80, 'wet-footprints')
          .setDisplaySize(48, 42)
          .setAlpha(0.4)
          .setDepth(22);
        const reflected = this.add
          .image(pos.x, 180, 'seat-' + c.art)
          .setDisplaySize(48, 70)
          .setFlipX(true)
          .setAlpha(0.45)
          .setDepth(6);
        const badge = this.add
          .image(pos.x, pos.y - 172, 'food-' + c.recipeId)
          .setDepth(41)
          .setVisible(false);
        const mark = this.add
          .text(pos.x, pos.y - 172, '!', {
            fontFamily: 'Plex, monospace',
            fontSize: '24px',
            color: '#f2b84b',
            fontStyle: 'bold'
          })
          .setOrigin(0.5)
          .setDepth(41)
          .setVisible(false);
        v = { body, steam, breath, dust, cup, footprints, reflected, badge, mark };
        this.views.set(c.id, v);
        const arriving = this.arrivals.get(c.id);
        this.arrivals.delete(c.id);
        if (arriving > time) {
          for (const o of [body, steam, cup]) o.setAlpha(0);
          this.tweens.add({
            targets: [body, cup],
            alpha: 1,
            delay: arriving - time,
            duration: 250
          });
          this.tweens.add({ targets: steam, alpha: 0.35, delay: arriving - time, duration: 250 });
        }
      }
      const motion = this.motion && !model.s.paused && c.state !== 'lingering';
      v.body.y = pos.y + (motion ? Math.sin(time * 0.0015 + c.id) * 1.2 : 0);
      v.body.x = pos.x;
      v.body.setRotation(c.state === 'eating' && motion ? Math.sin(time * 0.002) * 0.006 : 0);
      v.steam.setVisible(!c.tells.includes('cold-coffee'));
      v.breath.setVisible(c.tells.includes('cold-breath'));
      v.dust.setVisible(c.tells.includes('sleeve-dust'));
      v.footprints.setVisible(c.tells.includes('wet-footprints'));
      v.reflected.setVisible(
        c.seat >= 6 &&
          model.progress.upgrades.includes('mirror') &&
          !c.tells.includes('no-reflection')
      );
      if (c.state === 'lingering') v.body.setTint(0x9aa6b5);
    }
    this.drawIndicators(time);

    if (model.busy && this.actionEnds < time) {
      this.dot.anims.stop();
      this.dot.setTexture('dot-inspect', 2);
    } else if (!model.busy && this.actionEnds < time) {
      // Dot drifts back behind the counter after a moment of quiet.
      if (
        this.motion &&
        Math.abs(this.dot.x - DOT_HOME.x) > 4 &&
        time - (this.lastMove || 0) > 2500 &&
        !this.tweens.isTweening(this.dot)
      ) {
        this.dot.setFlipX(DOT_HOME.x < this.dot.x);
        this.dot.play('dot-walk');
        this.tweens.add({
          targets: this.dot,
          x: DOT_HOME.x,
          duration: 120 + Math.abs(DOT_HOME.x - this.dot.x) * 0.6,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.dot.setFlipX(false);
            this.dot.play('dot-idle');
          }
        });
      } else if (
        !this.tweens.isTweening(this.dot) &&
        this.dot.anims.currentAnim?.key !== 'dot-idle'
      )
        this.dot.play('dot-idle');
    }
    this.fog.y = 450 + (this.motion ? Math.sin(time * 0.0005) * 4 : 0);
    this.fog.setAlpha(0.25 + (model.eventId === 'fogbank' ? 0.25 : 0) + model.s.dread / 400);
    this.motes.emitting = this.motion;
    this.manager.setVisible(model.progress.night === 7 && model.s.time > 440);
    this.hired.setVisible(model.progress.upgrades.includes('cook'));
    this.mirrors.forEach(m => m.setVisible(model.progress.upgrades.includes('mirror')));
    this.salts.forEach((m, i) =>
      m.setVisible(model.progress.upgrades.includes('salt') && model.active.some(c => c.seat === i))
    );
    const flickerNight = model.s.dread > 70 || model.eventId === 'brownout';
    if (flickerNight && !model.settings.flickerOff && !model.s.paused) {
      if (time > this.lastFlicker) {
        this.light.setVisible(true);
        this.time.delayedCall(100, () => this.light.setVisible(false));
        this.lastFlicker = time + 6000 + Math.random() * 4000;
      }
    } else this.light.setVisible(false);
    if (this.grade && Math.abs(this.lastDread - model.s.dread) > 0.5) {
      this.lastDread = model.s.dread;
      this.grade.reset();
      this.grade.saturate(-(model.s.dread / 100) * 0.55);
      if (model.eventId === 'brownout') this.grade.brightness(0.9, true);
    }
    audio.mix();
    renderClock += delta;
    saveClock += delta;
    if (renderClock > 120) {
      renderClock = 0;
      render();
    }
    if (saveClock > 15000) {
      saveClock = 0;
      save();
    }
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  try {
    const names = {
      creatures: 'creatures',
      regulars: 'regulars',
      recipes: 'recipes',
      tells: 'tells',
      actions: 'inspection-actions',
      dialogue: 'dialogue-180',
      humanTalk: 'human-small-talk'
    };
    content = {};
    await Promise.all(
      Object.entries(names).map(async ([key, file]) => {
        const response = await fetch('assets/data/' + file + '.json');
        if (!response.ok) throw new Error('Missing ' + file);
        content[key] = await response.json();
      })
    );
    content.clips = await (await fetch('assets/animations/dot/clips.json')).json();
    content.characterIds = [
      'earl',
      'vonda',
      'pruitt-a',
      'pruitt-b',
      'coach-hale',
      'ines',
      'ricky',
      'postal-worker',
      'mechanic',
      'salesman',
      'warehouse-worker',
      'librarian',
      ...content.creatures.map(c => c.id)
    ];
    profile.load();
    model = new Diner(content);
    try {
      model.settings = normaliseSettings(JSON.parse(localStorage.getItem(SETTINGS)));
    } catch {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      model.settings.reducedMotion = true;
    engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'world',
      width: 1280,
      height: 600,
      backgroundColor: '#0E1418',
      transparent: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [DinerScene],
      audio: { noAudio: true },
      render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
      fps: { target: 60, min: 20 }
    });
    // ?debug exposes the live model and engine for QA tooling.
    if (new URLSearchParams(location.search).has('debug')) window.f033 = { model, engine, profile };
    // The playfield boots inside a hidden container; re-measure whenever it
    // becomes visible or resizes so the canvas never stays at 0×0.
    // (refresh() alone reuses the cached parent size, so re-read the bounds first.)
    const fit = () => {
      if (!engine.scale) return;
      engine.scale.getParentBounds();
      engine.scale.refresh();
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe($('world'));
    else window.addEventListener('resize', fit);
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (el && !el.disabled) act(el.dataset.act, el);
    });
    document.addEventListener('change', e => {
      const key = e.target.dataset.setting;
      if (!key) return;
      model.settings[key] = key === 'volume' ? Number(e.target.value) : e.target.checked;
      settings();
      save();
      lastUI = '';
      render(true);
    });
    document.addEventListener('keydown', e => {
      // Escape always closes a dialog, even when focus sits on a settings control.
      const typing = e.target.matches('input,textarea,select');
      if (typing && e.key !== 'Escape') return;
      if (e.key === 'Escape' || (e.key.toLowerCase() === 'p' && !overlay)) {
        if (overlay) closeOverlay();
        else if (model.s.phase === 'shift') openOverlay('pause');
        return;
      }
      if (e.key === '?' && !overlay) return openOverlay('controls');
      if (overlay || model.s.phase !== 'shift' || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (/^[1-8]$/.test(key)) {
        const c = model.active.find(c => c.seat === Number(key) - 1);
        if (c) {
          model.select(c.id);
          render(true);
        }
        return;
      }
      if (key === 'arrowright' || key === 'arrowleft') {
        e.preventDefault();
        return cycle(key === 'arrowright' ? 1 : -1);
      }
      if (key === ' ' || (key === 'enter' && !e.target.closest('button,a'))) {
        e.preventDefault();
        return act('next-step');
      }
      if (key === 'g') return openOverlay('guide');
      const map = { h: 'hands', r: 'reflection', q: 'question', s: 'salt', c: 'coffee' };
      if (map[key]) act('inspect', { dataset: { id: String(model.s.selected), action: map[key] } });
      if (key === 'e') act('serve');
      if (key === 'f') act('refuse');
    });
    document.addEventListener('visibilitychange', () => {
      syncPause();
      if (document.hidden) save();
    });
    window.addEventListener('pagehide', save);
    window.addEventListener('gamepadconnected', () => {
      if (pad.loop) return;
      toast('Controller connected. Press ? for controls.');
      pad.loop = true;
      const loop = () => {
        pollGamepad();
        if ([...(navigator.getGamepads?.() || [])].some(Boolean)) requestAnimationFrame(loop);
        else pad.loop = false;
      };
      requestAnimationFrame(loop);
    });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  } catch (error) {
    console.error(error);
    $('boot-label').textContent = 'The diner could not open. ' + error.message;
    const b = document.createElement('button');
    b.textContent = 'Retry loading';
    b.onclick = () => location.reload();
    $('boot').append(b);
  }
}
boot();
