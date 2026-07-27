import { describe, it, expect } from 'vitest';
import {
  computeField, contourSegs, fieldToImage, signOf,
  nx, ny, vx, vy, XR, YR, FIELD_MAX, GRID_LO, GRID_HI,
} from './field';
import { initNet, step, SEED, LR, HID_DEFAULT } from './net';
import { LOOK, SEAM, fieldColor } from './palette';
import type { Point } from './types';

const twoBlobs: Point[] = [
  { x: [0.6, 0.5], y: 0 }, { x: [0.8, 0.35], y: 0 },
  { x: [-0.6, -0.5], y: 1 }, { x: [-0.8, -0.35], y: 1 },
];
const settled = (epochs = 200) => {
  const w = initNet(SEED, HID_DEFAULT);
  for (let i = 0; i < epochs; i++) step(w, twoBlobs, LR);
  return w;
};

describe('input-space ⇆ view mapping', () => {
  it('flips y so +y reads up', () => {
    expect(ny(YR[1])).toBeCloseTo(0, 10);
    expect(ny(YR[0])).toBeCloseTo(1, 10);
  });

  it('round-trips', () => {
    for (const v of [-1.15, -0.4, 0, 0.33, 1.15]) {
      expect(vx(nx(v))).toBeCloseTo(v, 10);
      expect(vy(ny(v))).toBeCloseTo(v, 10);
    }
  });
});

describe('fixed square domain', () => {
  it('is square and constant', () => {
    expect([XR[0], XR[1]]).toEqual([-1.15, 1.15]);
    expect([YR[0], YR[1]]).toEqual([-1.15, 1.15]);
  });

  it('exports no domain mutator', async () => {
    const mod = await import('./field');
    expect('syncDomain' in mod).toBe(false);
  });

  /* P0-5: seeds baked the domain scale into their stored coordinates, so a rotation
     re-derived YR and left examples off-field while still training — "7 peaches · 4 ripe"
     with one mark visible. A constant domain makes that unrepresentable. */
  it('maps a normalized point to the same input vector regardless of box shape', () => {
    expect(vx(0.25)).toBeCloseTo(-0.575, 10);
    expect(vy(0.25)).toBeCloseTo(0.575, 10);
  });
});

describe('confidence field', () => {
  it('evaluates the model over the whole grid, at either resolution', () => {
    for (const n of [GRID_LO, GRID_HI]) {
      const P = computeField(initNet(SEED, HID_DEFAULT), n);
      expect(P).toHaveLength(n * n);
      for (const p of P) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
    }
  });

  it('paints opaque RGBA, with the low-confidence midband at the dim seam', () => {
    const img = new Uint8ClampedArray(GRID_LO * GRID_LO * 4);
    fieldToImage(new Float32Array(GRID_LO * GRID_LO).fill(0.5), img, LOOK.fieldGamma);
    expect([img[0], img[1], img[2]]).toEqual(SEAM);
    expect(img[3]).toBe(255);
  });

  /*
    The marks sit on ground of their OWN hue, so only luminance can separate them — and at
    the old cap (FIELD_MAX 0.78, bloomAlpha 0.2) the best achievable contrast for ANY mark
    colour, including pure white, was 2.6:1. Raising either number breaks the 3:1 gate on
    the orange class first, so both are pinned here (ticket 08, engine finding 2).
  */
  it('caps displayed confidence, so a certain model never paints a pole brighter than the cap', () => {
    expect(FIELD_MAX).toBeLessThanOrEqual(0.4);
    expect(LOOK.bloomAlpha).toBeLessThanOrEqual(0.08);

    const img = new Uint8ClampedArray(2 * 4);
    fieldToImage(Float32Array.from([0, 1]), img, LOOK.fieldGamma);
    const capped = [
      fieldColor(0.5 - FIELD_MAX / 2, LOOK.fieldGamma),
      fieldColor(0.5 + FIELD_MAX / 2, LOOK.fieldGamma),
    ];
    expect([img[0], img[1], img[2]]).toEqual(capped[0]!.map((c) => c | 0));
    expect([img[4], img[5], img[6]]).toEqual(capped[1]!.map((c) => c | 0));
  });

  it('signOf reports which side of the boundary each cell is on', () => {
    const s = signOf(Float32Array.from([0.1, 0.5, 0.9]));
    expect([...s]).toEqual([0, 1, 1]);
  });
});

describe('p = 0.5 contour (marching squares)', () => {
  it('produces no line when the field never crosses 0.5', () => {
    expect(contourSegs(new Float32Array(GRID_LO * GRID_LO).fill(0.9), GRID_LO)).toHaveLength(0);
    expect(contourSegs(new Float32Array(GRID_LO * GRID_LO).fill(0.1), GRID_LO)).toHaveLength(0);
  });

  /* Normalized, so a ghost captured at 128² still draws correctly over a field being
     recomputed at 64² — the reduced-motion path depends on exactly this. */
  it('returns NORMALIZED 0..1 box coords, identically at both resolutions', () => {
    const w = settled();
    for (const n of [GRID_LO, GRID_HI]) {
      const segs = contourSegs(computeField(w, n), n);
      expect(segs.length).toBeGreaterThan(0);
      for (const [a, b] of segs) {
        for (const v of [a[0], a[1], b[0], b[1]]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('every segment endpoint sits where the field really is 0.5', () => {
    const n = GRID_HI;
    const P = computeField(settled(), n);
    const bilinear = (u: number, v: number): number => {
      const gx = u * n - 0, gy = v * n - 0;
      const x0 = Math.min(n - 1, Math.floor(gx)), y0 = Math.min(n - 1, Math.floor(gy));
      const x1 = Math.min(n - 1, x0 + 1), y1 = Math.min(n - 1, y0 + 1);
      const fx = gx - x0, fy = gy - y0;
      const p00 = P[y0 * n + x0]!, p10 = P[y0 * n + x1]!;
      const p01 = P[y1 * n + x0]!, p11 = P[y1 * n + x1]!;
      return (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
    };
    for (const [a, b] of contourSegs(P, n)) {
      expect(bilinear(a[0], a[1])).toBeCloseTo(0.5, 6);
      expect(bilinear(b[0], b[1])).toBeCloseTo(0.5, 6);
    }
  });
});
