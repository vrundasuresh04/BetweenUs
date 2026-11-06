import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePGS } from './pgs';

test('PGS is 0 when all ratings are identical', () => {
  const partnerA = { communication: 4, trust: 4, support: 4, conflict: 4 };
  const partnerB = { communication: 4, trust: 4, support: 4, conflict: 4 };
  const result = calculatePGS(partnerA, partnerB);

  assert.equal(result.pgs, 0);
  assert.equal(result.divergenceLevel, 'minimal');
  assert.equal(result.normalizedPercentage, 0);
});

test('PGS calculates correctly for exact formula: [(A1-B1)^2 + (A2-B2)^2 + (A3-B3)^2 + (A4-B4)^2] / 4', () => {
  // A: [2, 4, 3, 2]
  // B: [4, 4, 4, 3]
  // Deltas: |2-4|=2 -> 4; |4-4|=0 -> 0; |3-4|=1 -> 1; |2-3|=1 -> 1
  // Sum = 4 + 0 + 1 + 1 = 6
  // PGS = 6 / 4 = 1.5
  const partnerA = { communication: 2, trust: 4, support: 3, conflict: 2 };
  const partnerB = { communication: 4, trust: 4, support: 4, conflict: 3 };
  const result = calculatePGS(partnerA, partnerB);

  assert.equal(result.pgs, 1.5);
  assert.equal(result.divergenceLevel, 'mild');
  assert.equal(result.gaps[0].delta, 2);
  assert.equal(result.gaps[0].squaredDelta, 4);
});

test('PGS reaches maximum 16 when ratings are at opposite extremes (1 vs 5)', () => {
  // Deltas: 4, 4, 4, 4 -> squared 16 * 4 = 64 / 4 = 16
  const partnerA = { communication: 1, trust: 1, support: 1, conflict: 1 };
  const partnerB = { communication: 5, trust: 5, support: 5, conflict: 5 };
  const result = calculatePGS(partnerA, partnerB);

  assert.equal(result.pgs, 16);
  assert.equal(result.normalizedPercentage, 100);
  assert.equal(result.divergenceLevel, 'significant');
});

test('PGS handles out-of-bounds ratings by clamping to [1, 5]', () => {
  const partnerA = { communication: -2, trust: 10, support: 3, conflict: 3 };
  const partnerB = { communication: 1, trust: 5, support: 3, conflict: 3 };
  const result = calculatePGS(partnerA, partnerB);

  // Clamped A becomes [1, 5, 3, 3], matching B [1, 5, 3, 3]
  assert.equal(result.pgs, 0);
});
