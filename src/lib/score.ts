/**
 * The hero number — spec §6.1.
 *
 * `unseen` is the only number in this design space that is both honest and climbs. It
 * replaces "can't fit 3 of your 10", which reported TRAINING error as a verdict.
 *
 * It measures agreement with the ACTIVE PATTERN'S rule on 12 fresh points from the same
 * generator. When a visitor deliberately teaches something else it falls — correctly — and
 * the string says exactly that: "it has never seen", not "accuracy".
 */
import { forward, metrics } from './net';
import type { Net, Point, Score } from './types';

export function scoreOn(w: Net, pts: readonly Point[]): number {
  let k = 0;
  for (const p of pts) if ((forward(w, p.x).p >= 0.5 ? 1 : 0) === p.y) k++;
  return k;
}

export function score(w: Net, data: readonly Point[], holdout: readonly Point[]): Score {
  const m = metrics(w, data);
  return {
    unseen: scoreOn(w, holdout),
    unseenOf: holdout.length,
    shown: m.correct,
    shownOf: data.length,
    loss: m.loss,
  };
}
