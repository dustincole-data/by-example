/**
 * Pattern presets (ticket 14) - three shapes the field can be seeded with, so the
 * toy can show the "a straight line can't do this" range that tickets 07/08 cut
 * along with the buttons Dustin actually complained about.
 *
 * Ported from commit 9fa04c7 (blobs/xor/circles/moons), renamed off ML jargon to
 * stay inside the fruit metaphor, and trimmed to three: `moons` hits a capacity
 * wall under THIS engine's weight decay (WD=0.02, added by ticket 08 for
 * continuous training - the old batch-trained engine didn't have it). Swept
 * 26-5000 epochs and lr 1.5/3.0: plateaus at 82-86% no matter what, the same kind
 * of wall that already got `spiral` cut. Do not re-add without changing HID/WD,
 * which are locked for reasons unrelated to this ticket.
 */
import { mulberry32, gauss } from './prng';
import { SEEDS, seedPoints } from './seeds';
import type { Point } from './types';

type RawSeed = readonly [number, number, 0 | 1];

/** 2 - the canonical "a line cannot do this" - the hidden layer visibly earns its keep. */
function xorSeeds(seed: number): RawSeed[] {
  const rnd = mulberry32(seed);
  const pts: RawSeed[] = [];
  const q: RawSeed[] = [
    [-0.5, 0.5, 0],
    [0.5, -0.5, 0],
    [0.5, 0.5, 1],
    [-0.5, -0.5, 1],
  ];
  for (const [cx, cy, y] of q) {
    for (let i = 0; i < 8; i++) pts.push([cx + gauss(rnd) * 0.14, cy + gauss(rnd) * 0.14, y]);
  }
  return pts;
}

/** 3 - one class enclosed by the other - a CLOSED boundary. */
function circleSeeds(seed: number): RawSeed[] {
  const rnd = mulberry32(seed);
  const pts: RawSeed[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (2 * Math.PI * i) / 18;
    pts.push([Math.cos(t) * 0.28 + gauss(rnd) * 0.06, Math.sin(t) * 0.28 + gauss(rnd) * 0.06, 0]);
    pts.push([Math.cos(t) * 0.8 + gauss(rnd) * 0.06, Math.sin(t) * 0.8 + gauss(rnd) * 0.06, 1]);
  }
  return pts;
}

export type PresetKey = 'straight' | 'crisscross' | 'surrounded';

/** Fixed seed for every non-default generator's own randomness - reproducible,
 *  like `SEED` in net.ts. Verified during planning: crisscross fits 32/32,
 *  surrounded fits 36/36, at SEED_EPOCHS=600 with net.SEED=0x7eac init. */
export const PRESET_SEED = 0x7eac;

/** Ship order = the difficulty ladder: a straight line, then two shapes a
 *  straight line provably cannot separate. Each `gen` returns points already
 *  scaled into the live domain (via `seedPoints`, same as the default 6). */
export const PRESETS: { key: PresetKey; gen: (seed: number) => Point[] }[] = [
  { key: 'straight', gen: () => seedPoints(SEEDS) },
  { key: 'crisscross', gen: (s) => seedPoints(xorSeeds(s)) },
  { key: 'surrounded', gen: (s) => seedPoints(circleSeeds(s)) },
];
