import { describe, it, expect } from 'vitest';
import { SETTLE_MS, EPOCH_RATE, SETTLE_EPOCHS, epochsBy, MOVED_FRAC } from './pacing';
import { initNet, step, SEED, LR } from './net';
import { computeField, signOf, GRID_LO } from './field';
import type { Point } from './types';

describe('the settle window', () => {
  it('runs 200 epochs across 800 ms', () => {
    expect(SETTLE_MS).toBe(800);
    expect(SETTLE_EPOCHS).toBe(200);
    expect(SETTLE_MS * EPOCH_RATE).toBe(SETTLE_EPOCHS);
  });

  /*
    Paced by ELAPSED TIME, not by frame count and not eased: a 30 fps phone and a 120 Hz
    desktop must see the same choreography, and a dropped frame must skip epochs rather
    than stretch the run. Easing the epochs over the window double-counts the ease —
    gradient descent already decelerates — and read as a snap (ticket 08).
  */
  it('is frame-rate independent — the epoch shown is a pure function of elapsed time', () => {
    for (const fps of [30, 60, 120]) {
      const dt = 1000 / fps;
      let t = 0;
      let last = 0;
      while (t < SETTLE_MS) { t += dt; last = epochsBy(t); }
      expect(last).toBe(SETTLE_EPOCHS);
    }
    expect(epochsBy(SETTLE_MS / 2)).toBe(SETTLE_EPOCHS / 2);
  });

  it('is linear in time, so the second half still moves pixels', () => {
    const firstHalf = epochsBy(SETTLE_MS / 2);
    expect(epochsBy(SETTLE_MS) - firstHalf).toBe(firstHalf);
  });

  it('never runs past the window or before it starts', () => {
    expect(epochsBy(-50)).toBe(0);
    expect(epochsBy(SETTLE_MS * 10)).toBe(SETTLE_EPOCHS);
  });
});

/*
  "Moved the line" replaced self-graded training-set accuracy, which read "gets all N
  right" almost always and so carried near-zero information. It compares the 64² class map
  before and after the settle: cheap, and the honest answer to what the machine just learned.
*/
describe('MOVED_FRAC — did the boundary actually move?', () => {
  const base: Point[] = [
    { x: [0.6, 0.5], y: 0 }, { x: [0.8, 0.35], y: 0 },
    { x: [-0.6, -0.5], y: 1 }, { x: [-0.8, -0.35], y: 1 },
  ];
  const flipped = (next: Point[]): number => {
    const w = initNet(SEED);
    for (let i = 0; i < SETTLE_EPOCHS; i++) step(w, base, LR);
    const before = signOf(computeField(w, GRID_LO));
    for (let i = 0; i < SETTLE_EPOCHS; i++) step(w, next, LR);
    const after = signOf(computeField(w, GRID_LO));
    let n = 0;
    for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) n++;
    return n / after.length;
  };

  it('fires on an example that contradicts the rule so far', () => {
    expect(flipped([...base, { x: [0.7, 0.6], y: 1 }])).toBeGreaterThan(MOVED_FRAC);
  });

  it('stays quiet when the same examples simply settle further', () => {
    expect(flipped(base)).toBeLessThanOrEqual(MOVED_FRAC);
  });
});
