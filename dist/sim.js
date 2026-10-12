// Graveyard Shift Diner — deterministic simulation.
// This module owns every rule of the game. The Phaser/DOM layer in app.js only
// reads state, calls the action methods below and reacts to drained events.

export const SHIFT_SECONDS = 600;
export const SAVE_VERSION = 1;
export const INSPECT_SECONDS = 4;
export const RUSH_TIMES = [200, 450];
export const RUSH_WARNING = 6;
export const STREAK_CAP = 5;
export const UPGRADE_PRICES = { mirror: 150, bell: 80, burners: 200, salt: 60, cook: 250 };

export const DEFAULT_SETTINGS = {
  volume: 0.55,
  music: true,
  flickerOff: true,
  grainOff: true,
  subtitles: true,
  slowPatience: false,
  highContrast: false,
  reducedMotion: false,
  evidenceBoard: true,
  cinematic: true,
  haptics: true
};

export function normaliseSettings(raw) {
  const result = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return result;
  for (const key of Object.keys(result)) {
    if (key === 'volume') {
      if (Number.isFinite(raw.volume)) result.volume = clamp(raw.volume, 0, 1);
    } else if (typeof raw[key] === 'boolean') result[key] = raw[key];
  }
  return result;
}

// Eight service positions in world space (1280×600): six tables, two counter seats.
export const SEATS = [
  { x: 170, y: 315 },
  { x: 309, y: 315 },
  { x: 449, y: 315 },
  { x: 584, y: 315 },
  { x: 720, y: 315 },
  { x: 848, y: 315 },
  { x: 1028, y: 319, counter: true },
  { x: 1138, y: 319, counter: true }
];

// Each night of the week has its own conditions. Every condition trades a
// benefit against a cost so no night plays like the last.
//  patience: multiplier on patience drain (lower is kinder)
//  tips:     multiplier on tips
//  cook:     multiplier on grill time
//  creatures: added to the base creature arrival chance
export const NIGHT_EVENTS = {
  opening: {
    name: 'Opening night',
    blurb: 'A quiet road. Learn the routine while the regulars drift in.',
    patience: 1,
    tips: 1,
    cook: 1,
    creatures: 0
  },
  downpour: {
    name: 'Downpour',
    blurb: 'Rain keeps travelers patient, but the damp grill runs slow.',
    patience: 0.8,
    tips: 1,
    cook: 1.15,
    creatures: 0
  },
  convoy: {
    name: 'Truckers’ convoy',
    blurb: 'Big tippers on a tight schedule. Patience drains faster.',
    patience: 1.2,
    tips: 1.35,
    cook: 1,
    creatures: 0
  },
  fogbank: {
    name: 'Fog bank',
    blurb: 'The fog rolls in off the reservoir. More of the other kind walk with it.',
    patience: 1,
    tips: 1.15,
    cook: 1,
    creatures: 0.06
  },
  brownout: {
    name: 'Brownout',
    blurb: 'The power sags. Burners crawl; guests forgive the dark a little.',
    patience: 0.9,
    tips: 1,
    cook: 1.25,
    creatures: 0
  },
  fullmoon: {
    name: 'Full moon',
    blurb: 'Every booth fills. Tips run hot and so does the road.',
    patience: 1.1,
    tips: 1.25,
    cook: 1,
    creatures: 0.05
  },
  manager: {
    name: 'The Night Manager',
    blurb: 'He is watching from the counter. The final rush brings three of them at once.',
    patience: 1,
    tips: 1,
    cook: 1,
    creatures: 0
  }
};
const WEEK_EVENTS = ['opening', 'downpour', 'convoy', 'fogbank', 'brownout', 'fullmoon', 'manager'];
const ENDLESS_EVENTS = ['downpour', 'convoy', 'fogbank', 'brownout', 'fullmoon'];

export function eventFor(night, mode = 'week', seed = 33033) {
  if (night <= 7) return WEEK_EVENTS[night - 1];
  if (mode !== 'endless') return 'opening';
  return ENDLESS_EVENTS[Math.floor(rng(seed + night * 7919)() * ENDLESS_EVENTS.length)];
}

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyProgress(mode, seed) {
  return {
    cash: 120,
    reputation: 60,
    lanterns: 3,
    night: 1,
    loans: 0,
    mode,
    seed: seed >>> 0,
    upgrades: [],
    guide: ['hollow-driver'],
    exceptions: {},
    stories: {},
    stars: {},
    bestNight: 0
  };
}

