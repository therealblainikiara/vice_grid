import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createObjectives, applyEvent, primaryComplete, primaryFailed, summary,
} from '../src/objectives.js';

const defs = () => ([
  { id: 'clear', label: 'Neutralize the gunmen', primary: true, type: 'neutralize', count: 3, tag: 'gunman' },
  { id: 'boss', label: 'Stop Chrome Dog', primary: true, type: 'boss' },
  { id: 'cuffs', label: 'Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
  { id: 'civs', label: 'No civilian casualties', primary: false, type: 'protect', count: 0 },
  { id: 'files', label: 'Recover ledger evidence', primary: false, type: 'evidence', count: 2 },
]);

test('neutralize counts kills, downs and arrests of the tagged group', () => {
  const o = createObjectives(defs());
  applyEvent(o, { type: 'neutralized', tag: 'gunman' });
  applyEvent(o, { type: 'arrested', tag: 'gunman' });
  applyEvent(o, { type: 'neutralized', tag: 'civvie' }); // wrong tag ignored
  assert.equal(o[0].progress, 2);
  applyEvent(o, { type: 'neutralized', tag: 'gunman' });
  assert.ok(o[0].done);
});

test('primary completion requires all primaries', () => {
  const o = createObjectives(defs());
  for (let i = 0; i < 3; i++) applyEvent(o, { type: 'neutralized', tag: 'gunman' });
  assert.equal(primaryComplete(o), false);
  applyEvent(o, { type: 'bossDown' });
  assert.equal(primaryComplete(o), true);
});

test('protect objective fails when threshold exceeded, and only then', () => {
  const o = createObjectives(defs());
  assert.equal(primaryFailed(o), false);
  applyEvent(o, { type: 'civilianHurt' });
  assert.ok(o[3].failed);           // count 0 => first hurt fails it
  assert.equal(primaryFailed(o), false); // it was optional
});

test('an un-failed primary protect objective does not block completion', () => {
  const o = createObjectives([
    { id: 'clear', label: 'clear', primary: true, type: 'evidence', count: 1 },
    { id: 'vip', label: 'protect', primary: true, type: 'protect', count: 1 },
  ]);
  applyEvent(o, { type: 'evidence' });
  applyEvent(o, { type: 'civilianHurt' }); // one strike, within allowance
  assert.equal(primaryComplete(o), true);
  assert.equal(primaryFailed(o), false);
});

test('a failed primary protect objective fails the mission', () => {
  const o = createObjectives([
    { id: 'vip', label: 'Keep the witness alive', primary: true, type: 'protect', count: 0 },
  ]);
  applyEvent(o, { type: 'civilianHurt' });
  assert.equal(primaryFailed(o), true);
});

test('arrests-only objective ignores kills', () => {
  const o = createObjectives(defs());
  applyEvent(o, { type: 'neutralized' });
  assert.equal(o[2].progress, 0);
  applyEvent(o, { type: 'arrested' });
  applyEvent(o, { type: 'arrested' });
  assert.ok(o[2].done);
});

test('evidence objective counts pickups', () => {
  const o = createObjectives(defs());
  applyEvent(o, { type: 'evidence' });
  applyEvent(o, { type: 'evidence' });
  assert.ok(o[4].done);
});

test('summary exposes UI-ready rows', () => {
  const o = createObjectives(defs());
  applyEvent(o, { type: 'arrested', tag: 'gunman' });
  const rows = summary(o);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].progress, 1);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].primary, true);
});

test('done objectives stop accumulating', () => {
  const o = createObjectives([{ id: 'x', label: 'x', primary: true, type: 'evidence', count: 1 }]);
  applyEvent(o, { type: 'evidence' });
  applyEvent(o, { type: 'evidence' });
  assert.equal(o[0].progress, 1);
});
