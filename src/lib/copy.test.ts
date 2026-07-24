import { describe, it, expect } from 'vitest';
import {
  TITLE, SPEC_LINE, TAGLINE, META_DESCRIPTION, THESIS_HTML,
  beatScript, NEED_A, NEED_B, nudgeA, nudgeB,
} from './copy';

const allCopy = (): string => {
  const s: string[] = [TITLE, SPEC_LINE, TAGLINE, META_DESCRIPTION, THESIS_HTML, nudgeA(1), nudgeB(1)];
  for (const reduced of [false, true]) {
    for (const b of Object.values(beatScript(reduced))) {
      s.push(b.kick, b.prompt.line, b.prompt.sub, b.payoff.line, b.payoff.sub);
    }
  }
  return s.join('\n');
};

describe('locked strings (spec §12.1)', () => {
  it('ships the locked title block, with no English descriptor bolted on', () => {
    expect(TITLE).toBe('By Example');
    expect(SPEC_LINE).toBe('2→8→1 MLP · tanh · gradient descent');
  });

  it('ships the locked tagline, with the meta appendix', () => {
    expect(TAGLINE).toBe('Drop labeled points. Watch a machine find the rule.');
    expect(META_DESCRIPTION).toBe(
      'Drop labeled points. Watch a machine find the rule. A real 2→8→1 neural net, trained live in your browser.',
    );
  });

  it('never ships the retired working title — that string is the collision', () => {
    expect(allCopy().toLowerCase()).not.toContain('teach a machine');
    expect(allCopy().toLowerCase()).not.toContain('teachable');
  });

  it('keeps the anti-cliché guardrails (spec §0)', () => {
    expect(allCopy()).not.toMatch(/🤖|magic|magical|neural magic|AI-powered/i);
  });
});

describe('thesis discipline (spec §12.1)', () => {
  it('the thesis generalises exactly once, and lives only in the thesis', () => {
    expect(THESIS_HTML).toContain('You give the examples.');
    expect(THESIS_HTML).toContain('That’s all training is.');
    for (const reduced of [false, true]) {
      for (const b of Object.values(beatScript(reduced))) {
        for (const line of [b.prompt.line, b.prompt.sub, b.payoff.line, b.payoff.sub]) {
          expect(line).not.toContain('all training is');
        }
      }
    }
  });

  it('none of the shipped chrome spends the thesis', () => {
    for (const s of [TITLE, SPEC_LINE, TAGLINE, META_DESCRIPTION]) {
      expect(s).not.toContain('all training is');
    }
  });
});

describe('the beat script (spec §4.2)', () => {
  const script = beatScript(false);

  it('runs three beats, each prompt → payoff', () => {
    expect(Object.keys(script)).toEqual(['beat1', 'beat2', 'beat3']);
    for (const b of Object.values(script)) {
      expect(b.prompt.line.length).toBeGreaterThan(0);
      expect(b.payoff.line.length).toBeGreaterThan(0);
    }
  });

  it('substitutes the live example count into Beat 1’s payoff', () => {
    expect(script.beat1.payoff.line).toContain('{n}');
    expect(script.beat1.payoff.line.replace('{n}', '6')).toBe(
      'That’s the whole dataset — 6 points and two labels.',
    );
  });

  it('adapts Beat 2 under reduced motion — never describe an animation never seen', () => {
    const motion = beatScript(false).beat2.prompt.sub;
    const reduced = beatScript(true).beat2.prompt.sub;
    expect(motion).not.toBe(reduced);
    expect(motion).toMatch(/running live|fills in/);
    expect(reduced).not.toMatch(/running live|fills in|bends/);
    expect(reduced).toContain('the curve records the whole descent');
  });

  it('gates Beat 1 at three of each class', () => {
    expect([NEED_A, NEED_B]).toEqual([3, 3]);
    expect(nudgeA(2)).toContain('(2/3)');
    expect(nudgeB(1)).toContain('(1/3)');
  });
});