const CREATURE_ORDER = [
  'hollow-driver',
  'fog-kin',
  'under-sleeper',
  'lamp-moth',
  'pale-hitcher',
  'reflection-twin'
];
const REGULARS = ['earl', 'vonda', 'pruitt-a', 'pruitt-b', 'coach-hale', 'ines', 'ricky'];
const INCIDENTAL = ['postal-worker', 'mechanic', 'salesman', 'warehouse-worker', 'librarian'];
const LIVE_STATES = ['ordering', 'waiting', 'queued'];

export class Diner {
  constructor(content, progress = null) {
    this.content = content;
    this.progress = progress ? structuredClone(progress) : emptyProgress('week', 33033);
    this.s = {
      phase: 'menu',
      time: 0,
      dread: 0,
      customers: [],
      plan: [],
      jobs: [],
      inspection: null,
      selected: null,
      paused: false,
      receipt: null,
      tutorial: null,
      streak: 0
    };
    this.events = [];
    this.settings = { ...DEFAULT_SETTINGS };
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  drain() {
    return this.events.splice(0);
  }

  get active() {
    return this.s.customers.filter(c => !['gone', 'refused'].includes(c.state));
  }

  get burners() {
    return this.progress.upgrades.includes('burners') ? 8 : 4;
  }

  get rent() {
    return this.progress.mode === 'endless'
      ? 180 + 25 * (this.progress.night - 1)
      : 180 + 20 * Math.max(0, this.progress.night - 3);
  }

  get busy() {
    return Boolean(this.s.inspection);
  }

  get eventId() {
    return eventFor(this.progress.night, this.progress.mode, this.progress.seed);
  }

  get event() {
    return NIGHT_EVENTS[this.eventId];
  }

  // Combined grill time multiplier: dread (1.0–2.0), hired cook and tonight's conditions.
  get cookFactor() {
    return (
      clamp(1 + this.s.dread * 0.01, 1, 2) *
      (this.progress.upgrades.includes('cook') ? 0.75 : 1) *
      this.event.cook
    );
  }

  get streakBonus() {
    return 1 + 0.1 * Math.min(this.s.streak || 0, STREAK_CAP);
  }

  newRun(mode = 'week', seed = 33033) {
    this.progress = emptyProgress(mode, seed);
    this.s.phase = 'menu';
    this.startNight();
  }

  getCustomer(id) {
    return this.s.customers.find(c => c.id === id);
  }

  startNight() {
    const n = this.progress.night;
    const unlocked = CREATURE_ORDER.slice(0, Math.min(n, 6));
    this.progress.guide = [...new Set([...this.progress.guide, ...unlocked])];
    this.progress.stars ??= {};
    const random = rng(this.progress.seed + n * 1237);
    const count = Math.min(28, 14 + 2 * n);
    const creatureChance = Math.min(0.35, 0.1 + 0.04 * (n - 1)) + this.event.creatures;
    const plan = [];
    for (let i = 0; i < count; i++) {
      let creature = random() < creatureChance;
      if (n === 1 && i === 0) creature = false;
      if (n === 1 && i === 1) creature = true;
      if (n === 7 && i >= count - 3) creature = true;
      const type = creature ? unlocked[Math.floor(random() * unlocked.length)] : null;
      const humanId =
        i === 0
          ? 'earl'
          : i < REGULARS.length
            ? REGULARS[i]
            : INCIDENTAL[Math.floor(random() * INCIDENTAL.length)];
      const regularId = humanId.startsWith('pruitt')
        ? 'pruitt-twins'
        : REGULARS.includes(humanId)
          ? humanId
          : null;
      const reg = this.content.regulars.find(r => r.id === regularId);
      let tells = [];
      if (creature) {
        const pool = this.content.creatures.find(c => c.id === type).tells;
        const omit = Math.floor(random() * 3);
        tells = pool.filter((_, j) => j !== omit);
      } else if (reg?.false_tell) {
        tells = [reg.false_tell];
      } else if (random() < 0.25) {
        const harmless = ['refuses-salt', 'no-car', 'old-coins'];
        tells = [harmless[Math.floor(random() * harmless.length)]];
      }
      if (n === 1 && i === 1) tells = ['no-reflection', 'cold-coffee'];
      let at =
        i === 0 ? 0 : i === 1 && n === 1 ? 30 : 70 + ((i - 2) * 440) / Math.max(1, count - 3);
      // Two rush groups, with ordinary spaced arrivals elsewhere.
      const rushA = Math.floor(count * 0.28);
      const rushB = Math.floor(count * 0.68);
      if (i >= rushA && i < rushA + 3) at = RUSH_TIMES[0] + (i - rushA) * 4;
      if (i >= rushB && i < rushB + 4) at = RUSH_TIMES[1] + (i - rushB) * 4;
      if (n === 7 && i >= count - 3) at = RUSH_TIMES[1] + (i - (count - 3)) * 3;
      const recipe =
        this.content.recipes[
          n === 1 && i === 0 ? 0 : Math.floor(random() * this.content.recipes.length)
        ];
      let art = creature ? type : humanId;
      // Appearance never guarantees identity. Ordinary walk-ins can use the same
      // disguise bases, and later creatures can resemble ordinary travelers.
      if (i > 6 && random() < 0.35)
        art = creature
          ? INCIDENTAL[Math.floor(random() * INCIDENTAL.length)]
          : unlocked[Math.floor(random() * unlocked.length)];
      plan.push({
        id: n * 100 + i + 1,
        at,
        creature,
        type,
        art,
        regularId: creature ? null : regularId,
        tells,
        recipeId: recipe.id,
        price: recipe.price,
        cookSeconds: recipe.cook_seconds,
        patience: 60,
        known: [],
        state: 'planned',
        seat: null,
        served: false,
        payment: false,
        tip: 0
      });
    }
    plan.sort((a, b) => a.at - b.at);
    this.s = {
      phase: 'shift',
      time: 0,
      dread: 0,
      customers: [],
      plan,
      jobs: [],
      inspection: null,
      selected: null,
      paused: false,
      receipt: null,
      streak: 0,
      summary: {
        sales: 0,
        tips: 0,
        lostSales: 0,
        humansRefused: 0,
        creaturesRefused: 0,
        creaturesServed: 0,
        humansServed: 0,
        walkouts: 0,
        bestStreak: 0
      },
      tutorial: n === 1 ? { step: 0, done: false } : null
    };
    this.tick(0);
    this.emit('night', { night: n, event: this.eventId });
    if (n === 7) this.emit('manager');
  }

  seat(c) {
    const used = new Set(this.active.filter(x => x.seat !== null).map(x => x.seat));
    const seat = SEATS.findIndex((_, i) => !used.has(i));
    if (seat < 0) {
      c.state = 'queued';
      return;
    }
    c.seat = seat;
    c.state = 'ordering';
    this.emit('bell', {
      id: c.id,
      wrong:
        c.tells.includes('old-coins') &&
        c.type === 'pale-hitcher' &&
        this.progress.upgrades.includes('bell')
    });
    if (this.progress.upgrades.includes('mirror') && SEATS[seat].counter)
      this.reveal(c, 'reflection', true);
    if (this.progress.upgrades.includes('salt')) this.reveal(c, 'salt', true);
  }

  tick(dt) {
    if (this.s.phase !== 'shift' || this.s.paused) return;
    dt = clamp(dt, 0, 5);
    const before = this.s.time;
    this.s.time += dt;
    this.s.dread = clamp(this.s.dread - dt / 10, 0, 100);
    for (const at of RUSH_TIMES) {
      const warn = at - RUSH_WARNING;
      if (before < warn && this.s.time >= warn) this.emit('rush', { at });
    }
    while (this.s.plan.length && this.s.plan[0].at <= this.s.time) {
      const c = this.s.plan.shift();
      if (c.type === 'reflection-twin' && c.tells.includes('duplicate-regular')) {
        const other = this.active.find(x => x.regularId && !x.creature && x.seat !== null);
        if (other) {
          c.art = other.art;
          c.matchId = other.id;
        } else c.tells = ['mirrored-hair', 'wrong-hand'];
      }
      this.s.customers.push(c);
      this.seat(c);
      if (this.s.selected === null) this.s.selected = c.id;
      this.emit('arrival', { id: c.id });
    }
    const drain = (this.s.dread > 50 ? 1.5 : 1) * (this.settings.slowPatience ? 0.75 : 1);
    for (const c of this.active) {
      if (c.state === 'queued') this.seat(c);
      if (LIVE_STATES.includes(c.state)) {
        c.patience = Math.max(0, c.patience - dt * drain * this.event.patience);
        if (c.patience === 0) {
          c.state = 'gone';
          this.s.jobs = this.s.jobs.filter(j => j.customer !== c.id);
          this.s.summary.walkouts++;
          this.breakStreak();
          this.emit('walkout', { id: c.id });
        }
      } else if (c.state === 'eating') {
        c.eating = Math.max(0, c.eating - dt);
        if (c.eating === 0) this.pay(c);
      }
    }
    for (const j of this.s.jobs) {
      j.remaining = Math.max(0, j.remaining - dt);
      if (j.remaining === 0 && !j.ready) {
        j.ready = true;
        const c = this.getCustomer(j.customer);
        if (c && c.state === 'waiting') {
          c.ready = true;
          this.emit('ready', { id: c.id });
        }
      }
    }
    if (this.s.inspection) {
      this.s.inspection.remaining = Math.max(0, this.s.inspection.remaining - dt);
      if (this.s.inspection.remaining === 0) {
        const { customer, action } = this.s.inspection;
        const c = this.getCustomer(customer);
        this.s.inspection = null;
        if (c && !['gone', 'refused'].includes(c.state)) {
          this.reveal(c, action);
          this.emit('inspected', { id: c.id, action });
        }
      }
    }
    if (this.s.time >= SHIFT_SECONDS) this.close();
  }

  allow(c) {
    return (
      this.s.phase === 'shift' && !this.s.paused && !this.busy && c && LIVE_STATES.includes(c.state)
    );
  }

  select(id) {
    if (this.getCustomer(id)) {
      this.s.selected = id;
      this.emit('select', { id });
      return true;
    }
    return false;
  }

  // The single most useful next step for a guest: order → cook → serve.
  nextStep(id) {
    const c = this.getCustomer(id);
    if (!this.allow(c)) return null;
    if (c.state === 'ordering') return 'order';
    if (c.state === 'waiting' && c.ready) return 'serve';
    if (c.state === 'waiting' && !this.s.jobs.some(j => j.customer === id)) return 'cook';
    return null;
  }

  order(id) {
    const c = this.getCustomer(id);
    if (!this.allow(c) || c.state !== 'ordering') return false;
    c.state = 'waiting';
    c.ordered = true;
    this.emit('order', { id });
    this.tutorial(1);
    return true;
  }

  cook(id) {
    const c = this.getCustomer(id);
    if (
      !this.allow(c) ||
      c.state !== 'waiting' ||
      c.ready ||
      this.s.jobs.some(j => j.customer === id) ||
      this.s.jobs.length >= this.burners
    )
      return false;
    const duration = c.cookSeconds * this.cookFactor;
    this.s.jobs.push({ customer: id, remaining: duration, duration, ready: false });
    this.emit('cook', { id, full: this.s.jobs.length >= this.burners });
    return true;
  }

  serve(id) {
    const c = this.getCustomer(id);
    if (!this.allow(c) || c.state !== 'waiting' || !c.ready) return false;
    c.served = true;
    c.state = 'eating';
    c.eating = 20;
    c.servedPatience = c.patience;
    c.tip =
      c.price *
      (c.patience / 60) *
      (this.progress.reputation / 100) *
      0.3 *
      this.event.tips *
      this.streakBonus;
    this.s.jobs = this.s.jobs.filter(j => j.customer !== id);
    if (c.creature) {
      this.s.dread = clamp(this.s.dread + 15, 0, 100);
      this.s.summary.creaturesServed++;
      this.breakStreak();
    } else {
      this.s.summary.humansServed++;
      this.progress.reputation = clamp(this.progress.reputation + 1, 0, 100);
      this.addStreak();
    }
    this.emit('serve', {
      id,
      creature: c.creature,
      habit: Boolean(c.regularId && c.known.length)
    });
    if (c.art === 'earl') this.tutorial(2);
    return true;
  }

  refuse(id) {
    const c = this.getCustomer(id);
    if (!this.allow(c)) return false;
    if (c.creature) {
      this.s.dread = clamp(this.s.dread - 10, 0, 100);
      this.s.summary.creaturesRefused++;
      const witness = this.active.some(
        x => x.id !== id && !x.creature && x.regularId && x.seat !== null
      );
      if (witness) this.progress.reputation = clamp(this.progress.reputation + 2, 0, 100);
      this.progress.guide = [...new Set([...this.progress.guide, c.type])];
      this.addStreak();
    } else {
      this.progress.cash -= c.price;
      this.progress.reputation = clamp(this.progress.reputation - 8, 0, 100);
      this.s.summary.lostSales += c.price;
      this.s.summary.humansRefused++;
      if (c.regularId && c.known.length) this.progress.exceptions[c.regularId] = c.known;
      this.breakStreak();
    }
    c.state = 'refused';
    this.s.jobs = this.s.jobs.filter(j => j.customer !== id);
    this.emit('refuse', { id, correct: c.creature, price: c.price, creature: c.type });
    if (c.id === 102 && c.creature) this.tutorial(5);
    return true;
  }

  addStreak() {
    this.s.streak = (this.s.streak || 0) + 1;
    this.s.summary.bestStreak = Math.max(this.s.summary.bestStreak || 0, this.s.streak);
    if ([3, 5, 8, 12].includes(this.s.streak)) this.emit('streak', { streak: this.s.streak });
  }

  breakStreak() {
    if (this.s.streak >= 3) this.emit('streak-lost', { streak: this.s.streak });
    this.s.streak = 0;
  }

  inspect(id, action) {
    const c = this.getCustomer(id);
    if (!this.allow(c) || !this.content.actions.some(a => a.id === action)) return false;
    this.s.inspection = { customer: id, action, remaining: INSPECT_SECONDS };
    this.emit('inspect', { id, action });
    return true;
  }

  reveal(c, action, free = false) {
    const found = c.tells.filter(t => this.content.tells.find(x => x.id === t)?.action === action);
    c.known = [...new Set([...c.known, ...found])];
    c.checks = [...new Set([...(c.checks || []), action])];
    if (c.regularId && !c.creature && found.length)
      this.progress.exceptions[c.regularId] = [
        ...new Set([...(this.progress.exceptions[c.regularId] || []), ...found])
      ];
    if (action === 'question') {
      const matches = this.content.dialogue.filter(d => found.includes(d.tell));
      const line =
        matches[c.id % Math.max(1, matches.length)]?.line ||
        this.content.humanTalk[c.id % this.content.humanTalk.length];
      c.line = line
        .replaceAll('{name}', 'Dot')
        .replaceAll('{previous_sentence}', 'Where are you headed?')
        .slice(0, 120);
    }
    if (c.id === 102 && action === 'reflection') this.tutorial(4);
    this.emit('reveal', { id: c.id, action, found, free });
  }

  // Pure deduction from public evidence only (observed tells and completed
  // checks). A creature always shows exactly two tells from its own pool in two
  // different inspection categories; a human shows at most one. So:
  //  - two observed tells from one creature's pool → confirmed
  //  - no creature pair consistent with the evidence → cleared
  //  - otherwise the remaining candidates are listed.
  deduce(id) {
    const c = typeof id === 'object' ? id : this.getCustomer(id);
    if (!c) return null;
    const actionOf = t => this.content.tells.find(x => x.id === t)?.action;
    const checks = c.checks || [];
    const candidates = [];
    for (const creature of this.content.creatures) {
      if (!this.progress.guide.includes(creature.id)) continue;
      const pool = creature.tells;
      const pairs = pool.flatMap((a, i) => pool.slice(i + 1).map(b => [a, b]));
      const fits = pairs.some(
        pair =>
          c.known.every(t => pair.includes(t)) &&
          pair.every(t => c.known.includes(t) || !checks.includes(actionOf(t)))
      );
      if (fits) candidates.push(creature.id);
    }
    let status = 'unknown';
    if (c.known.length >= 2 && candidates.length) status = 'confirmed';
    else if (!candidates.length) status = 'cleared';
    else if (c.known.length === 1) status = 'suspicious';
    const unchecked = this.content.actions.map(a => a.id).filter(a => !checks.includes(a));
    return { status, candidates, unchecked };
  }

  pay(c) {
    if (c.payment) return;
    c.payment = true;
    this.progress.cash += c.price + c.tip;
    this.s.summary.sales += c.price;
    this.s.summary.tips += c.tip;
    if (c.regularId && !c.creature) {
      const step = this.progress.stories[c.regularId] || 0;
      const r = this.content.regulars.find(r => r.id === c.regularId);
      if (step < 5) {
        this.progress.stories[c.regularId] = step + 1;
        this.emit('story', {
          name: c.regularId,
          line: r?.story_steps[step],
          complete: step + 1 === 5
        });
      }
    }
    c.state = c.creature ? 'lingering' : 'gone';
    this.emit('pay', { id: c.id, amount: c.price + c.tip, tip: c.tip });
  }

  tutorial(step) {
    if (this.s.tutorial) {
      this.s.tutorial.step = Math.max(this.s.tutorial.step, step);
      if (step >= 5) this.s.tutorial.done = true;
    }
  }

  guideOpened() {
    this.tutorial(3);
  }

  close() {
    if (this.s.phase !== 'shift') return;
    const due = this.rent;
    const lost = this.s.customers.filter(c => c.creature && c.served).length;
    this.progress.lanterns = clamp(this.progress.lanterns - lost, 0, 3);
    let loan = false;
    if (this.progress.cash < due) {
      loan = true;
      this.progress.loans++;
      this.progress.reputation = clamp(this.progress.reputation - 10, 0, 100);
      this.progress.cash = 0;
    } else this.progress.cash -= due;
    this.progress.bestNight = Math.max(this.progress.bestNight, this.progress.night);
    const sum = this.s.summary;
    // Three stars: paid rent outright, a clean book of judgements, and nobody walked out.
    const stars = [!loan, sum.creaturesServed === 0 && sum.humansRefused === 0, sum.walkouts === 0];
    const earned = stars.filter(Boolean).length;
    this.progress.stars ??= {};
    this.progress.stars[this.progress.night] = Math.max(
      this.progress.stars[this.progress.night] || 0,
      earned
    );
    this.s.receipt = {
      ...sum,
      night: this.progress.night,
      event: this.eventId,
      rent: due,
      loan,
      lanternsLost: lost,
      cash: this.progress.cash,
      reputation: this.progress.reputation,
      lanterns: this.progress.lanterns,
      stars
    };
    this.s.inspection = null;
    this.s.paused = false;
    this.s.phase =
      this.progress.lanterns === 0
        ? 'dark'
        : this.progress.loans >= 2
          ? 'fired'
          : this.progress.mode === 'week' && this.progress.night >= 7
            ? 'win'
            : 'summary';
    this.emit('close', { lost, loan, phase: this.s.phase, stars: earned });
  }

  nextNight() {
    if (this.s.phase !== 'summary') return false;
    this.progress.night++;
    if (this.progress.mode === 'endless' && this.progress.night % 7 === 1) this.progress.loans = 0;
    this.startNight();
    return true;
  }

  buy(id) {
    if (
      this.s.phase !== 'summary' ||
      !Object.hasOwn(UPGRADE_PRICES, id) ||
      this.progress.upgrades.includes(id) ||
      this.progress.cash < UPGRADE_PRICES[id]
    )
      return false;
    this.progress.cash -= UPGRADE_PRICES[id];
    this.progress.upgrades.push(id);
    this.emit('upgrade', { id });
    return true;
  }

  export() {
    return {
      version: SAVE_VERSION,
      progress: this.progress,
      state: this.s,
      settings: this.settings
    };
  }

  restore(value) {
    if (!value || value.version !== SAVE_VERSION || !value.progress || !value.state)
      throw new Error('Unsupported save');
    const p = value.progress;
    if (
      !Number.isFinite(p.cash) ||
      !Number.isInteger(p.night) ||
      p.night < 1 ||
      p.night > 10000 ||
      !Number.isFinite(p.reputation) ||
      !Array.isArray(p.upgrades) ||
      !['week', 'endless'].includes(p.mode)
    )
      throw new Error('Invalid save');
    if (
      !Array.isArray(value.state.customers) ||
      !Array.isArray(value.state.plan) ||
      !Array.isArray(value.state.jobs) ||
      !['menu', 'shift', 'summary', 'fired', 'dark', 'win'].includes(value.state.phase)
    )
      throw new Error('Invalid state');
    if (value.state.customers.length > 100 || value.state.plan.length > 28)
      throw new Error('Oversized save');
    if (
      !Number.isInteger(p.lanterns) ||
      p.lanterns < 0 ||
      p.lanterns > 3 ||
      p.reputation < 0 ||
      p.reputation > 100 ||
      !Number.isInteger(p.loans) ||
      p.loans < 0 ||
      p.loans > 2 ||
      !Array.isArray(p.guide) ||
      !p.stories ||
      !p.exceptions
    )
      throw new Error('Invalid resources');
    if (p.stars !== undefined && (typeof p.stars !== 'object' || p.stars === null))
      throw new Error('Invalid stars');
    if (p.upgrades.some(k => !Object.hasOwn(UPGRADE_PRICES, k)) || p.upgrades.length > 5)
      throw new Error('Invalid upgrades');
    const s = value.state;
    if (
      !Number.isFinite(s.time) ||
      s.time < 0 ||
      s.time > 605 ||
      !Number.isFinite(s.dread) ||
      s.dread < 0 ||
      s.dread > 100
    )
      throw new Error('Invalid clock');
    if (s.streak !== undefined && (!Number.isInteger(s.streak) || s.streak < 0))
      throw new Error('Invalid streak');
    const ids = new Set();
    const art = new Set([...REGULARS, ...INCIDENTAL, ...this.content.creatures.map(c => c.id)]);
    for (const c of [...s.customers, ...s.plan]) {
      if (
        !Number.isInteger(c.id) ||
        ids.has(c.id) ||
        !art.has(c.art) ||
        !this.content.recipes.some(r => r.id === c.recipeId) ||
        !Number.isFinite(c.patience) ||
        c.patience < 0 ||
        c.patience > 60 ||
        !Number.isFinite(c.price) ||
        !Array.isArray(c.tells) ||
        !Array.isArray(c.known)
      )
        throw new Error('Invalid customer');
      if (
        ![
          'planned',
          'ordering',
          'waiting',
          'queued',
          'eating',
          'lingering',
          'gone',
          'refused'
        ].includes(c.state) ||
        c.tells.some(t => !this.content.tells.some(x => x.id === t))
      )
        throw new Error('Invalid customer state');
      if (c.seat !== null && (!Number.isInteger(c.seat) || c.seat < 0 || c.seat >= SEATS.length))
        throw new Error('Invalid seat');
      if (c.state === 'eating' && (!Number.isFinite(c.eating) || c.eating < 0))
        throw new Error('Invalid meal');
      ids.add(c.id);
    }
    for (const j of s.jobs)
      if (
        !ids.has(j.customer) ||
        !Number.isFinite(j.remaining) ||
        !Number.isFinite(j.duration) ||
        j.duration <= 0 ||
        j.remaining < 0 ||
        j.remaining > j.duration
      )
        throw new Error('Invalid burner');
    if (
      s.inspection &&
      (!ids.has(s.inspection.customer) ||
        !this.content.actions.some(a => a.id === s.inspection.action) ||
        !Number.isFinite(s.inspection.remaining) ||
        s.inspection.remaining < 0 ||
        s.inspection.remaining > INSPECT_SECONDS)
    )
      throw new Error('Invalid inspection');
    if (s.phase === 'shift' && !s.summary) throw new Error('Missing summary');
    if (['summary', 'dark', 'fired', 'win'].includes(s.phase) && !s.receipt)
      throw new Error('Missing receipt');
    this.progress = structuredClone(p);
    this.progress.stars ??= {};
    this.s = structuredClone(value.state);
    this.s.paused = false;
    this.s.streak ??= 0;
    if (this.s.summary) this.s.summary.bestStreak ??= 0;
    this.settings = normaliseSettings(value.settings);
  }
}
