/**
 * Preset datasets — ROSTER LOCKED (spec §5.1, ticket 04). Four ship, in this order:
 * a genuine easy → aha → hard ladder, also strictly increasing in snap epoch
 * (9 → 58 → 144 → 151), so the buttons read left-to-right as "harder".
 *
 * Spiral is OUT, every variant: 0/8 seeds at every H × lr × epoch setting swept —
 * a capacity wall, not a tuning problem, and the architecture is fixed by fork 2.
 * Generators are verbatim from the ticket-03/04 benches.
 */
import { mulberry32, gauss } from './prng';
import type { Point } from './types';

/** 1 · linearly separable — the gentle first move. A straight boundary suffices. */
export function blobs(seed: number): Point[] {
  const rnd = mulberry32(seed);
  const data: Point[] = [];
  for (let i = 0; i < 16; i++) {
    data.push({ x: [-0.45 + gauss(rnd) * 0.18, 0.4 + gauss(rnd) * 0.18], y: 0 });
    data.push({ x: [0.45 + gauss(rnd) * 0.18, -0.4 + gauss(rnd) * 0.18], y: 1 });
  }
  return data;
}

/** 2 · the canonical "a line cannot do this" — the hidden layer visibly earns its keep. */
export function xor(seed: number): Point[] {
  const rnd = mulberry32(seed);
  const data: Point[] = [];
  const q: [number, number, 0 | 1][] = [
    [-0.5, 0.5, 0],
    [0.5, -0.5, 0],
    [0.5, 0.5, 1],
    [-0.5, -0.5, 1],
  ];
  for (const [cx, cy, y] of q) {
    for (let i = 0; i < 8; i++) data.push({ x: [cx + gauss(rnd) * 0.14, cy + gauss(rnd) * 0.14], y });
  }
  return data;
}

/** 3 · one class enclosed by the other — a CLOSED boundary. Best drama: flat, then breakthrough. */
export function circles(seed: number): Point[] {
  const rnd = mulberry32(seed);
  const data: Point[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (2 * Math.PI * i) / 18;
    data.push({ x: [Math.cos(t) * 0.28 + gauss(rnd) * 0.06, Math.sin(t) * 0.28 + gauss(rnd) * 0.06], y: 0 });
    data.push({ x: [Math.cos(t) * 0.8 + gauss(rnd) * 0.06, Math.sin(t) * 0.8 + gauss(rnd) * 0.06], y: 1 });
  }
  return data;
}

/** 4 · interlocking arcs — a curved seam. The prettiest final frame; the Skip-the-tour destination. */
export function moons(seed: number): Point[] {
  const rnd = mulberry32(seed);
  const data: Point[] = [];
  const N = 14;
  const noise = 0.075;
  const S = 0.8;
  const map = (x: number, y: number): [number, number] => [
    (x - 0.5) * S + gauss(rnd) * noise,
    (y - 0.25) * S + gauss(rnd) * noise,
  ];
  for (let i = 0; i < N; i++) {
    const th = (Math.PI * i) / (N - 1);
    data.push({ x: map(Math.cos(th), Math.sin(th)), y: 0 });
    data.push({ x: map(1 - Math.cos(th), 0.5 - Math.sin(th)), y: 1 });
  }
  return data;
}

export type PresetKey = 'blobs' | 'xor' | 'circles' | 'moons';

/** Ship order = the difficulty ladder. The sandbox renders the buttons in this order. */
export const PRESETS: { key: PresetKey; label: string; gen: (seed: number) => Point[] }[] = [
  { key: 'blobs', label: 'two blobs', gen: blobs },
  { key: 'xor', label: 'XOR', gen: xor },
  { key: 'circles', label: 'circles', gen: circles },
  { key: 'moons', label: 'moons', gen: moons },
];

export const PRESET_GEN: Record<PresetKey, (seed: number) => Point[]> = {
  blobs,
  xor,
  circles,
  moons,
};
