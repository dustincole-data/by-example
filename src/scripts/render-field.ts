/**
 * The boundary field — the hero (spec §3). A soft diverging confidence heatmap with
 * the bright p=0.5 hairline, and the user's example points crisp on top:
 * a hard mark on a soft ground, so the DATA always reads as the ground truth.
 * Ported from the locked look reference (assets/01, graft variant).
 */
import { computeField, contourSegs, fieldToImage, GW, GH, nx, ny } from '../lib/field';
import { LOOK, POINT_A, POINT_B } from '../lib/palette';
import type { Net, Point } from '../lib/types';

export interface FieldState {
  w: Net;
  data: readonly Point[];
  trained: boolean;
  /** 0→1 bloom-in of the field on the first Train. */
  fieldFade: number;
  /** 0→1 one-shot pulse of the decision line at the snap. */
  snapPulse: number;
  crosshair: { x: number; y: number; active: boolean; brush: 0 | 1 } | null;
  /**
   * Cache key for the grid forward-pass. BOTH parts are required: the epoch alone is not
   * enough, because a new model (preset switch, added point, lr change) can land on the
   * same epoch and would silently redraw the previous boundary under the new points.
   */
  modelGen: number;
  epoch: number;
}

export function createFieldRenderer() {
  const small = document.createElement('canvas');
  small.width = GW;
  small.height = GH;
  const sctx = small.getContext('2d')!;
  const simg = sctx.createImageData(GW, GH);

  // The forward pass over the grid is the expensive part (~5–9 ms). Reuse it whenever the
  // model has not changed — the snap pulse and crosshair repaint many times per epoch.
  let cachedGen = Number.NaN;
  let cachedEpoch = Number.NaN;
  let cachedP: Float32Array | null = null;

  return function drawField(ctx: CanvasRenderingContext2D, FW: number, FH: number, s: FieldState): void {
    ctx.clearRect(0, 0, FW, FH);

    if (s.trained) {
      let P = cachedP;
      if (P === null || s.modelGen !== cachedGen || s.epoch !== cachedEpoch) {
        P = computeField(s.w);
        fieldToImage(P, simg.data, LOOK.fieldGamma);
        sctx.putImageData(simg, 0, 0);
        cachedP = P;
        cachedGen = s.modelGen;
        cachedEpoch = s.epoch;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = s.fieldFade;
      ctx.drawImage(small, 0, 0, FW, FH);

      // bloom — additive blurred re-draw, so confident regions glow on the dark ground
      if (LOOK.bloomAlpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = LOOK.bloomAlpha * s.fieldFade;
        ctx.filter = `blur(${LOOK.bloomBlur}px)`;
        ctx.drawImage(small, 0, 0, FW, FH);
        ctx.filter = 'none';
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (LOOK.showGrid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(201,209,217,0.05)';
        ctx.lineWidth = 1;
        for (let k = 1; k < 8; k++) {
          const gx = (FW * k) / 8;
          const gy = (FH * k) / 8;
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, FH); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(FW, gy); ctx.stroke();
        }
        ctx.restore();
      }

      // the p=0.5 decision line — bright hot-core hairline, pulses once at the snap
      const segs = contourSegs(P);
      ctx.save();
      ctx.strokeStyle = `rgba(255,241,194,${0.95 * s.fieldFade})`;
      ctx.lineWidth = 1.7 + s.snapPulse * 1.4;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255,241,194,0.7)';
      ctx.shadowBlur = LOOK.lineGlow + s.snapPulse * 16;
      ctx.beginPath();
      for (const [a, b] of segs) {
        ctx.moveTo((a[0] / GW) * FW, (a[1] / GH) * FH);
        ctx.lineTo((b[0] / GW) * FW, (b[1] / GH) * FH);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Spec §4.3 — Beat 1 is a genuinely empty dark stage. No ghost "+A here" target
    // boxes: they read wizard-y and quietly turn "teach it YOUR rule" into
    // "put A in the pre-approved A spot". The coach line + counter carry the guidance.

    for (const d of s.data) {
      const px = nx(d.x[0]) * FW;
      const py = ny(d.x[1]) * FH;
      ctx.beginPath();
      ctx.arc(px, py, LOOK.pointR + 1.6, 0, 7);
      ctx.fillStyle = 'rgba(6,8,12,0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, LOOK.pointR, 0, 7);
      ctx.fillStyle = d.y === 0 ? POINT_A : POINT_B;
      ctx.fill();
      if (d.intruder) {
        ctx.beginPath();
        ctx.arc(px, py, LOOK.pointR + 4.5, 0, 7);
        ctx.strokeStyle = 'rgba(255,241,194,0.6)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2.5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const c = s.crosshair;
    if (c && c.active) {
      const px = nx(c.x) * FW;
      const py = ny(c.y) * FH;
      ctx.save();
      ctx.strokeStyle = c.brush === 0 ? POINT_A : POINT_B;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 9, py); ctx.lineTo(px + 9, py);
      ctx.moveTo(px, py - 9); ctx.lineTo(px, py + 9);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.stroke();
      ctx.restore();
    }
  };
}
