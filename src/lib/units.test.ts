import { describe, it, expect } from 'vitest';
import { toBrix, toLbf, fromBrix, fromLbf, BRIX, LBF } from './units';
import { XR, YR } from './field';

describe('display units', () => {
  it('maps the domain edges to the published scale', () => {
    expect(toBrix(XR[0])).toBeCloseTo(8, 6);
    expect(toBrix(XR[1])).toBeCloseTo(16, 6);
    expect(toLbf(YR[0])).toBeCloseTo(14, 6);   // bottom = firm
    expect(toLbf(YR[1])).toBeCloseTo(2, 6);    // top = soft
  });

  it('round-trips', () => {
    for (const v of [-1.15, -0.4, 0, 0.33, 1.15]) {
      expect(fromBrix(toBrix(v))).toBeCloseTo(v, 10);
      expect(fromLbf(toLbf(v))).toBeCloseTo(v, 10);
    }
  });

  /* The Y scale DESCENDS upward: softer is up, and firmness is the quantity actually
     measured. The axis label carries the direction so the inversion is never a guess. */
  it('keeps firmness descending as y rises', () => {
    expect(toLbf(0.5)).toBeLessThan(toLbf(-0.5));
  });

  it('publishes ticks inside the scale', () => {
    for (const t of BRIX.ticks) { expect(t).toBeGreaterThanOrEqual(BRIX.min); expect(t).toBeLessThanOrEqual(BRIX.max); }
    for (const t of LBF.ticks) { expect(t).toBeGreaterThanOrEqual(LBF.min); expect(t).toBeLessThanOrEqual(LBF.max); }
  });
});
