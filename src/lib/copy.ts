/**
 * The copy. Fewest words in the portfolio — the screen has one gesture, so the words
 * only have to name what you are looking at and say what just changed.
 *
 * Register: narrates the CONCEPT, never Dustin. No self-promo, no anthropomorphising,
 * no "AI magic". Light, a little dry.
 *
 * Two strings here are load-bearing and were wrong before ticket 11 measured them:
 *  - the Y axis says `how soft`, not `how firm`. The old wording made the seeds assert
 *    *firm = ripe*, contradicting the one thing a first-timer knows about fruit.
 *  - its glyph is `→`, never `↑`. The label is rendered `rotate(-90deg)`, which maps the
 *    text's own +x onto screen-up, so `→` RENDERS as an up arrow and `↑` would render
 *    pointing left. Building the arrow literally is a bug.
 */

export const TITLE = 'By Example';

/** <title> / OG / meta / repo description / the dustincoledata /projects card. */
export const TAGLINE = 'Tap anywhere. It figures out the rule.';
export const META_DESCRIPTION =
  `${TAGLINE} Teach a real 2→8→1 neural net which peaches are ripe, one tap at a time.`;

/** The axis gutters. Both are `aria-hidden` — the field's own label names them in words. */
export const AXIS_X = 'how sweet →';
export const AXIS_Y = 'how soft →';

export const LABEL_RIPE = 'ripe';
export const LABEL_NOT_RIPE = 'not ripe';

/** `2→8→1 MLP` was an undefined acronym next to an unnamed 74×30 picture. Same width, readable. */
export const NET_CAPTION = '2 in → 8 → 1 guess';

export const RESET = 'reset';
export const UNDO = 'undo';
export const REMOVE = 'remove';

/**
 * The prompt above the label pair. It grows into the question at the moment it matters —
 * the second tap IS the teaching moment, which is the on-ramp delivered as meaning
 * rather than as a tour.
 */
export const ASK = {
  rest: 'tap anywhere to add a peach',
  armed: 'Was that one ripe?',
  editing: 'Change that one?',
  /** A resting label button answers instead of doing nothing — it is the only colour
   *  legend on screen and the most button-shaped thing on it, so it gets tapped first. */
  needPoint: 'tap the field first — then say which it is',
} as const;

/**
 * The floating status chip. It opens as the thesis (the screen would otherwise have
 * nothing on it that says what this is), reports the learning while it happens, says what
 * CHANGED, and only falls back to a count when there is nothing more interesting to say.
 */
export const CHIP = {
  thesis: 'tap anywhere. it figures out the rule.',
  learning: 'learning…',
  moved: 'moved the line',
  empty: 'no examples yet — tap anywhere to add a peach',
  allRipe: 'it thinks everything is ripe',
  noneRipe: 'it thinks nothing is ripe',
  missed: (missed: number, n: number): string => `can't fit ${missed} of your ${n}`,
  count: (n: number, ripe: number): string => `${n} peaches · ${ripe} ripe`,
} as const;

/** Reduced motion: the previous boundary is held dashed, so the change is legible with
 *  zero movement. The note expires WITH the ghost it names. */
export const RM_NOTE = 'dashed = the line before your peach';

/** The field is a real control, so it states the whole key path (spec §Accessibility). */
export const FIELD_ARIA =
  'Peach field. Left to right is how sweet, bottom to top is how soft. ' +
  'Arrow keys move the crosshair, Enter drops a peach, then choose ripe or not ripe. Escape cancels.';

/** A real description of the picture, inside the canvas — also the no-canvas fallback. */
export const fieldAlt = (n: number, status: string): string =>
  `${n} labelled peaches on a field of how sweet (left to right) by how soft (bottom to top), ` +
  `with the machine's ripe / not-ripe boundary drawn through them. ${status.replace(/\.$/, '')}.`;
