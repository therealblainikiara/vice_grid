import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizedStick } from '../src/touch.js';

const rect = { left: 100, top: 50, width: 120, height: 120 };

test('touch stick is neutral inside its dead zone', () => {
  assert.deepEqual(normalizedStick(160, 110, rect), { x: 0, y: 0, strength: 0 });
});

test('touch stick preserves direction within its radius', () => {
  const value = normalizedStick(190, 110, rect);
  assert.equal(value.x, 0.5);
  assert.equal(value.y, 0);
  assert.equal(value.strength, 0.5);
});

test('touch stick clamps drags beyond its radius', () => {
  const value = normalizedStick(280, 110, rect);
  assert.equal(value.x, 1);
  assert.equal(value.y, 0);
  assert.equal(value.strength, 1);
});
