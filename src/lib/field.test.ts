import { describe, it, expect } from 'vitest';
import { computeField, contourSegs, fieldToImage, GW, GH, nx, ny, vx, vy, XR } from './field';
import { train, initNet, SEED, EPOCHS, LR_SANDBOX } from './net';
import { blobs } from './presets';
import { SEAM } from './palette';

describe('input-space ⇆ view mapping', () => {
  it('flips y so +y reads up', () => {
    expect(ny(XR[1])).toBeCloseTo(0, 10);
    expect(ny(XR[0])).toBeCloseTo(1, 10);
  });

  it('round-trips', () => {
    for (const v of [-1.15, -0.4, 0, 0.33, 1.15]) {
      expect(vx(nx(v))).toBeCloseTo(v, 10);
      expect(vy(ny(v))).toBeCloseTo(v, 10);
    }
  });
});

describe('confidence field', () => {
  it('evaluates the model over the whole coarse grid', () => {
    const P = computeField(initNet(SEED));
    expect(P).toHaveLength(GW * GH);
    for (const p of P) {
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('paints opaque RGBA, with the low-confidence midband at the dim seam', () => {
    const img = new Uint8ClampedArray(GW * GH * 4);
    const P = new Float32Array(GW * GH).fill(0.5);
    fieldToImage(P, img, 1.22);
    expect([img[0], img[1], img[2]]).toEqual(SEAM);
    expect(img[3]).toBe(255);
  });
});

describe('p = 0.5 contour (marching squares)', () => {
  it('produces no line when the field never crosses 0.5', () => {
    expect(contourSegs(new Float32Array(GW * GH).fill(0.9))).toHaveLength(0);
    expect(contourSegs(new Float32Array(GW * GH).fill(0.1))).toHaveLength(0);
  });

  it('traces a boundary once the model has learned one', () => {
    const hist = train(blobs(SEED), LR_SANDBOX, SEED);
    const segs = contourSegs(computeField(hist[EPOCHS]!.w));
    expect(segs.length).toBeGreaterThan(0);
    for (const [a, b] of segs) {
      expect(a[0]).toBeGreaterThanOrEqual(0);
      expect(a[0]).toBeLessThanOrEqual(GW - 1);
      expect(b[1]).toBeGreaterThanOrEqual(0);
      expect(b[1]).toBeLessThanOrEqual(GH - 1);
    }
  });

  it('every segment endpoint sits where the field really is 0.5', () => {
    const hist = train(blobs(SEED), LR_SANDBOX, SEED);
    const P = computeField(hist[EPOCHS]!.w);
    const bilinear = (gx: number, gy: number): number => {
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const x1 = Math.min(GW - 1, x0 + 1), y1 = Math.min(GH - 1, y0 + 1);
      const fx = gx - x0, fy = gy - y0;
      const p00 = P[y0 * GW + x0]!, p10 = P[y0 * GW + x1]!;
      const p01 = P[y1 * GW + x0]!, p11 = P[y1 * GW + x1]!;
      return (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
    };
    for (const [a, b] of contourSegs(P)) {
      expect(bilinear(a[0], a[1])).toBeCloseTo(0.5, 6);
      expect(bilinear(b[0], b[1])).toBeCloseTo(0.5, 6);
    }
  });
});
