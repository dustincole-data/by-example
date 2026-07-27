import { describe, it, expect } from 'vitest';
import {
  TITLE, TAGLINE, META_DESCRIPTION, AXIS_X, AXIS_Y, LABEL_RIPE, LABEL_NOT_RIPE,
  NET_CAPTION, RESET, UNDO, REMOVE, RM_NOTE, FIELD_ARIA, ASK, CHIP, fieldAlt,
  BRAND, BRAND_HREF, forPointer, probeText, EXPLAIN, PRESET_LABEL, PRESET_PICKER_LABEL,
} from './copy';

const allCopy = (): string => [
  TITLE, TAGLINE, META_DESCRIPTION, AXIS_X, AXIS_Y, LABEL_RIPE, LABEL_NOT_RIPE,
  NET_CAPTION, RESET, UNDO, REMOVE, RM_NOTE, FIELD_ARIA, BRAND,
  probeText(0.87), probeText(0.13),
  ...Object.values(ASK),
  CHIP.thesis, CHIP.learning, CHIP.moved, CHIP.empty, CHIP.allRipe, CHIP.noneRipe,
  CHIP.missed(1, 7), CHIP.count(7, 4),
  fieldAlt(7, CHIP.count(7, 4)),
  EXPLAIN, PRESET_PICKER_LABEL, ...Object.values(PRESET_LABEL),
].join('\n');

describe('the shipped strings', () => {
  it('ships the title and tagline', () => {
    expect(TITLE).toBe('By Example');
    expect(TAGLINE).toBe('Tap anywhere. It figures out the rule.');
    expect(META_DESCRIPTION.startsWith(TAGLINE)).toBe(true);
  });

  it('never ships the retired working title — that string is the collision', () => {
    expect(allCopy().toLowerCase()).not.toContain('teach a machine');
    expect(allCopy().toLowerCase()).not.toContain('teachable');
  });

  it('keeps the anti-cliché guardrails', () => {
    expect(allCopy()).not.toMatch(/🤖|magic|magical|AI-powered/i);
  });
});

/*
  The two highest-leverage corrections ticket 11 measured. The Y axis said `how firm`, so
  the seeds asserted *firm = ripe* — contradicting the one thing a first-timer knows about
  fruit. And the glyph must stay `→`: the label renders rotate(-90deg), which maps the
  text's own +x onto screen-up, so `→` RENDERS as an up arrow and `↑` would point left.
*/
describe('the axes', () => {
  it('says how soft, never how firm', () => {
    expect(AXIS_Y).toContain('how soft');
    expect(allCopy().toLowerCase()).not.toContain('how firm');
  });

  it('uses → on BOTH axes — the rotated label makes ↑ render pointing left', () => {
    expect(AXIS_X).toBe('how sweet →');
    expect(AXIS_Y).toBe('how soft →');
    expect(allCopy()).not.toContain('↑');
  });
});

describe('the status chip does the on-ramp the tour used to do', () => {
  it('opens as the thesis, so the screen says what it is inside 3 seconds', () => {
    expect(CHIP.thesis).toBe('tap anywhere. it figures out the rule.');
  });

  it('reports what CHANGED, not a self-graded score', () => {
    expect(CHIP.moved).toBe('moved the line');
    expect(CHIP.count(7, 4)).toBe('7 peaches · 4 ripe');
    expect(CHIP.missed(1, 7)).toBe("can't fit 1 of your 7");
    expect(allCopy()).not.toMatch(/gets (all )?\d* ?(of \d+ )?right/);
  });

  it('names the noun everywhere the user is asked to act', () => {
    expect(ASK.rest).toContain('peach');
    expect(CHIP.empty).toContain('peach');
  });

  it('answers instead of doing nothing when a label is pressed with nothing armed', () => {
    expect(ASK.needPoint).toBe('tap the field first — then say which it is');
  });
});

