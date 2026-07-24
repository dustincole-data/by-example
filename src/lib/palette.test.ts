import { describe, it, expect } from 'vitest';
import { fieldColor, lerpStops, RAMP_A, RAMP_B, SEAM } from './palette';

/** sRGB relative luminance — the check that state also reads without hue. */
function luma([r, g, b]: [number, number, number]): number {
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

describe('the diverging encoding (spec §1.2 — LOCKED)', () => {
  it('the boundary is the neutral seam', () => {
    expect(fieldColor(0.5)).toEqual(SEAM);
  });

  it('cool pole = class A, warm pole = class B', () => {
    const a = fieldColor(0);
    const b = fieldColor(1);
    expect(a[1]).toBeGreaterThan(a[0]); // teal: green over red
    expect(b[0]).toBeGreaterThan(b[2]); // orange: red over blue
    expect(a).toEqual(RAMP_A[RAMP_A.length - 1]![1]);
    expect(b).toEqual(RAMP_B[RAMP_B.length - 1]![1]);
  });

  it('luminance also carries confidence — nothing rides on hue alone', () => {
    for (const [lo, hi] of [[0.5, 0.0], [0.5, 1.0]] as [number, number][]) {
      expect(luma(fieldColor(hi))).toBeGreaterThan(luma(fieldColor(lo)));
    }
    // monotone from the seam out to each pole
    let prevA = luma(fieldColor(0.5));
    for (const p of [0.4, 0.3, 0.2, 0.1, 0]) {
      const l = luma(fieldColor(p));
      expect(l).toBeGreaterThanOrEqual(prevA);
      prevA = l;
    }
  });

  it('keeps the low-confidence midband dim under the locked gamma', () => {
    expect(luma(fieldColor(0.62, 1.22))).toBeLessThan(luma(fieldColor(0.62)));
  });

  it('poles stay deep and saturated, never washed to pastel', () => {
    for (const c of [fieldColor(0), fieldColor(1)]) {
      const max = Math.max(...c);
      const min = Math.min(...c);
      expect((max - min) / max).toBeGreaterThan(0.5);
    }
  });
});

describe('lerpStops', () => {
  it('clamps outside [0,1] and interpolates inside', () => {
    expect(lerpStops(RAMP_A, -1)).toEqual(SEAM);
    expect(lerpStops(RAMP_A, 2)).toEqual(RAMP_A[RAMP_A.length - 1]![1]);
    const mid = lerpStops(RAMP_B, 0.25);
    expect(mid[0]).toBeGreaterThan(SEAM[0]);
    expect(mid[0]).toBeLessThan(RAMP_B[1]![1][0]);
  });
});
