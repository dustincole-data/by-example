/**
 * The training curve (spec §3) — the receipt that real training happened.
 * Thin spectral stroke, faint gridlines, mono axis labels, annotation OFF the line
 * (canon overlap rule), a live marker at the current epoch.
 *
 * Spec §4.5 — THE HERO FLIPS BY PHASE:
 *   on-ramp → loss ↓ is the hero, accuracy the thin dashed companion. The user's
 *     hand-placed points drive accuracy to 1.00 by epoch ~2, and a flat 100% line
 *     running across the single most important moment reads as trivial or faked.
 *   sandbox → reverts to §1's locked accuracy-hero, where the presets make accuracy
 *     climb for real (two blobs 0.78→1.00, XOR 0.56→1.00, circles 0.53→1.00, moons 0.57→1.00).
 */
import { clamp } from '../lib/prng';
import { LOOK } from '../lib/palette';
import type { Snapshot } from '../lib/types';

export interface CurveState {
  hist: Snapshot[] | null;
  cur: number;
  /** Last epoch on the x-axis: the derived on-ramp window, or the full 240. */
  end: number;
  trained: boolean;
  /** true in the sandbox, false during the on-ramp. */
  accHero: boolean;
  /** Placeholder copy differs before the first Train. */
  isSandbox: boolean;
}

export function drawCurve(ctx: CanvasRenderingContext2D, CW: number, CH: number, s: CurveState): void {
  ctx.clearRect(0, 0, CW, CH);
  const m = { l: 40, r: 16, t: 20, b: 30 };
  const pw = CW - m.l - m.r;
  const ph = CH - m.t - m.b;
  const END = s.end;
  const X = (e: number): number => m.l + (e / END) * pw;
  const Y = (v: number): number => m.t + (1 - clamp(v, 0, 1)) * ph;

  ctx.strokeStyle = 'rgba(201,209,217,0.10)';
  ctx.lineWidth = 1;
  ctx.font = '9.5px "JetBrains Mono", monospace';
  ctx.fillStyle = '#6b7482';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const y = Y(v);
    ctx.globalAlpha = LOOK.plotGridA;
    ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + pw, y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillText(`${v * 100}%`, m.l - 7, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const e = Math.round((END * i) / 4);
    ctx.fillText(String(e), X(e), m.t + ph + 6);
  }
  ctx.fillStyle = '#8b949e';
  ctx.textBaseline = 'bottom';
  ctx.fillText('epoch →', m.l + pw / 2, CH - 1);

  const hist = s.hist;
  if (!s.trained || !hist) {
    ctx.fillStyle = '#5a6472';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(
      s.isSandbox ? 'press Train to plot accuracy ↑ / loss ↓' : 'press Train to plot loss ↓ / accuracy ↑',
      m.l + pw / 2,
      m.t + ph / 2,
    );
    return;
  }

  const cur = Math.min(s.cur, hist.length - 1);
  const loss0 = hist[0]!.loss || 1;
  const accHero = s.accHero;
  const heroV = (e: number): number => (accHero ? hist[e]!.acc : hist[e]!.loss / loss0);
  const compV = (e: number): number => (accHero ? hist[e]!.loss / loss0 : hist[e]!.acc);
  const compCol = accHero ? 'rgba(255,138,61,0.42)' : 'rgba(127,227,196,0.38)';

  // companion series — thin + dashed, never annotated
  ctx.strokeStyle = compCol;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (let e = 0; e <= cur; e++) {
    const x = X(e), y = Y(compV(e));
    e ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // the not-yet-reached remainder of the hero series, ghosted
  ctx.strokeStyle = 'rgba(201,209,217,0.14)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let e = cur; e <= END; e++) {
    const x = X(e), y = Y(heroV(e));
    e === cur ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // hero series — spectral stroke
  const grad = ctx.createLinearGradient(m.l, 0, m.l + pw, 0);
  if (accHero) {
    grad.addColorStop(0, '#2fb488');
    grad.addColorStop(0.6, '#7fe3c4');
    grad.addColorStop(1, '#d6fff0');
  } else {
    grad.addColorStop(0, '#c9622a');
    grad.addColorStop(0.6, '#ff8a3d');
    grad.addColorStop(1, '#ffc79a');
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = LOOK.curveW;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let e = 0; e <= cur; e++) {
    const x = X(e), y = Y(heroV(e));
    e ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  // raw per-epoch scatter under the stroke (Stefaner rigour — show the measurements)
  ctx.fillStyle = accHero ? 'rgba(127,227,196,0.5)' : 'rgba(255,170,110,0.5)';
  for (let e = 0; e <= cur; e += 2) {
    ctx.beginPath(); ctx.arc(X(e), Y(heroV(e)), 1.5, 0, 7); ctx.fill();
  }

  // live epoch marker
  const mx = X(cur);
  const my = Y(heroV(cur));
  ctx.strokeStyle = 'rgba(76,201,240,0.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(mx, m.t); ctx.lineTo(mx, m.t + ph); ctx.stroke();
  ctx.fillStyle = accHero ? '#d6fff0' : '#ffc79a';
  ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 7); ctx.fill();

  // annotation sits OFF the line (canon overlap rule)
  const high = my < CH * 0.42;
  const lx = mx < CW * 0.62 ? mx + 14 : mx - 14;
  const la: CanvasTextAlign = mx < CW * 0.62 ? 'left' : 'right';
  const ly = high ? my + 22 : my - 30;
  ctx.strokeStyle = 'rgba(201,209,217,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx + (mx < CW * 0.62 ? 5 : -5), high ? my + 6 : my - 6);
  ctx.lineTo(lx, high ? ly - 9 : ly + 13);
  ctx.stroke();
  ctx.textAlign = la;
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 11px "Archivo", sans-serif';
  ctx.fillStyle = '#e8eef4';
  ctx.fillText(
    accHero ? `acc ${hist[cur]!.acc.toFixed(2)}` : `loss ${hist[cur]!.loss.toFixed(3)}`,
    lx,
    ly,
  );
  ctx.font = '9.5px "JetBrains Mono", monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText(
    cur < END ? (accHero ? 'still climbing' : 'still falling') : (accHero ? 'converged' : 'settled'),
    lx,
    ly + 13,
  );

  // legend — hero named first, in its own colour
  ctx.textAlign = 'left';
  ctx.font = '9.5px "JetBrains Mono", monospace';
  if (accHero) {
    ctx.fillStyle = '#7fe3c4';
    ctx.fillText('accuracy ↑', m.l + 3, m.t + ph - 7);
    ctx.fillStyle = 'rgba(255,138,61,0.85)';
    ctx.fillText('loss ↓ (norm)', m.l + 72, m.t + ph - 7);
  } else {
    ctx.fillStyle = '#ff8a3d';
    ctx.fillText('loss ↓ (norm)', m.l + 3, m.t + ph - 7);
    ctx.fillStyle = 'rgba(127,227,196,0.75)';
    ctx.fillText('accuracy ↑', m.l + 82, m.t + ph - 7);
  }
}