/*
  Ticket 13 — desktop. The strings above are authored once, for a phone, and the gesture
  word is swapped at the point of display; the probe readout is desktop's extra verb.
*/
describe('the desktop layer', () => {
  it('says click to a mouse and tap to a finger, from the same authored string', () => {
    expect(forPointer(CHIP.thesis, true)).toBe('click anywhere. it figures out the rule.');
    expect(forPointer(CHIP.thesis, false)).toBe(CHIP.thesis);
    expect(forPointer(ASK.rest, true)).toBe('click anywhere to add a peach');
    expect(forPointer(TAGLINE, true)).toBe('Click anywhere. It figures out the rule.');
  });

  it('swaps whole words only, so it can never chew a word that contains one', () => {
    expect(forPointer('tapered tapas, untapped', true)).toBe('tapered tapas, untapped');
    expect(forPointer('tap the tap', true)).toBe('click the click');
  });

  it('the probe names the class the way the field paints it — p is P(not ripe)', () => {
    expect(probeText(0.87)).toBe(`here: ${LABEL_NOT_RIPE} · 87% sure`);
    expect(probeText(0.13)).toBe(`here: ${LABEL_RIPE} · 87% sure`);
    expect(probeText(0.5)).toBe(`here: ${LABEL_NOT_RIPE} · 50% sure`);
  });

  it('carries the one outbound brand link', () => {
    expect(BRAND).toBe('dustincoledata.com');
    expect(BRAND_HREF).toBe('https://dustincoledata.com');
  });
});

describe('accessible text', () => {
  it('the field states the whole key path, since it is the only way in without a pointer', () => {
    for (const k of ['Arrow', 'Enter', 'Escape', 'how sweet', 'how soft']) {
      expect(FIELD_ARIA).toContain(k);
    }
  });

  it('the picture has a real description — count, both axes, the boundary, the status', () => {
    const alt = fieldAlt(7, CHIP.count(7, 4));
    expect(alt).toContain('7 labelled peaches');
    expect(alt).toContain('how sweet');
    expect(alt).toContain('how soft');
    expect(alt).toContain('boundary');
    expect(alt).toContain('7 peaches · 4 ripe');
  });

  it('the net caption is explained, not an undefined acronym', () => {
    expect(NET_CAPTION).toBe('2 in → 8 → 1 guess');
    expect(NET_CAPTION).not.toContain('MLP');
  });

  it('reset is called reset — it re-seeds whichever preset is selected, so it is not "start over"', () => {
    expect(RESET).toBe('reset');
    expect(UNDO).toBe('undo');
  });
});

describe('the preset picker (ticket 14)', () => {
  it('labels all four patterns, plainly, no ML jargon on screen', () => {
    expect(PRESET_LABEL.straight).toBe('straight');
    expect(PRESET_LABEL.crisscross).toBe('crisscross');
    expect(PRESET_LABEL.surrounded).toBe('surrounded');
    // `moons` ships as the fourth rung's own name (spec §8.3, §4) — it is a shipped label,
    // not hidden dataset jargon, so it is deliberately not in the banned list below.
    expect(PRESET_LABEL.moons).toBe('moons');
    for (const s of Object.values(PRESET_LABEL)) {
      expect(s.toLowerCase()).not.toMatch(/xor|blob|mlp/);
    }
  });

  it('the picker has a plain-English label', () => {
    expect(PRESET_PICKER_LABEL).toBe('pattern');
  });
});

describe('the persistent explanation (ticket 14)', () => {
  it('survives past the first tap — it is not the status chip', () => {
    expect(EXPLAIN).toBe('Each tap teaches it your rule — watch the line move.');
  });

  it('says click to a mouse, same as every other tap string', () => {
    expect(forPointer(EXPLAIN, true)).toBe('Each click teaches it your rule — watch the line move.');
    expect(forPointer(EXPLAIN, false)).toBe(EXPLAIN);
  });
});
