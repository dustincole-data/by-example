/**
 * The map's one hard promise: never ship a preset the net can't fit (spec §5.1).
 * These tests re-run ticket 04's measurement against the shipped engine.
 */
import { describe, it, expect } from 'vitest';
import { train, forward, EPOCHS, LR_SANDBOX } from './net';
import { PRESETS, PRESET_GEN } from './presets';
import { planRun } from './pacing';
import type { Net, Point } from './types';

const SEEDS = [0x7eac, 0x1234, 0xbeef, 0x2027, 0x51d5, 0x0a11, 0x9f3c, 0x77aa];

/** ~400 fresh points from the same generator — does the boundary generalise, or just memorise? */
function heldOutAcc(w: Net, gen: (s: number) => Point[], seed: number): number {
  let correct = 0;
  let n = 0;
  for (let k = 0; k < 10; k++) {
    for (const d of gen(seed * 7919 + 31 + k * 101)) {
      if ((forward(w, d.x).p >= 0.5 ? 1 : 0) === d.y) correct++;
      n++;
    }
  }
  return correct / n;
}

describe('roster (spec §5.1 — LOCKED)', () => {
  it('ships exactly four presets, in the easy → aha → hard order', () => {
    expect(PRESETS.map((p) => p.key)).toEqual(['blobs', 'xor', 'circles', 'moons']);
  });

  it('has no spiral, in any variant — 0/8 at every setting swept, a capacity wall', () => {
    const keys = Object.keys(PRESET_GEN).join(' ') + ' ' + PRESETS.map((p) => p.label).join(' ');
    expect(keys.toLowerCase()).not.toMatch(/spiral|swirl/);
  });

  it('every preset is balanced two-class data', () => {
    for (const { key, gen } of PRESETS.map((p) => ({ key: p.key, gen: p.gen }))) {
      const d = gen(SEEDS[0]!);
      const a = d.filter((p) => p.y === 0).length;
      const b = d.filter((p) => p.y === 1).length;
      expect(a, key).toBeGreaterThan(0);
      expect(b, key).toBeGreaterThan(0);
      expect(a, key).toBe(b);
    }
  });
});

describe('every preset fits 8/8 seeds at the sandbox lr 1.5', () => {
  for (const { key, label, gen } of PRESETS) {
    it(`${label} — train acc ≥ 0.98 and held-out ≥ 0.95 on every seed`, () => {
      for (const s of SEEDS) {
        const hist = train(gen(s), LR_SANDBOX, s);
        const w = hist[EPOCHS]!.w;
        expect(hist[EPOCHS]!.acc, `${key} seed ${s} train`).toBeGreaterThanOrEqual(0.98);
        expect(heldOutAcc(w, gen, s), `${key} seed ${s} held-out`).toBeGreaterThanOrEqual(0.95);
      }
    });
  }
});

describe('the ladder is genuine', () => {
  it('snap epoch increases left-to-right, so the buttons read as "harder"', () => {
    const snaps = PRESETS.map(({ gen }) => planRun(train(gen(SEEDS[0]!), LR_SANDBOX, SEEDS[0]!)).snapEpoch);
    for (let i = 1; i < snaps.length; i++) {
      expect(snaps[i]!, `preset ${i} vs ${i - 1}`).toBeGreaterThan(snaps[i - 1]!);
    }
  });

  it('accuracy genuinely CLIMBS on the presets — this is where §1s accuracy-hero is earned', () => {
    for (const { label, gen } of PRESETS) {
      const hist = train(gen(SEEDS[0]!), LR_SANDBOX, SEEDS[0]!);
      expect(hist[EPOCHS]!.acc, label).toBeGreaterThan(hist[0]!.acc);
      expect(hist[0]!.acc, label).toBeLessThan(0.95);
    }
  });
});
