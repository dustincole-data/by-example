/**
 * The mechanism net — the fixed 2 → 8 → 1 MLP drawn from the model's ACTUAL weights and
 * activations. Neuron glow = activation, edge thickness = |w|, edge colour = sign.
 *
 * It renders at two sizes. On the phone it is a 74×30 glyph in the bottom strip carrying
 * no labels of its own: the canvas is `aria-hidden` and the plain-English caption beside
 * it does the naming. On desktop (ticket 13) it is the rail's second graphic at ~310×172,
 * where the room buys labels — and naming the inputs `sweet` / `soft` is what ties the
 * machine to the axes of the field beside it.
 *
 * Every size rule below is written to return the phone's EXACT previous geometry at
 * NH = 30 / NW = 74; the desktop size is the only thing that moves.
 */
import { forward, HID } from '../lib/net';
import { clamp } from '../lib/prng';
import { LOOK } from '../lib/palette';
import type { Net } from '../lib/types';

/** Below this width the diagram is a glyph and labels would not fit, let alone read. */
const LABEL_AT_PX = 200;
/** Mirrors --mono. Read as a literal, not via getComputedStyle: this draws every frame. */
const LABEL_FONT = "500 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

export function drawNet(
  ctx: CanvasRenderingContext2D,
  NW: number,
  NH: number,
  w: Net,
  sampleX: readonly [number, number],
  trained: boolean,
): void {
  ctx.clearRect(0, 0, NW, NH);

  const labelled = NW >= LABEL_AT_PX;
  // The slope is the phone's; only the ceiling lifts, and it is set by how many hidden
  // nodes have to stack in NH without touching.
  const R = clamp(NH / 11, 2.4, Math.max(5.4, NH / (HID * 2.6)));
  const k = clamp(NH / 30, 1, 1.9);
  const pad = R + 2.5;
  // Labelled, the first column shifts right to open a gutter for the input names.
  const colX = labelled ? [NW * 0.3, NW * 0.6, NW * 0.9] : [NW * 0.14, NW * 0.5, NW * 0.86];
  const ypos = (n: number, i: number): number => (n === 1 ? NH / 2 : pad + (NH - 2 * pad) * (i / (n - 1)));

  const { a1, p } = forward(w, sampleX);
  // Untrained the net sits quiet, not dead — it has weights, just no fit yet.
  const idle = trained ? 1 : 0.4;

  const drawEdge = (x1: number, y1: number, x2: number, y2: number, wt: number): void => {
    const mag = clamp(Math.abs(wt), 0, 3);
    const a = (0.1 + (0.5 * mag) / 3) * idle;
    ctx.strokeStyle = wt >= 0 ? `rgba(255,138,61,${a})` : `rgba(47,180,136,${a})`;
    ctx.lineWidth = (0.5 + (LOOK.edgeK * mag * 0.8) / 3) * k;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < HID; j++) {
      drawEdge(colX[0]!, ypos(2, i), colX[1]!, ypos(HID, j), w.W1[j]![i]!);
    }
  }
  for (let j = 0; j < HID; j++) {
    drawEdge(colX[1]!, ypos(HID, j), colX[2]!, ypos(1, 0), w.W2[j]!);
  }

  const node = (x: number, y: number, act: number, warm: boolean): void => {
    const a = clamp(Math.abs(act), 0, 1) * idle;
    ctx.save();
    ctx.shadowBlur = LOOK.netGlow * a;
    ctx.shadowColor = warm ? 'rgba(255,150,90,0.9)' : 'rgba(120,230,200,0.9)';
    const base = warm ? [255, 150, 90] : [90, 210, 175];
    ctx.fillStyle = `rgb(${clamp(70 + base[0]! * a, 60, 255) | 0},${clamp(70 + base[1]! * a, 60, 255) | 0},${clamp(70 + base[2]! * a, 60, 255) | 0})`;
    ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    ctx.restore();
  };

  for (let i = 0; i < 2; i++) node(colX[0]!, ypos(2, i), clamp(Math.abs(sampleX[i]!), 0, 1), sampleX[i]! >= 0);
  for (let j = 0; j < HID; j++) node(colX[1]!, ypos(HID, j), a1[j]!, a1[j]! >= 0);
  node(colX[2]!, ypos(1, 0), Math.abs(p - 0.5) * 2, p >= 0.5);

  // The two input nodes are the two axes of the field beside this. Saying so is the whole
  // reason the diagram is worth enlarging.
  if (!labelled) return;
  ctx.save();
  ctx.font = LABEL_FONT;
  ctx.fillStyle = 'rgba(139,148,158,0.95)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText('sweet', colX[0]! - R - 8, ypos(2, 0));
  ctx.fillText('soft', colX[0]! - R - 8, ypos(2, 1));
  ctx.textAlign = 'center';
  ctx.fillText('guess', colX[2]!, NH / 2 + R + 13);
  ctx.restore();
}
