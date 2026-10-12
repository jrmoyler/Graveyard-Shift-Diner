import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Diner, NIGHT_EVENTS, RUSH_TIMES, RUSH_WARNING, eventFor } from '../dist/sim.js';

const root = new URL('../dist/assets/data/', import.meta.url);
const get = n => JSON.parse(fs.readFileSync(new URL(n + '.json', root)));
const content = {
  creatures: get('creatures'),
  regulars: get('regulars'),
  recipes: get('recipes'),
  tells: get('tells'),
  actions: get('inspection-actions'),
  dialogue: get('dialogue-180'),
  humanTalk: get('human-small-talk')
};
function game(n = 1, mode = 'week') {
  const g = new Diner(content);
  g.progress.mode = mode;
  g.progress.night = n;
  g.startNight();
  return g;
}
function advance(g, t) {
  for (let elapsed = 0; elapsed < t; elapsed += 1) g.tick(Math.min(1, t - elapsed));
}
let nextId = 5000;
function guest(g, { creature = false, type = 'hollow-driver', tells, seat = 1, price = 18 } = {}) {
  const c = {
    id: nextId++,
    creature,
    type: creature ? type : null,
    tells: tells ?? (creature ? ['cold-coffee', 'no-reflection'] : []),
    art: creature ? type : 'mechanic',
    regularId: null,
    recipeId: 'breakfast',
    price,
    cookSeconds: 22,
    patience: 60,
    known: [],
    state: 'ordering',
    seat,
    served: false,
    payment: false,
    tip: 0
  };
  g.s.customers.push(c);
  return c;
}

test('every week night has defined conditions; opening and manager nights are neutral', () => {
  for (let n = 1; n <= 7; n++) assert(NIGHT_EVENTS[eventFor(n)], 'night ' + n);
  for (const id of ['opening', 'manager'])
    for (const k of ['patience', 'tips', 'cook']) assert.equal(NIGHT_EVENTS[id][k], 1);
  assert.equal(eventFor(1), 'opening');
  assert.equal(eventFor(7), 'manager');
});

test('endless conditions are deterministic per seed and night', () => {
  for (let n = 8; n < 30; n++) {
    assert.equal(eventFor(n, 'endless', 99), eventFor(n, 'endless', 99));
    assert.notEqual(eventFor(n, 'endless', 99), 'opening');
  }
});

test('night conditions change patience drain and grill time', () => {
  const rain = game(2);
  assert.equal(rain.eventId, 'downpour');
  const c = guest(rain);
  advance(rain, 10);
  assert(Math.abs(c.patience - (60 - 10 * NIGHT_EVENTS.downpour.patience)) < 1e-9);
  rain.order(c.id);
  rain.cook(c.id);
  assert(Math.abs(rain.s.jobs[0].duration - 22 * NIGHT_EVENTS.downpour.cook) < 1e-9);
});

test('service streak grows on correct calls, boosts tips and breaks on mistakes', () => {
  const g = game();
  assert.equal(g.streakBonus, 1);
  for (let i = 0; i < 3; i++) g.refuse(guest(g, { creature: true }).id);
  assert.equal(g.s.streak, 3);
  assert(g.drain().some(e => e.type === 'streak' && e.streak === 3));
  const h = guest(g, { price: 10 });
  g.order(h.id);
  h.ready = true;
  g.serve(h.id);
  const base = ((10 * 1 * (g.progress.reputation - 1)) / 100) * 0.3;
  assert(Math.abs(h.tip - base * 1.3) < 1e-9, 'tip uses the streak bonus at serve time');
  assert.equal(g.s.streak, 4);
  g.refuse(guest(g).id);
  assert.equal(g.s.streak, 0);
  assert.equal(g.s.summary.bestStreak, 4);
  assert(g.drain().some(e => e.type === 'streak-lost'));
});

test('streak bonus caps at +50%', () => {
  const g = game();
  g.s.streak = 40;
  assert.equal(g.streakBonus, 1.5);
});

