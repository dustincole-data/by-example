/**
 * The field — the whole screen. A deep diverging confidence ground, the bright p=0.5
 * hairline, and the user's examples crisp on top: a hard mark on a soft ground, so the
 * DATA always reads as the ground truth.
 *
 * The renderer owns the offscreen grid pair and the field cache, because the settle's
 * frame budget lives here (ticket 08, D4). Three things buy it:
 *  - the field is computed at GRID_LO while settling, GRID_HI only on the final frame;
 *  - the bloom is PRE-BLURRED offscreen at grid resolution, once per rebuild, instead of
 *    a `filter: blur()` composite at full canvas size on every frame;
 *  - the rebuild rate SELF-SCHEDULES: every frame while a rebuild is cheap, every other
 *    frame when it is not. A fixed every-other-frame rule measured exactly 20 boundary
 *    updates at 4× CPU — on the acceptance line with no margin for a slower phone.
 * Old path, for reference: 326 ms per settle frame at 4×, i.e. 3 frames of choreography.
 */
import {
  computeField, contourSegs, fieldToImage, nx, ny, GRID_HI, GRID_LO, type Seg,
} from '../lib/field';
import { LOOK, POINT_A, POINT_B } from '../lib/palette';
import { DROP_MS } from '../lib/pacing';
import { clamp } from '../lib/prng';
import type { Net, Point } from '../lib/types';

/** Cost ceiling for rebuilding on every settle frame, in ms. */
const REBUILD_BUDGET_MS = 9;

export interface FieldState {
  w: Net;
  data: readonly Point[];
  /** Bumped whenever the model changed, so the grid cache can never go stale. */
  modelGen: number;
  settling: boolean;
  reduced: boolean;
  /** The mark awaiting its label, in input space. */
  pending: readonly [number, number] | null;
  /** Index of a committed mark being relabelled / removed, or -1. */
  editing: number;
  /** Start time of the drop-in ring on the most recent mark, or null. */
  dropT0: number | null;
  /** The keyboard crosshair — only while the field itself has focus. */
  cursor: readonly [number, number] | null;
  /** Reduced motion: the boundary BEFORE this example, in normalized coords. */
  ghost: readonly Seg[] | null;
}

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export interface FieldRenderer {
  (ctx: CanvasRenderingContext2D, W: number, H: number, s: FieldState): void;
  /** The current boundary, normalized — captured as the ghost when a new example lands. */
  segs(): Seg[] | null;
  /** Force a rebuild (the domain or the model changed under us). */
  invalidate(): void;
}

