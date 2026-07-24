/**
 * The ML — real, not faked (spec §5, engine LOCKED by ticket 02).
 * Hand-rolled MLP 2 → 8 → 1, tanh hidden + sigmoid output, binary cross-entropy,
 * full-batch gradient descent. Zero dependencies; arithmetic order is preserved
 * verbatim from the locked prototypes so runs stay bit-for-bit reproducible.
 */
import { mulberry32, gauss, clamp } from './prng';
import type { Net, Point, Snapshot } from './types';

/** Hidden width — LOCKED at 8 (ticket 04). Also = how many nodes the net panel draws. */
export const HID = 8;
/** Epoch budget for a full sandbox Train. */
export const EPOCHS = 240;
/** The demo seed. Fixed training order + seeded init → reproducible. */
export const SEED = 0x7eac;
/** Learning rate: the on-ramp trains at the value its choreography was measured against… */
export const LR_ONRAMP = 0.55;
/** …the sandbox is revealed at 1.5, where all four presets converge on every seed (ticket 04). */
export const LR_SANDBOX = 1.5;

const sig = (z: number): number => 1 / (1 + Math.exp(-z));

/** Xavier-ish init scaled by the seeded PRNG (gauss × 0.9, biases × 0.3). */
export function initNet(seed: number): Net {
  const rnd = mulberry32(seed);
  const s = 0.9;
  const W1: [number, number][] = [];
  const b1: number[] = [];
  const W2: number[] = [];
  for (let j = 0; j < HID; j++) {
    W1.push([gauss(rnd) * s, gauss(rnd) * s]);
    b1.push(gauss(rnd) * 0.3);
    W2.push(gauss(rnd) * s);
  }
  return { W1, b1, W2, b2: 0 };
}

/** Forward pass. Returns the hidden activations (the net panel reads these) and p(class B). */
export function forward(w: Net, x: readonly [number, number]): { a1: number[]; p: number } {
  const a1 = new Array<number>(HID);
  let z2 = w.b2;
  for (let j = 0; j < HID; j++) {
    const z = w.b1[j]! + w.W1[j]![0] * x[0] + w.W1[j]![1] * x[1];
    a1[j] = Math.tanh(z);
    z2 += w.W2[j]! * a1[j]!;
  }
  return { a1, p: sig(z2) };
}

export function cloneNet(w: Net): Net {
  return {
    W1: w.W1.map((r) => [r[0], r[1]] as [number, number]),
    b1: w.b1.slice(),
    W2: w.W2.slice(),
    b2: w.b2,
  };
}

/**
 * The model's real metrics. `conf` = mean confidence |p−0.5|×2 — the quantity the
 * snap is measured on (spec §4.4: accuracy is pinned at 1.00 by epoch 1–2 on
 * hand-placed points, so it cannot mark the moment the boundary settles).
 */
export function metrics(w: Net, data: readonly Point[]): { loss: number; acc: number; conf: number } {
  let loss = 0;
  let correct = 0;
  let conf = 0;
  for (const d of data) {
    const { p } = forward(w, d.x);
    const y = d.y;
    loss += -(y * Math.log(clamp(p, 1e-7, 1)) + (1 - y) * Math.log(clamp(1 - p, 1e-7, 1)));
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
    conf += Math.abs(p - 0.5) * 2;
  }
  const n = data.length || 1;
  return { loss: loss / n, acc: correct / n, conf: conf / n };
}

/**
 * Full-batch gradient descent. Records a snapshot BEFORE each step, so
 * `hist[0]` is the untrained init and `hist[EPOCHS]` is the converged model.
 */
export function train(data: readonly Point[], lr: number, seed: number, epochs = EPOCHS): Snapshot[] {
  const w = initNet(seed);
  const hist: Snapshot[] = [];
  for (let e = 0; e <= epochs; e++) {
    const m = metrics(w, data);
    hist.push({ w: cloneNet(w), acc: m.acc, loss: m.loss, conf: m.conf });

    const gW1: [number, number][] = Array.from({ length: HID }, () => [0, 0] as [number, number]);
    const gb1 = new Array<number>(HID).fill(0);
    const gW2 = new Array<number>(HID).fill(0);
    let gb2 = 0;
    for (const d of data) {
      const { a1, p } = forward(w, d.x);
      const dz2 = p - d.y;
      gb2 += dz2;
      for (let j = 0; j < HID; j++) {
        gW2[j]! += dz2 * a1[j]!;
        const dz1 = dz2 * w.W2[j]! * (1 - a1[j]! * a1[j]!);
        gW1[j]![0] += dz1 * d.x[0];
        gW1[j]![1] += dz1 * d.x[1];
        gb1[j]! += dz1;
      }
    }
    const n = data.length || 1;
    for (let j = 0; j < HID; j++) {
      w.W2[j]! -= (lr * gW2[j]!) / n;
      w.b1[j]! -= (lr * gb1[j]!) / n;
      w.W1[j]![0] -= (lr * gW1[j]![0]) / n;
      w.W1[j]![1] -= (lr * gW1[j]![1]) / n;
    }
    w.b2 -= (lr * gb2) / n;
  }
  return hist;
}
