/**
 * The confidence field: forward-pass the net over a coarse grid, paint it as ImageData,
 * upscale it, and trace the p=0.5 contour with marching squares. Canvas 2D, no WebGL.
 *
 * The grid resolution is a PARAMETER (ticket 08): the settle runs at GRID_LO and only its
 * final frame at GRID_HI, because computeField is 4× cheaper at 64² and contourSegs walks
 * 4× fewer cells — and 64² upscaled is indistinguishable while it moves.
 *
 * The domain is fixed square (spec §0.1, D0) — XR and YR never change. A prior version
 * derived YR from the box aspect so a pixel spanned the same domain units on both axes;
 * that made a coordinate's meaning device-dependent, which real units on the axes (§2.2)
 * cannot tolerate. A square domain on a square plot box (T19) is isotropic by construction.
 */
import { forward } from './net';
import { fieldColor } from './palette';
import type { Net } from './types';

/** Field resolution during a settle (motion) and at rest (the still). */
export const GRID_LO = 64;
export const GRID_HI = 128;

/** Input-space extent. Square and CONSTANT — see spec §0.1 (D0). The plot box is drawn
 *  square at every viewport, so isotropy holds by construction rather than by derivation,
 *  and a domain coordinate means the same thing on every device. */
export const XR: readonly [number, number] = [-1.15, 1.15];
export const YR: readonly [number, number] = [-1.15, 1.15];

/** Input space → normalized view coords (y flipped so +y is up). */
export const nx = (x: number): number => (x - XR[0]) / (XR[1] - XR[0]);
export const ny = (y: number): number => 1 - (y - YR[0]) / (YR[1] - YR[0]);

/** Normalized view coords → input space. */
export const vx = (u: number): number => XR[0] + u * (XR[1] - XR[0]);
export const vy = (v: number): number => YR[0] + (1 - v) * (YR[1] - YR[0]);

export function computeField(w: Net, n: number): Float32Array {
  const P = new Float32Array(n * n);
  for (let gy = 0; gy < n; gy++) {
    const yv = YR[0] + (1 - (gy + 0.5) / n) * (YR[1] - YR[0]);
    for (let gx = 0; gx < n; gx++) {
      const xv = XR[0] + ((gx + 0.5) / n) * (XR[1] - XR[0]);
      P[gy * n + gx] = forward(w, [xv, yv]).p;
    }
  }
  return P;
}

/** The class map — which side of the boundary each cell is on. Compared before/after a
 *  settle to answer the only interesting question: did the line actually move? */
export function signOf(P: Float32Array): Uint8Array {
  const s = new Uint8Array(P.length);
  for (let i = 0; i < P.length; i++) s[i] = P[i]! >= 0.5 ? 1 : 0;
  return s;
}

/**
 * The ceiling on displayed confidence — the single number that keeps the example marks
 * readable (ticket 08, engine finding 2). A settled mark always sits in the region that
 * AGREES with it, so it is always on ground of its own hue, and saturation does not appear
 * in the WCAG contrast formula at all: only luminance can separate them. At the old cap
 * (0.78, with bloomAlpha 0.2) the marks measured 1.17:1 orange / 1.52:1 teal, and the best
 * achievable contrast for ANY mark colour — including pure white — was 2.6:1. No mark
 * treatment could have passed; the ground itself had to come down.
 *
 * Orange is the binding class (`#ff9a52` is the dimmer mark), so any later increase to
 * FIELD_MAX or LOOK.bloomAlpha breaks the 3:1 gate on the orange side first. Re-sample on
 * a USED field before shipping such a change — at the seeds it reads a false pass, because
 * the bloom is a blurred pass and only a used field has bright neighbours.
 */
export const FIELD_MAX = 0.4;

export function fieldToImage(P: Float32Array, out: Uint8ClampedArray, gamma?: number): void {
  for (let i = 0; i < P.length; i++) {
    const p = P[i]!;
    const conf = Math.min(Math.abs(p - 0.5) * 2, FIELD_MAX);
    const c = fieldColor(p < 0.5 ? 0.5 - conf / 2 : 0.5 + conf / 2, gamma);
    const o = i * 4;
    out[o] = c[0] | 0;
    out[o + 1] = c[1] | 0;
    out[o + 2] = c[2] | 0;
    out[o + 3] = 255;
  }
}

/** A boundary segment in NORMALIZED 0..1 box coords. */
export type Seg = [[number, number], [number, number]];

/**
 * Marching squares over the grid at iso = 0.5 → the decision line. Segments come back
 * normalized, so a ghost captured at 128² still draws correctly over a field being
 * recomputed at 64².
 */
export function contourSegs(P: Float32Array, n: number): Seg[] {
  const segs: Seg[] = [];
  const iso = 0.5;
  const at = (gx: number, gy: number): number => P[gy * n + gx]!;
  const ipt = (
    x1: number, y1: number, v1: number,
    x2: number, y2: number, v2: number,
  ): [number, number] => {
    const t = (iso - v1) / (v2 - v1);
    return [(x1 + (x2 - x1) * t) / n, (y1 + (y2 - y1) * t) / n];
  };
  for (let gy = 0; gy < n - 1; gy++) {
    for (let gx = 0; gx < n - 1; gx++) {
      const tl = at(gx, gy), tr = at(gx + 1, gy), br = at(gx + 1, gy + 1), bl = at(gx, gy + 1);
      const ci = (tl > iso ? 8 : 0) | (tr > iso ? 4 : 0) | (br > iso ? 2 : 0) | (bl > iso ? 1 : 0);
      if (ci === 0 || ci === 15) continue;
      const x0 = gx, y0 = gy, x1 = gx + 1, y1 = gy + 1;
      const T = (): [number, number] => ipt(x0, y0, tl, x1, y0, tr);
      const R = (): [number, number] => ipt(x1, y0, tr, x1, y1, br);
      const B = (): [number, number] => ipt(x0, y1, bl, x1, y1, br);
      const L = (): [number, number] => ipt(x0, y0, tl, x0, y1, bl);
      const push = (a: [number, number], b: [number, number]): void => { segs.push([a, b]); };
      switch (ci) {
        case 1: case 14: push(L(), B()); break;
        case 2: case 13: push(B(), R()); break;
        case 3: case 12: push(L(), R()); break;
        case 4: case 11: push(T(), R()); break;
        case 6: case 9: push(T(), B()); break;
        case 7: case 8: push(L(), T()); break;
        case 5: push(L(), T()); push(B(), R()); break;
        case 10: push(T(), R()); push(L(), B()); break;
      }
    }
  }
  return segs;
}
