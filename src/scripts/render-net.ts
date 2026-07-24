/**
 * The mechanism net (spec §3, fork 2) — the fixed 2 → 8 → 1 MLP drawn from the model's
 * ACTUAL weights and activations. Neuron glow = activation, edge thickness = |w|,
 * edge colour = sign. Secondary to the field: this is the "you can see it think" flex,
 * dialled to a modest side-panel. Ported from the locked look reference.
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

  const padT = Math.max(14, NH * 0.1);
  const padB = padT + 15; // bottom room for the mono layer labels
  const colX = [NW * 0.16, NW * 0.5, NW * 0.84];
  const ypos = (n: number, i: number): number =>
    n === 1 ? (padT + (NH - padB)) / 2 : padT + (NH - padT - padB) * (i / (n - 1));

  const inN = 2;
  const outN = 1;
  const { a1, p } = forward(w, sampleX);
  const inA = [clamp(Math.abs(sampleX[0]), 0, 1), clamp(Math.abs(sampleX[1]), 0, 1)];
  const nodeXY = (layer: 0 | 1 | 2, i: number): [number, number] => {
    const n = layer === 0 ? inN : layer === 1 ? HID : outN;
    return [colX[layer]!, ypos(n, i)];
  };

  // Untrained the net sits quiet, not dead — it has weights, just no fit yet.
  const idle = trained ? 1 : 0.4;

  const drawEdge = (x1: number, y1: number, x2: number, y2: number, wt: number): void => {
    const mag = clamp(Math.abs(wt), 0, 3);
    const a = (0.1 + (0.5 * mag) / 3) * idle;
    ctx.strokeStyle = wt >= 0 ? `rgba(255,138,61,${a})` : `rgba(47,180,136,${a})`;
    ctx.lineWidth = 0.5 + (LOOK.edgeK * mag) / 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };

  for (let i = 0; i < inN; i++) {
    for (let j = 0; j < HID; j++) {
      const [ax, ay] = nodeXY(0, i);
      const [bx, by] = nodeXY(1, j);
      drawEdge(ax, ay, bx, by, w.W1[j]![i]!);
    }
  }
  for (let j = 0; j < HID; j++) {
    const [ax, ay] = nodeXY(1, j);
    const [bx, by] = nodeXY(2, 0);
    drawEdge(ax, ay, bx, by, w.W2[j]!);
  }

  const node = (x: number, y: number, act: number, warm: boolean): void => {
    const a = clamp(Math.abs(act), 0, 1) * idle;
    ctx.save();
    ctx.shadowBlur = LOOK.netGlow * a;
    ctx.shadowColor = warm ? 'rgba(255,150,90,0.9)' : 'rgba(120,230,200,0.9)';
    const base = warm ? [255, 150, 90] : [90, 210, 175];
    ctx.fillStyle = `rgb(${clamp(70 + base[0]! * a, 60, 255) | 0},${clamp(70 + base[1]! * a, 60, 255) | 0},${clamp(70 + base[2]! * a, 60, 255) | 0})`;
    ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < inN; i++) {
    const [x, y] = nodeXY(0, i);
    node(x, y, inA[i]!, sampleX[i]! >= 0);
  }
  for (let j = 0; j < HID; j++) {
    const [x, y] = nodeXY(1, j);
    node(x, y, a1[j]!, a1[j]! >= 0);
  }
  {
    const [x, y] = nodeXY(2, 0);
    node(x, y, Math.abs(p - 0.5) * 2, p >= 0.5);
  }

  ctx.fillStyle = '#5a6472';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('2 in', colX[0]!, NH - 4);
  ctx.fillText('8 hidden', colX[1]!, NH - 4);
  ctx.fillText('p(B)', colX[2]!, NH - 4);
}
