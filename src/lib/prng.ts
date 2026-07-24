/**
 * Seeded randomness — the determinism guarantee (spec §5).
 * Same seed → bit-for-bit identical weight init, so demos and beats reproduce.
 * Ported verbatim from the locked prototypes (assets/01, 03, 04).
 */

/** mulberry32 — small, fast, seedable. Returns a [0,1) generator. */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller standard normal, drawn from a seeded uniform source. */
export function gauss(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
