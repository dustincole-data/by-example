import { describe, it, expect } from 'vitest';
import { initNet, forward, train, metrics, cloneNet, HID, EPOCHS, SEED, LR_SANDBOX } from './net';
import { blobs } from './presets';
import type { Point } from './types';

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

describe('determinism (spec §5 — seeded init + fixed order → reproducible demos)', () => {
  it('same seed gives bit-for-bit identical init', () => {
    expect(initNet(SEED)).toEqual(initNet(SEED));
  });

  it('different seeds give different init', () => {
    expect(initNet(SEED)).not.toEqual(initNet(SEED + 1));
  });

  it('same data + lr + seed gives a bit-for-bit identical run', () => {
    const data = blobs(SEED);
    const a = train(data, LR_SANDBOX, SEED);
    const b = train(data, LR_SANDBOX, SEED);
    expect(a[EPOCHS]!.w).toEqual(b[EPOCHS]!.w);
    expect(a[EPOCHS]!.loss).toBe(b[EPOCHS]!.loss);
  });

  it('cloneNet is a deep copy — mutating the clone cannot corrupt a snapshot', () => {
    const w = initNet(SEED);
    const c = cloneNet(w);
    c.W1[0]![0] = 999;
    c.b1[0] = 999;
    expect(w.W1[0]![0]).not.toBe(999);
    expect(w.b1[0]).not.toBe(999);
  });
});

describe('training is real (spec §5 — nothing is scripted or faked)', () => {
  const data = blobs(SEED);
  const hist = train(data, LR_SANDBOX, SEED);

  it('records init at epoch 0 and every epoch through the budget', () => {
    expect(hist).toHaveLength(EPOCHS + 1);
    expect(hist[0]!.w).toEqual(initNet(SEED));
  });

  it('loss falls monotonically under full-batch gradient descent', () => {
    for (let e = 1; e <= EPOCHS; e++) {
      expect(hist[e]!.loss).toBeLessThanOrEqual(hist[e - 1]!.loss);
    }
  });

  it('confidence climbs from near-zero to near-certain — the quantity the snap reads', () => {
    expect(hist[0]!.conf).toBeLessThan(0.75);
    expect(hist[EPOCHS]!.conf).toBeGreaterThan(hist[0]!.conf);
    expect(hist[EPOCHS]!.conf).toBeGreaterThan(0.9);
  });

  it('the recorded metrics are the model, not a script', () => {
    const m = metrics(hist[EPOCHS]!.w, data);
    expect(m.acc).toBeCloseTo(hist[EPOCHS]!.acc, 12);
    expect(m.loss).toBeCloseTo(hist[EPOCHS]!.loss, 12);
  });

  it('accuracy is the real fraction of correctly classified examples', () => {
    const w = hist[EPOCHS]!.w;
    let correct = 0;
    for (const d of data) if ((forward(w, d.x).p >= 0.5 ? 1 : 0) === d.y) correct++;
    expect(metrics(w, data).acc).toBe(correct / data.length);
  });
});

describe('the hidden layer earns its keep (spec §9 acceptance)', () => {
  it('learns XOR, which no linear boundary can separate', () => {
    const q: Point[] = [
      { x: [-0.5, 0.5], y: 0 },
      { x: [0.5, -0.5], y: 0 },
      { x: [0.5, 0.5], y: 1 },
      { x: [-0.5, -0.5], y: 1 },
    ];
    const hist = train(q, LR_SANDBOX, SEED, 2000);
    expect(hist[2000]!.acc).toBe(1);
  });
});
