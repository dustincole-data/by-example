/**
 * The four patterns — spec §4.
 *
 * ONE generator per pattern, and it is the source of BOTH the visitor-facing examples and
 * the 12-point holdout the hero number is scored on. A holdout drawn from a different
 * distribution makes the score wobble instead of climb (measured: `straight` went
 * 4 → 12 → 8 with a uniform holdout, 0 → 6 → 12 with a matched one).
 *
 * The emission index `i` selects the next quadrant / ring / arc, so ANY PREFIX of the
 * sequence covers the structure evenly. This is not tidiness: the old generators emitted
 * all of one class first, and taught in that order the model sat at "everything is ripe"
 * for 16 examples while the hero number did not move.
 *
 * `moons` is restored. It was cut (old presets.ts:6-13) for a capacity wall it never had —
 * WD = 0.02 pinned it at 0.750 for EVERY width from 1 to 16. At WD = 0.002 it reaches
 * 22-23 of 24, and the residual error is genuine class overlap, which is beat 3's lesson.
 */
import { mulberry32, gauss } from './prng';
import type { Point } from './types';

export type PatternKey = 'straight' | 'crisscross' | 'surrounded' | 'moons';

export const PATTERN_ORDER: readonly PatternKey[] = ['straight', 'crisscross', 'surrounded', 'moons'];
export const PATTERN_N: Record<PatternKey, number> =
  { straight: 12, crisscross: 32, surrounded: 24, moons: 24 };
/** Fewest helpers that solve it, measured over 3 net seeds (spec §3.3). null = never. */
export const PATTERN_HELPERS: Record<PatternKey, number | null> =
  { straight: 1, crisscross: 4, surrounded: 4, moons: null };

export const PRESET_SEED = 0x7eac;
export const HOLDOUT_SEED = 0x0d15;
export const HOLDOUT_N = 12;

type Emit = (rnd: () => number, i: number) => readonly [number, number, 0 | 1];

const QUAD: readonly (readonly [number, number, 0 | 1])[] =
  [[-0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, -0.5, 0], [-0.5, -0.5, 1]];

const GEN: Record<PatternKey, Emit> = {
  straight: (rnd, i) => (i % 2 === 0
    ? [0.56 + gauss(rnd) * 0.22, 0.5 + gauss(rnd) * 0.22, 0]
    : [-0.57 + gauss(rnd) * 0.22, -0.29 + gauss(rnd) * 0.22, 1]),
  crisscross: (rnd, i) => {
    const q = QUAD[i % 4]!;
    return [q[0] + gauss(rnd) * 0.14, q[1] + gauss(rnd) * 0.14, q[2]];
  },
  surrounded: (rnd, i) => {
    const inner = i % 2 === 0;
    const r = inner ? 0.28 : 0.8;
    const t = (2 * Math.PI * Math.floor(i / 2)) / 12 + (inner ? 0 : 0.3);
    return [Math.cos(t) * r + gauss(rnd) * 0.06, Math.sin(t) * r + gauss(rnd) * 0.06, inner ? 0 : 1];
  },
  moons: (rnd, i) => {
    const up = i % 2 === 0;
    const t = (Math.PI * (Math.floor(i / 2) % 9)) / 8;
    return up
      ? [Math.cos(t) * 0.75 - 0.15 + gauss(rnd) * 0.06, Math.sin(t) * 0.75 - 0.28 + gauss(rnd) * 0.06, 0]
      : [Math.cos(t + Math.PI) * 0.75 + 0.15 + gauss(rnd) * 0.06,
         Math.sin(t + Math.PI) * 0.75 + 0.28 + gauss(rnd) * 0.06, 1];
  },
};

export function samplePattern(key: PatternKey, seed: number, n: number): Point[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const [x, y, l] = GEN[key](rnd, i);
    return { x: [x, y] as [number, number], y: l };
  });
}

/** The 12 points the score is on. Never trained on, never drawn as examples. */
export const makeHoldout = (key: PatternKey): Point[] =>
  samplePattern(key, HOLDOUT_SEED, HOLDOUT_N);
