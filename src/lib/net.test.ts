import { describe, it, expect } from 'vitest';
import { initNet, forward, step, metrics, cloneNet, HID, SEED, LR, WD } from './net';
import type { Net, Point } from './types';

const twoBlobs: Point[] = [
  { x: [0.6, 0.5], y: 0 }, { x: [0.8, 0.35], y: 0 }, { x: [0.45, 0.7], y: 0 },
  { x: [-0.6, -0.5], y: 1 }, { x: [-0.8, -0.35], y: 1 }, { x: [-0.45, -0.7], y: 1 },
];
const settle = (data: Point[], epochs: number, seed = SEED): Net => {
  const w = initNet(seed);
  for (let i = 0; i < epochs; i++) step(w, data, LR);
  return w;
};
const maxAbsW = (w: Net): number =>
  Math.max(...w.W1.flat().map(Math.abs), ...w.W2.map(Math.abs));

describe('net shape', () => {
  it('is a fixed 2 → 8 → 1 MLP', () => {
    const w = initNet(SEED);
    expect(w.W1).toHaveLength(HID);
    expect(w.W1[0]).toHaveLength(2);
    expect(w.b1).toHaveLength(HID);
    expect(w.W2).toHaveLength(HID);
    expect(typeof w.b2).toBe('number');
  });

  it('forward returns 8 tanh activations and a sigmoid probability', () => {
    const { a1, p } = forward(initNet(SEED), [0.3, -0.2]);
    expect(a1).toHaveLength(HID);
    for (const a of a1) expect(Math.abs(a)).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('determinism — seeded init + fixed order → reproducible', () => {
  it('same seed gives bit-for-bit identical init', () => {
    expect(initNet(SEED)).toEqual(initNet(SEED));
  });

  it('different seeds give different init', () => {
    expect(initNet(SEED)).not.toEqual(initNet(SEED + 1));
  });

  it('the same examples settle to a bit-for-bit identical model', () => {
    expect(settle(twoBlobs, 200)).toEqual(settle(twoBlobs, 200));
  });

  it('cloneNet is a deep copy — the undo snapshot must not alias the live weights', () => {
    const w = initNet(SEED);
    const snap = cloneNet(w);
    for (let i = 0; i < 50; i++) step(w, twoBlobs, LR);
    expect(snap).toEqual(initNet(SEED));
  });
});

describe('training is real — nothing is scripted or faked', () => {
  it('gradient descent drives the loss down and fits both blobs', () => {
    const before = metrics(initNet(SEED), twoBlobs);
    const after = metrics(settle(twoBlobs, 200), twoBlobs);
    expect(after.loss).toBeLessThan(before.loss);
    expect(after.correct).toBe(twoBlobs.length);
  });

  it('loss falls monotonically, epoch by epoch', () => {
    const w = initNet(SEED);
    let prev = metrics(w, twoBlobs).loss;
    for (let e = 0; e < 200; e++) {
      step(w, twoBlobs, LR);
      const loss = metrics(w, twoBlobs).loss;
      expect(loss).toBeLessThanOrEqual(prev + 1e-12);
      prev = loss;
    }
  });

  it('`correct` is the real count of correctly classified examples', () => {
    const w = settle(twoBlobs, 200);
    let correct = 0;
    for (const d of twoBlobs) if ((forward(w, d.x).p >= 0.5 ? 1 : 0) === d.y) correct++;
    expect(metrics(w, twoBlobs).correct).toBe(correct);
  });

  it('an empty set is a no-op, not a divide-by-zero — reset leaves a clean model', () => {
    const w = initNet(SEED);
    step(w, [], LR);
    expect(w).toEqual(initNet(SEED));
    expect(metrics(w, []).loss).toBe(0);
  });
});

describe('the hidden layer earns its keep', () => {
  it('learns XOR, which no linear boundary can separate', () => {
    const q: Point[] = [
      { x: [-0.5, 0.5], y: 0 },
      { x: [0.5, -0.5], y: 0 },
      { x: [0.5, 0.5], y: 1 },
      { x: [-0.5, -0.5], y: 1 },
    ];
    expect(metrics(settle(q, 2000), q).correct).toBe(4);
  });
});

/*
  The engine finding that makes CONTINUOUS training viable at all (ticket 08). Without
  decay, every tap drives |w| up until confidence saturates: the field flattens to two
  flat poles, the marks vanish into ground of their own colour, and the boundary stops
  visibly moving. These are the guard on WD ever being dropped or zeroed.
*/
describe('L2 weight decay — required by continuous training', () => {
  it('makes |w| CONVERGE instead of growing without bound', () => {
    // On separable data an undecayed net keeps pushing |w| up forever to buy confidence,
    // which is exactly the saturation that erases the marks. With decay it plateaus.
    const w = initNet(SEED);
    let ran = 0;
    const at = (n: number): number => {
      while (ran < n) { step(w, twoBlobs, LR); ran++; }
      return maxAbsW(w);
    };
    const early = at(200);
    const settled = at(2000);
    const forever = at(16000);
    expect(settled).toBeLessThan(early); // decay pulls it down…
    expect(Math.abs(forever - settled)).toBeLessThan(1e-3); // …to a fixed point, and holds
    expect(metrics(w, twoBlobs).correct).toBe(twoBlobs.length); // while still fitting
  });

  it('bounds |w| under long continuous training, so tap #20 still bends the line', () => {
    expect(WD).toBeGreaterThan(0);
    // 20 examples' worth of settles back to back, the way the live toy runs.
    const w = initNet(SEED);
    for (let i = 0; i < 20; i++) for (let e = 0; e < 200; e++) step(w, twoBlobs, LR);
    expect(maxAbsW(w)).toBeLessThan(1 / (LR * WD)); // the decay fixed point
    // …and the model has not saturated, i.e. the ground is still soft under the marks.
    expect(forward(w, [0.6, 0.5]).p).toBeLessThan(0.999);
  });
});
