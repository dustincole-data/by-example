/**
 * The mechanism net — the fixed 2 → 8 → 1 MLP drawn from the model's ACTUAL weights and
 * activations. Neuron glow = activation, edge thickness = |w|, edge colour = sign.
 *
 * It is now a 74×30 glyph in the bottom strip, so it carries no labels of its own: the
 * canvas is `aria-hidden` and the plain-English caption beside it does the naming.
 */
import { forward, HID } from '../lib/net';
import { clamp } from '../lib/prng';
import { LOOK } from '../lib/palette';
import type { Net } from '../lib/types';

export function drawNet(
  ctx: CanvasRenderingContext2D,
  NW: number,
  NH: number,
  w: Net,
  sampleX: readonly [number, number],
  trained: boolean,
): void {
  ctx.clearRect(0, 0, NW, NH);

  const R = clamp(NH / 11, 2.4, 5.4);
  const pad = R + 2.5;
  const colX = [NW * 0.14, NW * 0.5, NW * 0.86];
  const ypos = (n: number, i: number): number => (n === 1 ? NH / 2 : pad + (NH - 2 * pad) * (i / (n - 1)));

  const { a1, p } = forward(w, sampleX);
  // Untrained the net sits quiet, not dead — it has weights, just no fit yet.
  const idle = trained ? 1 : 0.4;

  const drawEdge = (x1: number, y1: number, x2: number, y2: number, wt: number): void => {
    const mag = clamp(Math.abs(wt), 0, 3);
    const a = (0.1 + (0.5 * mag) / 3) * idle;
    ctx.strokeStyle = wt >= 0 ? `rgba(255,138,61,${a})` : `rgba(47,180,136,${a})`;
    ctx.lineWidth = 0.5 + (LOOK.edgeK * mag * 0.8) / 3;
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
}
