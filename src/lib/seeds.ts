/**
 * The six examples the toy opens with.
 *
 * Empty is honest, but the first tap gives one class only — so the model correctly says
 * "it thinks everything is ripe" and paints a flat wall, a true statement that looks like
 * a broken screen. Two is alive but leaves the rule illegible. Six make the axes legible
 * on sight and ARE the on-ramp: they teach *sweet + soft = ripe*, which is the rule the
 * first-timer already believes about fruit (ticket 08).
 *
 * Authored in the SQUARE domain and stretched onto whatever the live domain is, so the
 * isotropic Y range spreads them down a tall field instead of squashing them into a band.
 */
import { YR } from './field';
import type { Point } from './types';

export const SEEDS: readonly (readonly [number, number, 0 | 1])[] = [
  [0.55, 0.35, 0],
  [0.78, 0.62, 0],
  [0.36, 0.66, 0],
  [-0.62, -0.42, 1],
  [-0.78, 0.28, 1],
  [-0.3, -0.72, 1],
];

/** Shared with presets.ts: the same silent-fit budget runs whichever pattern is
 *  active. 260 was enough for the original 6 seeds alone; `surrounded` (ticket 14)
 *  needs ~400-600 to reach 100% under this engine's weight decay — measured
 *  empirically, not derived. */
export const SEED_EPOCHS = 600;

export function seedPoints(pts: readonly (readonly [number, number, 0 | 1])[] = SEEDS): Point[] {
  const k = YR[1] / 1.15;
  return pts.map((p) => ({ x: [p[0], p[1] * k] as [number, number], y: p[2] }));
}
