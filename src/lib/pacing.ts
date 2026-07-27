/**
 * The timings — above all, how long the settle lasts and what paces it.
 *
 * The settle is the whole thesis of the toy: with the Train button cut (ticket 07), the
 * boundary re-forming on its own is the ONLY evidence the machine learned anything. Two
 * obvious schedules were measured and rejected (ticket 08):
 *
 *  (a) epochs eased over the window — double-counts the ease, because gradient descent
 *      already decelerates. ~55% of the learning landed in the first 180 ms; it read as
 *      a snap, not a settle.
 *  (b) run until the weights stop moving — weight decay leaves a slow drift that never
 *      crosses a fixed epsilon, and it crosses LATER for an agreeing tap (still .0054 at
 *      1409 ms) than for a contradicting one (.005 by 206 ms). Exactly backwards.
 *
 * Shipped: a fixed window with epochs paced by ELAPSED TIME, so a 30 fps phone and a
 * 120 Hz desktop see the same choreography — a dropped frame skips epochs rather than
 * stretching the run.
 */

/** Length of the visible re-settle. */
export const SETTLE_MS = 800;
/** Epochs per millisecond → 200 epochs across the window. */
export const EPOCH_RATE = 0.25;
/** Reduced motion runs the same total, instantly. */
export const SETTLE_EPOCHS = Math.round(SETTLE_MS * EPOCH_RATE);

/** Epochs that should have run by `elapsed` ms into the settle. */
export const epochsBy = (elapsed: number): number =>
  Math.min(SETTLE_EPOCHS, Math.max(0, Math.round(elapsed * EPOCH_RATE)));

/**
 * The FIT — spec §5.5. Every pattern change, every helper change, every reset and boot
 * itself run this on screen. The old silent SEED_EPOCHS = 600 pre-fit is deleted: it made
 * ≥75% of all training invisible and opened the piece on the answer.
 *
 * Measured epochs-to-fit at HID=8, WD=0.002: straight and crisscross by e=50, surrounded
 * by e=100, moons reaches its 23/24 plateau by e=300. 600 over 1.5 s covers all four with
 * the interesting part on screen.
 */
export const FIT_MS = 1500;
export const FIT_EPOCHS = 600;
export const FIT_RATE = FIT_EPOCHS / FIT_MS;

export const fitEpochsBy = (elapsed: number): number =>
  Math.min(FIT_EPOCHS, Math.max(0, Math.round(elapsed * FIT_RATE)));

/**
 * Fraction of the 64² class map that must flip for the settle to have "moved the line".
 * Cheap, and the honest answer to *what did the machine just learn* — which self-graded
 * training-set accuracy could not give (it read "gets all N right" almost always).
 *
 * Reopened by spec §3.5 at WD = 0.002 (T22): the old 0.004 fired at 16 of 4096 cells and
 * was measured firing three times in a sequence where the boundary never visibly moved.
 * Measured real flips from one genuinely contradicting example at the new decay: straight
 * 0.297, crisscross 0.080, surrounded 0.020, moons 0.011 — 0.02 sits below every real move
 * and above the noise floor. It no longer drives the narrator's headline (spec §7.2); the
 * unseen-score delta does.
 */
export const MOVED_FRAC = 0.02;

/** How long the "moved the line" status holds. */
export const MOVED_MS = 1700;
/** How long the reduced-motion ghost of the previous boundary is held. Its caption is
 *  driven off THIS expiry, never off "a ghost object once existed". */
export const GHOST_MS = 1800;
/** The drop-in ring on a freshly committed mark. */
export const DROP_MS = 380;
/** `reset` is one unconfirmed tap in the thumb zone, so it offers undo instead of a dialog. */
export const UNDO_MS = 6000;
