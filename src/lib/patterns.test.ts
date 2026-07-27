import { describe, it, expect } from 'vitest';
import {
  PATTERN_ORDER, PATTERN_N, PATTERN_HELPERS, PRESET_SEED, HOLDOUT_SEED, HOLDOUT_N,
  samplePattern, makeHoldout, type PatternKey,
} from './patterns';
import { initNet, step, metrics, LR, SEED } from './net';

const fit = (d: ReturnType<typeof makeHoldout>, h: number) => {
  const w = initNet(SEED, h);
  for (let i = 0; i < 600; i++) step(w, d, LR);
  return w;
};
const hits = (w: ReturnType<typeof fit>, d: ReturnType<typeof makeHoldout>) => metrics(w, d).correct;

describe('patterns', () => {
  it('ships four rungs including the restored moons', () => {
    expect([...PATTERN_ORDER]).toEqual(['straight', 'crisscross', 'surrounded', 'moons']);
    expect(PATTERN_N).toEqual({ straight: 12, crisscross: 32, surrounded: 24, moons: 24 });
  });

  it('is reproducible from its seed', () => {
    for (const k of PATTERN_ORDER) {
      expect(samplePattern(k, PRESET_SEED, 8)).toEqual(samplePattern(k, PRESET_SEED, 8));
    }
  });

  it('draws the holdout from the SAME generator, on its own seed', () => {
    expect(HOLDOUT_N).toBe(12);
    expect(HOLDOUT_SEED).not.toBe(PRESET_SEED);
    for (const k of PATTERN_ORDER) {
      expect(makeHoldout(k)).toHaveLength(12);
      expect(makeHoldout(k)).not.toEqual(samplePattern(k, PRESET_SEED, 12));
    }
  });

  /* Structure cycling: any prefix must cover both classes, or the model sits at
     "everything is ripe" for 16 examples and the hero number cannot move (spec §4). */
  it('covers both classes within the first four examples of every pattern', () => {
    for (const k of PATTERN_ORDER) {
      const first4 = samplePattern(k, PRESET_SEED, 4);
      expect(new Set(first4.map((p) => p.y)).size).toBe(2);
    }
  });

  /* The ladder, spec §3.3 — this is the pedagogy's load-bearing claim. */
  it('reproduces the measured helper ladder', () => {
    const data = (k: PatternKey) => samplePattern(k, PRESET_SEED, PATTERN_N[k]);
    expect(hits(fit(data('straight'), 1), data('straight'))).toBe(12);
    expect(hits(fit(data('crisscross'), 1), data('crisscross'))).toBeLessThan(32);
    expect(hits(fit(data('crisscross'), 4), data('crisscross'))).toBe(32);
    expect(hits(fit(data('surrounded'), 1), data('surrounded'))).toBeLessThan(24);
    expect(hits(fit(data('surrounded'), 4), data('surrounded'))).toBe(24);
    expect(PATTERN_HELPERS).toEqual({ straight: 1, crisscross: 4, surrounded: 4, moons: null });
  });

  /* Correction 3: there is NO capacity wall at 8 that 16 dissolves. More helpers stop
     paying — that is the beat-3 lesson, and it must stay true. */
  it('shows moons plateauing, with 8 and 16 buying nothing over 4', () => {
    const d = samplePattern('moons', PRESET_SEED, 24);
    const at = (h: number) => hits(fit(d, h), d);
    expect(at(4)).toBeGreaterThanOrEqual(21);
    expect(at(4)).toBeLessThan(24);
    expect(Math.abs(at(8) - at(4))).toBeLessThanOrEqual(2);
    expect(Math.abs(at(16) - at(4))).toBeLessThanOrEqual(2);
  });
});
