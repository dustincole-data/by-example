import { describe, it, expect } from 'vitest';
import { PRESETS, PRESET_SEED } from './presets';
import { initNet, step, metrics, SEED, LR } from './net';
import { SEED_EPOCHS } from './seeds';

describe('the preset roster', () => {
  it('ships straight, crisscross, surrounded — in that easy-to-hard order', () => {
    expect(PRESETS.map((p) => p.key)).toEqual(['straight', 'crisscross', 'surrounded']);
  });

  it('every non-default preset is balanced two-class data', () => {
    for (const { key, gen } of PRESETS) {
      if (key === 'straight') continue; // SEEDS' 3/3 split is already covered by seeds.test.ts
      const d = gen(PRESET_SEED);
      const a = d.filter((p) => p.y === 0).length;
      const b = d.filter((p) => p.y === 1).length;
      expect(a, key).toBeGreaterThan(0);
      expect(a, key).toBe(b);
    }
  });
});

describe('every preset fits cleanly at boot, at the shared SEED_EPOCHS budget', () => {
  for (const { key, gen } of PRESETS) {
    it(`${key} — 100% train accuracy after SEED_EPOCHS steps`, () => {
      const data = gen(PRESET_SEED);
      const w = initNet(SEED);
      for (let i = 0; i < SEED_EPOCHS; i++) step(w, data, LR);
      expect(metrics(w, data).correct).toBe(data.length);
    });
  }
});

describe('no capacity-wall pattern ships', () => {
  it('never re-adds moons/curvy — confirmed a capacity wall under this engine’s decay', () => {
    const keys = PRESETS.map((p) => p.key).join(' ');
    expect(keys).not.toMatch(/moon|curvy/);
  });
});
