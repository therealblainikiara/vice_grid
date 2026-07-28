import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCinematic } from '../src/cutscene.js';

test('a mission with no cinematic resolves to null', () => {
  assert.equal(resolveCinematic({ id: 'm', title: 'M' }), null);
});

test('a src cinematic resolves to a video clip', () => {
  const c = resolveCinematic({ id: 'm14', title: 'HALCYON HQ', cinematic: { src: 'assets/cine/m14.mp4' } });
  assert.equal(c.kind, 'video');
  assert.equal(c.src, 'assets/cine/m14.mp4');
  assert.equal(c.title, 'HALCYON HQ');   // falls back to mission title
  assert.equal(c.skippable, true);       // default
});

test('a text-only cinematic resolves to a title card', () => {
  const c = resolveCinematic({ id: 'm14', title: 'HALCYON HQ', cinematic: { title: 'THE BOARD', lines: ['They meet at midnight.'] } });
  assert.equal(c.kind, 'card');
  assert.equal(c.src, null);
  assert.equal(c.title, 'THE BOARD');
  assert.deepEqual(c.lines, ['They meet at midnight.']);
  assert.ok(c.seconds > 0, 'a card needs an auto-advance duration');
});

test('the cinematics setting off suppresses playback', () => {
  const m = { id: 'm14', title: 'M', cinematic: { src: 'x.mp4' } };
  assert.equal(resolveCinematic(m, { cinematics: false }), null);
  assert.ok(resolveCinematic(m, { cinematics: true }));
});

test('skippable can be turned off explicitly', () => {
  const c = resolveCinematic({ id: 'm', title: 'M', cinematic: { src: 'x.mp4', skippable: false } });
  assert.equal(c.skippable, false);
});
