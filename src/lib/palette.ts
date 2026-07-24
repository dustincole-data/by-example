/**
 * The canvas half of the locked palette (spec §1.2, ticket 01 — CVD-validated,
 * class-A teal ↔ class-B orange worst-adjacent ΔE 8.8 protan ≥ 8.0). Do not re-tint.
 *
 * Two-class classification is a DIVERGING encoding: cool pole = class A,
 * warm pole = class B, the p=0.5 boundary is the neutral seam between them.
 * Confidence also reads by luminance (dim seam → bright poles), so nothing rides on hue alone.
 */
import { clamp } from './prng';

export type RGB = [number, number, number];
type Stop = [number, RGB];

/** The neutral seam: low confidence stays dim so the stage reads dark. */
export const SEAM: RGB = [22, 28, 38];

/** Cool ramp — class A. Poles stay deep + saturated, never washed to pastel. */
export const RAMP_A: Stop[] = [
  [0, SEAM],
  [0.5, [28, 110, 84]],
  [0.82, [40, 166, 124]],
  [1, [74, 208, 160]],
];

/** Warm ramp — class B. */
export const RAMP_B: Stop[] = [
  [0, SEAM],
  [0.5, [170, 78, 40]],
  [0.82, [236, 120, 52]],
  [1, [255, 146, 74]],
];

/** The crisp example marks — a hard mark on a soft ground. */
export const POINT_A = '#3fe0aa';
export const POINT_B = '#ff9a52';

export function lerpStops(stops: Stop[], t: number): RGB {
  t = clamp(t, 0, 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]!;
    const [b, cb] = stops[i + 1]!;
    if (t >= a && t <= b) {
      const u = (t - a) / (b - a || 1);
      return [ca[0] + (cb[0] - ca[0]) * u, ca[1] + (cb[1] - ca[1]) * u, ca[2] + (cb[2] - ca[2]) * u];
    }
  }
  return stops[stops.length - 1]![1];
}

/** Map p(class B) → the diverging confidence color. `gamma` > 1 keeps the low-confidence midband dim. */
export function fieldColor(p: number, gamma?: number): RGB {
  let conf = clamp(Math.abs(p - 0.5) * 2, 0, 1);
  if (gamma && gamma !== 1) conf = Math.pow(conf, gamma);
  return p < 0.5 ? lerpStops(RAMP_A, conf) : lerpStops(RAMP_B, conf);
}

/**
 * The LOCKED graft look tokens (ticket 01): Direction A's framed chrome + rigorous
 * scatter + net as a modest side-panel, with a touch of Direction B's field bloom.
 */
export const LOOK = {
  bloomAlpha: 0.2,
  bloomBlur: 10,
  fieldGamma: 1.22,
  lineGlow: 10,
  pointR: 5.2,
  edgeK: 2.3,
  netGlow: 9,
  curveW: 2,
  plotGridA: 0.55,
  showGrid: true,
} as const;
