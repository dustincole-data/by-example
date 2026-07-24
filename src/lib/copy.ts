/**
 * The locked copy (spec §4.2, §4.6, §12.1). Verbatim — do not reword.
 *
 * Register: narrates the CONCEPT, never Dustin. Zero self-promo, no anthropomorphising,
 * no "AI magic". Light, a little dry.
 *
 * Beats stay strictly factual/observational; the thesis is the ONLY line that generalises.
 * (An earlier draft had beats 2 and 3 each delivering the thesis, so the thesis was its
 * third restatement and landed flat.)
 */

/** Stage title block — no English descriptor under it; the mono spec line answers "what is this". */
export const TITLE = 'By Example';
export const SPEC_LINE = '2→8→1 MLP · tanh · gradient descent';

/** <title> / OG / meta / repo description / the dustincoledata /projects card. */
export const TAGLINE = 'Drop labeled points. Watch a machine find the rule.';
export const META_DESCRIPTION = `${TAGLINE} A real 2→8→1 neural net, trained live in your browser.`;

const kA = '<b class="kA">+A</b>';
const kB = '<b class="kB">+B</b>';

export type BeatId = 'beat1' | 'beat2' | 'beat3';
export type BeatState = 'prompt' | 'payoff';

export interface Beat {
  kick: string;
  prompt: { line: string; sub: string };
  payoff: { line: string; sub: string };
}

/**
 * `reduced` swaps Beat 2's sub-line: a reduced-motion user never sees the descent,
 * so never describe an animation they will not see (spec §4.8).
 */
export function beatScript(reduced: boolean): Record<BeatId, Beat> {
  return {
    beat1: {
      kick: 'Beat 1 / 3 · Give it examples',
      prompt: {
        line: 'Give it a few examples of each class.',
        sub: `Brush is on ${kA} — click a few spots. Then switch to ${kB} and click somewhere else. No boundary yet — just your examples.`,
      },
      payoff: {
        line: 'That’s the whole dataset — {n} points and two labels.',
        sub: 'This is everything the machine gets to see. Nothing else.',
      },
    },
    beat2: {
      kick: 'Beat 2 / 3 · Watch it learn',
      prompt: {
        line: 'Press Train.',
        sub: reduced
          ? 'Gradient descent runs on your examples — the curve records the whole descent.'
          : 'Gradient descent, running live: the field fills in, the boundary bends, loss falls.',
      },
      payoff: {
        line: 'It found a boundary that separates them — and you never wrote one.',
        sub: 'That bright line is the rule it settled on.',
      },
    },
    beat3: {
      kick: 'Beat 3 / 3 · Teach it a lesson',
      prompt: {
        line: `Now contradict it: drop a ${kA} deep in the B cluster, then Train again.`,
        sub: 'One example that breaks the pattern.',
      },
      payoff: {
        line: 'The boundary bent to fit your new example.',
        sub: 'No code changed. The examples changed, so the rule changed.',
      },
    },
  };
}

/** The thesis — inline, once. The only line in the piece that generalises. */
export const THESIS_HTML =
  'You give the examples. <span class="g">The machine finds the rule.</span> That’s all training is.';

/** Beat-1 gate (spec §4.2): three of each before Next unlocks. */
export const NEED_A = 3;
export const NEED_B = 3;

export const nudgeA = (n: number): string => `Brush is on ${kA} — a few more. (${n}/${NEED_A})`;
export const nudgeB = (n: number): string =>
  `Good. Now switch to ${kB} and click somewhere else. (${n}/${NEED_B})`;
export const NEED_BOTH = 'need at least one +A and one +B first';
