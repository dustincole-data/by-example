/**
 * The snap, and the playback window derived from it (spec §4.4).
 *
 * The snap is a REAL model event: the first epoch where mean confidence reaches 95%
 * of the run's final confidence — i.e. the epoch the boundary settles. It is NOT
 * accuracy: with hand-placed points accuracy hits 1.00 by epoch 1–2 at every dataset
 * size, so an accuracy trigger fired at epoch 1 of 240, before the field had bloomed.
 *
 * A FIXED playback window was measured to break — well-separated points snapped at
 * 0.5s, interleaved points never snapped inside the window at all. So the window is
 * sized to the snap epoch instead. Only the playback RATE adapts; the epoch the model
 * actually settles on is untouched. That is choosing a playback speed, not faking an event.
 */
import { clamp } from './prng';
import type { Snapshot } from './types';

export const SNAP_SETTLE = 0.95;
/** Seconds of playback for the whole Beat-2/3 descent. */
export const ONRAMP_DUR = 2.4;
/** window = TAIL × snapEpoch → the snap sits ~59% through the window. */
export const TAIL = 1.7;
export const MIN_WIN = 20;
export const MAX_WIN = 140;

export interface RunPlan {
  /** The real model event: the epoch the boundary settles. */
  snapEpoch: number;
  /** Last epoch of the on-ramp playback window. */
  rampEnd: number;
  /** Playback rate in epochs/second so the window plays over ONRAMP_DUR. */
  rampEps: number;
}

export function planRun(hist: readonly Snapshot[]): RunPlan {
  const last = hist.length - 1;
  const target = SNAP_SETTLE * hist[last]!.conf;
  let snapEpoch = 1;
  for (let e = 1; e <= last; e++) {
    if (hist[e]!.conf >= target) {
      snapEpoch = e;
      break;
    }
  }
  const rampEnd = clamp(Math.round(TAIL * snapEpoch), MIN_WIN, MAX_WIN);
  return { snapEpoch, rampEnd, rampEps: rampEnd / ONRAMP_DUR };
}
