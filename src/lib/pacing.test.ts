import { describe, it, expect } from 'vitest';
import { planRun, MIN_WIN, MAX_WIN, TAIL, ONRAMP_DUR, SNAP_SETTLE } from './pacing';
import { train, SEED, LR_ONRAMP } from './net';
import { moons } from './presets';
import type { Point } from './types';

const A = (x: number, y: number): Point => ({ x: [x, y], y: 0 });
const B = (x: number, y: number): Point => ({ x: [x, y], y: 1 });

/**
 * The eight placements spec §4.4 verified the derived window against. These are
 * HAND-PLACED sets, which is the only thing the on-ramp ever trains on — the
 * presets are sandbox-only and always play the full 240-epoch run.
 */
const PLACEMENTS: [string, Point[]][] = [
  ['textbook', [A(-0.5, 0.4), A(-0.35, 0.6), A(-0.6, 0.25), B(0.45, -0.4), B(0.6, -0.2), B(0.3, -0.55)]],
  ['close together', [A(-0.12, 0.1), A(-0.18, 0.02), A(-0.08, 0.18), B(0.12, -0.1), B(0.18, -0.02), B(0.08, -0.18)]],
  ['vertical', [A(-0.4, 0.6), A(0.0, 0.6), A(0.4, 0.6), B(-0.4, -0.6), B(0.0, -0.6), B(0.4, -0.6)]],
  ['interleaved', [A(-0.4, 0.1), A(0.0, 0.15), A(0.4, 0.1), B(-0.4, -0.1), B(0.0, -0.15), B(0.4, -0.1)]],
  ['1 + 1', [A(-0.5, 0.5), B(0.5, -0.5)]],
  ['lopsided', [A(-0.6, 0.5), A(-0.4, 0.3), A(-0.55, 0.15), A(-0.3, 0.55), A(-0.45, 0.42), B(0.5, -0.45)]],
  ['many points', Array.from({ length: 24 }, (_, i) =>
    i % 2 === 0 ? A(-0.3 - (i / 24) * 0.4, 0.3 + (i / 48)) : B(0.3 + (i / 24) * 0.4, -0.3 - (i / 48))),
  ],
  ['beat-3 intruder', [A(-0.5, 0.4), A(-0.35, 0.6), A(-0.6, 0.25), B(0.45, -0.4), B(0.6, -0.2), B(0.3, -0.55), A(0.5, -0.35)]],
];

describe('the snap is a real model event (spec §4.4)', () => {
  it('fires at the first epoch confidence reaches 95% of the run’s final value', () => {
    const hist = train(PLACEMENTS[0]![1], LR_ONRAMP, SEED);
    const { snapEpoch } = planRun(hist);
    const target = SNAP_SETTLE * hist[hist.length - 1]!.conf;
    expect(hist[snapEpoch]!.conf).toBeGreaterThanOrEqual(target);
    expect(hist[snapEpoch - 1]!.conf).toBeLessThan(target);
  });

  it('is NOT accuracy — accuracy pins at 1.00 long before the boundary settles', () => {
    // The textbook placement is the case §4.4 measured: an 8-unit tanh net separates
    // two blobs essentially at init, so an `acc ≥ 0.90` trigger fired at epoch 1 of 240.
    expect(train(PLACEMENTS[0]![1], LR_ONRAMP, SEED)[2]!.acc).toBe(1);

    for (const [name, data] of PLACEMENTS) {
      const hist = train(data, LR_ONRAMP, SEED);
      // accuracy is a spent signal — it reaches its final value and then sits there,
      // long before confidence settles. Only confidence still moves at the snap.
      const finalAcc = hist[hist.length - 1]!.acc;
      const accEpoch = hist.findIndex((h) => h.acc === finalAcc);
      expect(accEpoch, name).toBeLessThan(planRun(hist).snapEpoch);
    }
  });
});

describe('the playback window is derived from the snap, not fixed (spec §4.4)', () => {
  for (const [name, data] of PLACEMENTS) {
    it(`${name}: the snap lands ~59% through the window, inside it every time`, () => {
      const { snapEpoch, rampEnd, rampEps } = planRun(train(data, LR_ONRAMP, SEED));
      expect(rampEnd).toBeGreaterThanOrEqual(MIN_WIN);
      expect(rampEnd).toBeLessThanOrEqual(MAX_WIN);
      expect(snapEpoch).toBeLessThanOrEqual(rampEnd);
      // wall-clock: the window plays over ONRAMP_DUR at a constant rate
      expect(rampEnd / rampEps).toBeCloseTo(ONRAMP_DUR, 6);
      // the snap must be legible: never in the first 15% or the last 10% of playback
      const frac = snapEpoch / rampEnd;
      expect(frac, name).toBeGreaterThan(0.15);
      expect(frac, name).toBeLessThanOrEqual(0.9);
    });
  }

  it('sizes the window to TAIL × snapEpoch when that lands inside the clamp', () => {
    for (const [name, data] of PLACEMENTS) {
      const { snapEpoch, rampEnd } = planRun(train(data, LR_ONRAMP, SEED));
      const raw = Math.round(TAIL * snapEpoch);
      if (raw >= MIN_WIN && raw <= MAX_WIN) expect(rampEnd, name).toBe(raw);
    }
  });

  it('clamps rather than running long on a set that settles very slowly', () => {
    // moons at the on-ramp lr settles around epoch ~190 — well past MAX_WIN. The window
    // clamps, so the snap falls outside it; the controller fires the payoff at window end
    // instead (`if (!snapFired) onSnap()`), so no beat can ever hang waiting for it.
    const { snapEpoch, rampEnd } = planRun(train(moons(SEED), LR_ONRAMP, SEED));
    expect(snapEpoch).toBeGreaterThan(MAX_WIN);
    expect(rampEnd).toBe(MAX_WIN);
  });
});
