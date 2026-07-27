import { describe, it, expect } from 'vitest';
import { score, scoreOn } from './score';
import { initNet, step, LR, SEED } from './net';
import { samplePattern, makeHoldout, PRESET_SEED } from './patterns';

describe('the hero number', () => {
  it('counts agreement on points the model never trained on', () => {
    const hold = makeHoldout('straight');
    const w = initNet(SEED, 8);
    expect(scoreOn(w, hold)).toBeGreaterThanOrEqual(0);
    expect(scoreOn(w, hold)).toBeLessThanOrEqual(12);
  });

  /* Spec §6.2: beat 1's payoff lands in TWO examples. If this regresses, the beat
     is broken and its copy is a lie. */
  it('climbs from 0 to 12 within two examples on `straight`', () => {
    const hold = makeHoldout('straight');
    const order = samplePattern('straight', PRESET_SEED, 12);
    const w = initNet(SEED, 8);
    const live: typeof order = [];
    const at: number[] = [scoreOn(w, hold)];
    for (const d of order.slice(0, 2)) {
      live.push(d);
      for (let e = 0; e < 200; e++) step(w, live, LR);
      at.push(scoreOn(w, hold));
    }
    expect(at[0]).toBeLessThanOrEqual(2);
    expect(at[2]).toBe(12);
  });

  /* Spec §6.2: beat 2's payoff lands in FOUR — one per quadrant. */
  it('reaches 12 by the fourth example on `crisscross`', () => {
    const hold = makeHoldout('crisscross');
    const order = samplePattern('crisscross', PRESET_SEED, 32);
    const w = initNet(SEED, 8);
    const live: typeof order = [];
    for (const d of order.slice(0, 4)) {
      live.push(d);
      for (let e = 0; e < 200; e++) step(w, live, LR);
    }
    expect(scoreOn(w, hold)).toBe(12);
  });

  it('reports shown and unseen separately, and never confuses them', () => {
    const data = samplePattern('crisscross', PRESET_SEED, 32);
    const hold = makeHoldout('crisscross');
    const w = initNet(SEED, 4);
    for (let e = 0; e < 600; e++) step(w, data, LR);
    const s = score(w, data, hold);
    expect(s.shownOf).toBe(32);
    expect(s.unseenOf).toBe(12);
    expect(s.shown).toBe(32);
    expect(s.unseen).toBe(12);
    expect(s.loss).toBeGreaterThan(0);
  });
});