test('walkouts break the streak', () => {
  const g = game();
  g.s.streak = 4;
  const c = guest(g);
  c.patience = 1;
  advance(g, 2);
  assert.equal(c.state, 'gone');
  assert.equal(g.s.streak, 0);
});

test('rush warnings fire once before each rush group', () => {
  const g = game(3);
  g.drain();
  advance(g, RUSH_TIMES[1]);
  const rush = g.drain().filter(e => e.type === 'rush');
  assert.deepEqual(
    rush.map(e => e.at),
    RUSH_TIMES
  );
  assert(RUSH_WARNING > 0);
});

test('closing awards up to three stars and remembers the best per night', () => {
  const perfect = game();
  perfect.progress.cash = 500;
  perfect.close();
  assert.deepEqual(perfect.s.receipt.stars, [true, true, true]);
  assert.equal(perfect.progress.stars[1], 3);

  const rough = game();
  rough.progress.cash = 0;
  const c = guest(rough, { creature: true });
  rough.order(c.id);
  c.ready = true;
  rough.serve(c.id);
  rough.close();
  assert.deepEqual(rough.s.receipt.stars, [false, false, true]);
  assert.equal(rough.progress.stars[1], 1);
});

test('deduction confirms two tells, clears exhausted guests and never reads hidden tells', () => {
  const g = game(6);
  const creature = guest(g, { creature: true, tells: ['no-reflection', 'cold-coffee'] });
  assert.equal(g.deduce(creature.id).status, 'unknown');
  g.reveal(creature, 'reflection');
  const one = g.deduce(creature.id);
  assert.equal(one.status, 'suspicious');
  assert(one.candidates.includes('hollow-driver'));
  g.reveal(creature, 'coffee');
  assert.deepEqual(g.deduce(creature.id).candidates, ['hollow-driver']);
  assert.equal(g.deduce(creature.id).status, 'confirmed');

  // A human with a harmless salt habit: suspicious until the other categories clear it.
  const human = guest(g, { tells: ['refuses-salt'] });
  g.reveal(human, 'salt');
  assert.equal(g.deduce(human.id).status, 'suspicious');
  g.reveal(human, 'hands');
  g.reveal(human, 'question');
  assert.equal(g.deduce(human.id).status, 'cleared');

  // Hidden tells are not consulted: an unchecked creature looks the same as an unchecked human.
  const hidden = guest(g, { creature: true });
  const plain = guest(g);
  assert.deepEqual(g.deduce(hidden.id), g.deduce(plain.id));
});

test('deduction only names creatures recorded in the field guide', () => {
  const g = game(1);
  const c = guest(g, {
    creature: true,
    type: 'fog-kin',
    tells: ['wet-footprints', 'refuses-salt']
  });
  g.reveal(c, 'hands');
  assert(!g.deduce(c.id).candidates.includes('lamp-moth'));
});

test('nextStep follows order → cook → serve', () => {
  const g = game();
  const c = guest(g);
  assert.equal(g.nextStep(c.id), 'order');
  g.order(c.id);
  assert.equal(g.nextStep(c.id), 'cook');
  g.cook(c.id);
  assert.equal(g.nextStep(c.id), null);
  advance(g, 22);
  assert.equal(g.nextStep(c.id), 'serve');
});

test('saves from before streaks and stars still restore', () => {
  const g = game();
  const save = JSON.parse(JSON.stringify(g.export()));
  delete save.progress.stars;
  delete save.state.streak;
  delete save.state.summary.bestStreak;
  const h = new Diner(content);
  h.restore(save);
  assert.equal(h.s.streak, 0);
  assert.deepEqual(h.progress.stars, {});
  assert.throws(() => h.restore({ ...save, state: { ...save.state, streak: -1 } }));
});

test('event payloads never overwrite the event type', () => {
  const g = game();
  g.drain();
  const c = guest(g, { creature: true });
  g.refuse(c.id);
  const events = g.drain();
  assert(events.some(e => e.type === 'refuse' && e.creature === 'hollow-driver'));
  assert(events.every(e => typeof e.type === 'string' && !['hollow-driver'].includes(e.type)));
});