export function createFieldRenderer(): FieldRenderer {
  const grids: Record<number, {
    cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData;
    bloom: HTMLCanvasElement; bctx: CanvasRenderingContext2D;
  }> = {};
  const gridCv = (n: number) => {
    let g = grids[n];
    if (!g) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const ctx = cv.getContext('2d')!;
      const bloom = document.createElement('canvas');
      bloom.width = bloom.height = n;
      g = grids[n] = { cv, ctx, img: ctx.createImageData(n, n), bloom, bctx: bloom.getContext('2d')! };
    }
    return g;
  };

  let segs: Seg[] | null = null;
  let dirty = true;
  let builtN = 0;
  let builtGen = Number.NaN;
  let frameNo = 0;
  let rebuildMs = 0;

  const draw = (ctx: CanvasRenderingContext2D, W: number, H: number, s: FieldState): void => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#070910';
    ctx.fillRect(0, 0, W, H);
    frameNo++;

    /* The marks ARE the thesis — your examples define the rule — so they cannot stay a
       phone's 6.5px on a 970px desktop field, where they read as specks. Anchored so a
       390-wide field is exactly 1.0× (ticket 08's measured size is untouched). */
    const PR = LOOK.pointR * clamp(W / 390, 1, 1.5);

    const trained = s.data.length > 0;
    if (trained) {
      const n = s.settling ? GRID_LO : GRID_HI;
      const stale = dirty || builtN !== n || builtGen !== s.modelGen;
      const affordable = !s.settling || rebuildMs < REBUILD_BUDGET_MS || frameNo % 2 === 0;
      if (stale && affordable) {
        const t0 = performance.now();
        const g = gridCv(n);
        const P = computeField(s.w, n);
        fieldToImage(P, g.img.data, LOOK.fieldGamma);
        g.ctx.putImageData(g.img, 0, 0);
        g.bctx.clearRect(0, 0, n, n);
        g.bctx.filter = `blur(${Math.max(0.4, (LOOK.bloomBlur * n) / Math.max(W, 1)).toFixed(2)}px)`;
        g.bctx.drawImage(g.cv, 0, 0);
        g.bctx.filter = 'none';
        segs = contourSegs(P, n);
        dirty = false;
        builtN = n;
        builtGen = s.modelGen;
        if (s.settling) rebuildMs = performance.now() - t0;
      }
      if (builtN) {
        const g = gridCv(builtN);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = s.settling ? 'low' : 'high';
        ctx.drawImage(g.cv, 0, 0, W, H);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = LOOK.bloomAlpha;
        ctx.drawImage(g.bloom, 0, 0, W, H);
        ctx.restore();
      }
    }

    // The quiet grid, so the field reads as measured space even when empty. Cells stay
    // square whatever the box aspect, so a tall field never looks stretched.
    ctx.save();
    ctx.strokeStyle = `rgba(201,209,217,${trained ? 0.05 : 0.09})`;
    ctx.lineWidth = 1;
    const rows = Math.max(3, Math.round(H / (W / 8)));
    for (let k = 1; k < 8; k++) {
      const gx = (W * k) / 8;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let k = 1; k < rows; k++) {
      const gy = (H * k) / rows;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    ctx.restore();

    // Reduced motion: the PREVIOUS boundary, dashed — the change is visible without moving.
    if (s.ghost) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,241,194,0.42)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (const [a, b] of s.ghost) { ctx.moveTo(a[0] * W, a[1] * H); ctx.lineTo(b[0] * W, b[1] * H); }
      ctx.stroke();
      ctx.restore();
    }

    // The p = 0.5 decision line.
    if (trained && segs) {
      const glow = s.settling ? 1 : 0;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,241,194,0.95)';
      ctx.lineWidth = 1.9 + glow * 0.9;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255,241,194,0.7)';
      ctx.shadowBlur = LOOK.lineGlow + glow * 12;
      ctx.beginPath();
      for (const [a, b] of segs) { ctx.moveTo(a[0] * W, a[1] * H); ctx.lineTo(b[0] * W, b[1] * H); }
      ctx.stroke();
      ctx.restore();
    }

    /* The example marks. Luminance does the separating now (see FIELD_MAX), so the halo
       and rim are back to their real job: holding the edge crisp where a mark straddles
       the boundary seam. The two classes also get a SHAPE the field has none of — ripe is
       a disc, not-ripe a diamond — so the reading survives colour-blindness and greyscale. */
    const path = (px: number, py: number, r: number, kind: 0 | 1 | null): void => {
      ctx.beginPath();
      if (kind === 1) {
        const d = r * 1.18;
        ctx.moveTo(px, py - d); ctx.lineTo(px + d, py);
        ctx.lineTo(px, py + d); ctx.lineTo(px - d, py);
        ctx.closePath();
      } else {
        ctx.arc(px, py, r, 0, 7);
      }
    };
    const mark = (
      ux: number, uy: number, color: string, r: number, ring: number,
      kind: 0 | 1 | null, alpha: number,
    ): void => {
      const px = nx(ux) * W, py = ny(uy) * H;
      ctx.save();
      ctx.globalAlpha = alpha;
      path(px, py, r + 1.3, kind); ctx.fillStyle = 'rgba(6,8,12,0.8)'; ctx.fill();
      path(px, py, r, kind); ctx.fillStyle = color; ctx.fill();
      path(px, py, r - 0.6, kind); ctx.strokeStyle = 'rgba(255,255,255,0.62)'; ctx.lineWidth = 1.1; ctx.stroke();
      if (ring > 0) {
        ctx.globalAlpha = alpha * (1 - ring);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        path(px, py, r + ring * 26, kind);
        ctx.stroke();
      }
      ctx.restore();
    };
    const pulse = (px: number, py: number, r: number, kind: 0 | 1 | null): void => {
      const a = s.reduced ? 1 : 0.72 + 0.28 * Math.sin(performance.now() / 260);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,241,194,0.95)';
      ctx.lineWidth = 1.4;
      path(px, py, r, kind);
      ctx.stroke();
      ctx.restore();
    };

    // While a mark is awaiting its label the committed ones step back, so "that one" has
    // exactly one possible referent.
    const armed = s.pending !== null || s.editing >= 0;
    const last = s.data.length - 1;
    s.data.forEach((d, i) => {
      let r = PR;
      let ring = 0;
      if (s.dropT0 !== null && i === last && !s.reduced) {
        const t = clamp((performance.now() - s.dropT0) / DROP_MS, 0, 1);
        r = PR * (0.2 + 0.8 * easeOutQuart(t));
        ring = t < 1 ? t : 0;
      }
      const sel = i === s.editing;
      if (sel) r = PR * 1.15;
      mark(d.x[0], d.x[1], d.y === 0 ? POINT_A : POINT_B, r, ring, d.y, armed && !sel ? 0.34 : 1);
      if (sel) pulse(nx(d.x[0]) * W, ny(d.x[1]) * H, PR + 8, d.y);
    });

    /* The pending mark gets the FULL mark treatment, in the cream the boundary line uses —
       a colour no ground occupies. It used to be the one mark drawn without it: a pale
       ~2.2:1 ring that could land 6 px from a seed and read as just another dot, leaving
       "Was that one ripe?" with no locatable referent. */
    if (s.pending) {
      const px = nx(s.pending[0]) * W, py = ny(s.pending[1]) * H;
      const a = s.reduced ? 1 : 0.72 + 0.28 * Math.sin(performance.now() / 260);
      mark(s.pending[0], s.pending[1], '#fff1c2', PR, 0, null, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,241,194,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(px, py, PR + 9, 0, 7); ctx.stroke();
      ctx.globalAlpha = a * 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, PR + 16, 0, 7); ctx.stroke();
      ctx.restore();
    }

    // The keyboard crosshair. Only drawn while the field has focus, so it never competes
    // with the pointer path.
    if (s.cursor && !s.pending) {
      const px = nx(s.cursor[0]) * W, py = ny(s.cursor[1]) * H;
      ctx.save();
      ctx.strokeStyle = 'rgba(76,201,240,0.85)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(0, py); ctx.lineTo(W, py);
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(76,201,240,0.95)';
      ctx.beginPath(); ctx.arc(px, py, PR + 3, 0, 7); ctx.stroke();
      ctx.restore();
    }
  };

  const renderer = draw as FieldRenderer;
  renderer.segs = () => segs;
  renderer.invalidate = () => { dirty = true; };
  return renderer;
}
