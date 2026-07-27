/**
 * The ML — real, not faked. Hand-rolled MLP 2 → h → 1, tanh hidden + sigmoid output,
 * binary cross-entropy, full-batch gradient descent. Width `h` is a property of the net
 * (spec §3.2, `HID_STEPS`), never a module constant. Zero dependencies; arithmetic order
 * is preserved verbatim from the locked prototypes so runs stay bit-for-bit reproducible.
 *
 * Training is CONTINUOUS (ticket 07): there is no Train button, no epoch budget and no
 * recorded history. Every example the user drops re-settles the SAME live weights in place.
 */
import { mulberry32, gauss, clamp } from './prng';
import type { Net, Point } from './types';

/** The shipped hidden-width ladder — spec §3.3. It is the visitor's one dial (T30). */
export const HID_STEPS = [1, 2, 4, 8, 16] as const;
export type Hid = (typeof HID_STEPS)[number];
export const HID_DEFAULT: Hid = 8;
/** Width is a property of the net, never of the module. */
export const widthOf = (w: Net): number => w.W1.length;
/** The demo seed. Fixed training order + seeded init → reproducible. */
export const SEED = 0x7eac;
/** Learning rate. One value now — the on-ramp that had its own rate is gone. */
export const LR = 1.5;

/**
 * L2 weight decay. Reopened by spec §3.4 — the old 0.02 was chosen to stop the field
 * saturating into two flat poles, a problem the renderer no longer has: the ground is
 * capped at GROUND_MAX 0.18 and confidence is carried by the iso-contour ladder, not by
 * saturation (spec §5.1).
 *
 * Measured at 0.02 vs 0.002: per-settle shrink 2.3e-3 → 0.548; agency (class-map flip from
 * one contradicting example) on crisscross 0.030 → 0.080; cells crossing p=0.1 on
 * crisscross 0 → 299 and on surrounded 0 → 180; `moons` 0.750 at EVERY width → 0.917-0.972.
 *
 * 0.0005 buys more agency again but costs the flat `moons` plateau beat 3 is built on.
 * It is the documented fallback if the §11.4 agency gate fails on device — and the beat-3
 * numbers must be re-measured before any copy quotes them.
 */
export const WD = 0.002;

const sig = (z: number): number => 1 / (1 + Math.exp(-z));

/** Xavier-ish init scaled by the seeded PRNG (gauss × 0.9, biases × 0.3). */
export function initNet(seed: number, hid: number): Net {
  const rnd = mulberry32(seed);
  const s = 0.9;
  const W1: [number, number][] = [];
  const b1: number[] = [];
  const W2: number[] = [];
  for (let j = 0; j < hid; j++) {
    W1.push([gauss(rnd) * s, gauss(rnd) * s]);
    b1.push(gauss(rnd) * 0.3);
    W2.push(gauss(rnd) * s);
  }
  return { W1, b1, W2, b2: 0 };
}

/** Forward pass. Returns the hidden activations (the net diagram reads these) and p(not ripe). */
export function forward(w: Net, x: readonly [number, number]): { a1: number[]; p: number } {
  const H = w.W1.length;
  const a1 = new Array<number>(H);
  let z2 = w.b2;
  for (let j = 0; j < H; j++) {
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
 * The model's real metrics. `correct` is what the status line reports as
 * "can't fit N of your M" — the only honest thing training-set counts can say.
 */
export function metrics(w: Net, data: readonly Point[]): { loss: number; correct: number } {
  let loss = 0;
  let correct = 0;
  for (const d of data) {
    const { p } = forward(w, d.x);
    const y = d.y;
    loss += -(y * Math.log(clamp(p, 1e-7, 1)) + (1 - y) * Math.log(clamp(1 - p, 1e-7, 1)));
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
  }
  return { loss: loss / (data.length || 1), correct };
}

/**
 * One full-batch gradient-descent epoch, IN PLACE — the continuous-training form.
 * The decay factor `k` is applied to the weights only, never the biases: decaying a
 * bias would drag the boundary toward the origin rather than just bounding |w|.
 */
export function step(w: Net, data: readonly Point[], lr: number): void {
  if (!data.length) return;
  const H = w.W1.length;
  const gW1: [number, number][] = Array.from({ length: H }, () => [0, 0] as [number, number]);
  const gb1 = new Array<number>(H).fill(0);
  const gW2 = new Array<number>(H).fill(0);
  let gb2 = 0;
  for (const d of data) {
    const { a1, p } = forward(w, d.x);
    const dz2 = p - d.y;
    gb2 += dz2;
    for (let j = 0; j < H; j++) {
      gW2[j]! += dz2 * a1[j]!;
      const dz1 = dz2 * w.W2[j]! * (1 - a1[j]! * a1[j]!);
      gW1[j]![0] += dz1 * d.x[0];
      gW1[j]![1] += dz1 * d.x[1];
      gb1[j]! += dz1;
    }
  }
  const n = data.length;
  const k = 1 - lr * WD;
  for (let j = 0; j < H; j++) {
    w.W2[j]! = w.W2[j]! * k - (lr * gW2[j]!) / n;
    w.b1[j]! -= (lr * gb1[j]!) / n;
    w.W1[j]![0] = w.W1[j]![0] * k - (lr * gW1[j]![0]) / n;
    w.W1[j]![1] = w.W1[j]![1] * k - (lr * gW1[j]![1]) / n;
  }
  w.b2 -= (lr * gb2) / n;
}
