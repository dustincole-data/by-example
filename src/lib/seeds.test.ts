import { describe, it, expect, beforeEach } from 'vitest';
import { SEEDS, SEED_EPOCHS, seedPoints } from './seeds';
import { initNet, forward, step, metrics, SEED, LR } from './net';
import { ny, syncDomain, YR } from './field';

beforeEach(() => { syncDomain(1, 1); });

const settledSeeds = () => {
  const data = seedPoints();
  const w = initNet(SEED);
  for (let i = 0; i < SEED_EPOCHS; i++) step(w, data, LR);
  return { w, data };
};

describe('the six seeds', () => {
  it('opens with six, three of each class', () => {
    expect(SEEDS).toHaveLength(6);
    const ripe = SEEDS.filter((s) => s[2] === 0);
    expect(ripe).toHaveLength(3);
  });

  it('arrives already settled — the first thing on screen fits its own examples', () => {
    const { w, data } = settledSeeds();
    expect(metrics(w, data).correct).toBe(6);
  });

  /*
    The seeds ARE the on-ramp: with `how soft` on Y they teach *sweet + soft = ripe*,
    which is the rule the first-timer already believes about fruit. Under the old
    `how firm` label the identical seeds asserted the opposite (ticket 11, D2), so this
    is the test that would have caught it.
  */
  it('teaches sweet + soft = ripe, and its opposite = not ripe', () => {
    const { w } = settledSeeds();
    expect(forward(w, [0.9, 0.9]).p).toBeLessThan(0.5); // sweet + soft → ripe
    expect(forward(w, [-0.9, -0.9]).p).toBeGreaterThan(0.5); // not sweet + firm → not ripe
  });
});

describe('seeds are authored square and stretched into the live domain', () => {
  it('spreads them down a tall field instead of squashing them into a band', () => {
    syncDomain(390, 648);
    const pts = seedPoints();
    const ys = pts.map((p) => ny(p.x[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.5);
  });

  it('lands every seed at the same relative position whatever the box aspect', () => {
    syncDomain(1, 1);
    const square = seedPoints().map((p) => ny(p.x[1]));
    for (const [w, h] of [[390, 648], [1440, 900]] as [number, number][]) {
      syncDomain(w, h);
      seedPoints().forEach((p, i) => { expect(ny(p.x[1])).toBeCloseTo(square[i]!, 10); });
    }
  });

  it('keeps every seed inside the domain', () => {
    syncDomain(390, 648);
    for (const p of seedPoints()) expect(Math.abs(p.x[1])).toBeLessThanOrEqual(YR[1]);
  });
});
