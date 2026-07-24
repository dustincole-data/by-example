/**
 * The confidence field (spec §5): forward-pass the net over a coarse grid each epoch,
 * paint it as ImageData, upscale it, and trace the p=0.5 contour with marching squares.
 * ~5–9 ms/epoch in canvas 2D — no WebGL.
 */
import { forward } from './net';
import { fieldColor } from './palette';
import type { Net } from './types';

/** Coarse grid — upsampled to the canvas. Cheap enough to repaint every epoch. */
export const GW = 176;
export const GH = 132;

/** Input-space extent. */
export const XR: [number, number] = [-1.15, 1.15];
export const YR: [number, number] = [-1.15, 1.15];

/** Input space → normalized view coords (y flipped so +y is up). */
export const nx = (x: number): number => (x - XR[0]) / (XR[1] - XR[0]);
export const ny = (y: number): number => 1 - (y - YR[0]) / (YR[1] - YR[0]);

/** Normalized view coords → input space. */
export const vx = (u: number): number => XR[0] + u * (XR[1] - XR[0]);
export const vy = (v: number): number => YR[0] + (1 - v) * (YR[1] - YR[0]);

export function computeField(w: Net): Float32Array {
  const P = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    const yv = YR[0] + (1 - (gy + 0.5) / GH) * (YR[1] - YR[0]);
    for (let gx = 0; gx < GW; gx++) {
      const xv = XR[0] + ((gx + 0.5) / GW) * (XR[1] - XR[0]);
      P[gy * GW + gx] = forward(w, [xv, yv]).p;
    }
  }
  return P;
}

export function fieldToImage(P: Float32Array, out: Uint8ClampedArray, gamma?: number): void {
  for (let i = 0; i < GW * GH; i++) {
    const c = fieldColor(P[i]!, gamma);
    const o = i * 4;
    out[o] = c[0] | 0;
    out[o + 1] = c[1] | 0;
    out[o + 2] = c[2] | 0;
    out[o + 3] = 255;
  }
}

export type Seg = [[number, number], [number, number]];

/** Marching squares over the grid at iso = 0.5 → the decision line, in grid coords. */
export function contourSegs(P: Float32Array): Seg[] {
  const segs: Seg[] = [];
  const iso = 0.5;
  const at = (gx: number, gy: number): number => P[gy * GW + gx]!;
  const ipt = (
    x1: number, y1: number, v1: number,
    x2: number, y2: number, v2: number,
  ): [number, number] => {
    const t = (iso - v1) / (v2 - v1);
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  };
  for (let gy = 0; gy < GH - 1; gy++) {
    for (let gx = 0; gx < GW - 1; gx++) {
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
