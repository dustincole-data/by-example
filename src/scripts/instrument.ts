/**
 * By Example — the controller.
 *
 * One screen, one gesture: tap the field to drop an example, answer "Was that one ripe?",
 * and the boundary re-settles on its own. No Train button, no modes, no tour — training is
 * continuous, so the settle IS the evidence the machine learned (tickets 07 + 08).
 *
 * Everything on screen is the real model: the boundary, the status count, and the net
 * diagram's weights and activations are all read off the live network.
 */
import { initNet, step, metrics, cloneNet, SEED, LR, HID_DEFAULT } from '../lib/net';
import {
  computeField, signOf, nx, ny, vx, vy, XR, YR, GRID_LO, type Seg,
} from '../lib/field';
import {
  SETTLE_MS, SETTLE_EPOCHS, epochsBy, MOVED_FRAC, MOVED_MS, GHOST_MS, DROP_MS, UNDO_MS,
  FIT_MS, FIT_EPOCHS, fitEpochsBy,
} from '../lib/pacing';
import { clamp } from '../lib/prng';
import { ASK, CHIP, RESET, UNDO, RM_NOTE, fieldAlt, probeText, forPointer, EXPLAIN } from '../lib/copy';
import { PATTERN_N, PRESET_SEED, samplePattern, type PatternKey } from '../lib/patterns';
import { forward } from '../lib/net';
import type { Net, Point } from '../lib/types';
import { createFieldRenderer, type FieldState } from './render-field';
import { drawNet } from './render-net';

const prefersReducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How close a tap has to land to count as "you meant that mark", in CSS px. */
const HIT_PX = 22;
/** Re-tapping inside this radius of the pending ring disarms instead of moving it. */
const DISARM_PX = 20;

/** `reduced` is injectable so the no-motion path can be driven in a test. */
export function mountInstrument(root: HTMLElement, reduced = prefersReducedMotion()): void {
  const q = <T extends Element>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`instrument: missing ${sel}`);
    return el;
  };

  const fieldC = q<HTMLCanvasElement>('.fieldcanvas');
  const netC = q<HTMLCanvasElement>('.netcanvas');
  const probeEl = q<HTMLElement>('.probe');
  const altEl = q<HTMLElement>('.fieldalt');
  const chipEl = q<HTMLElement>('.chip');
  const explainEl = q<HTMLElement>('.explain');
  const presetEl = q<HTMLSelectElement>('.preset');
  const askEl = q<HTMLElement>('.ask');
  const rmvBtn = q<HTMLButtonElement>('.rmv');
  const overBtn = q<HTMLButtonElement>('.over');
  const rmNoteEl = q<HTMLElement>('.rmnote');
  const labs = [...root.querySelectorAll<HTMLButtonElement>('.lab')];

  const drawFieldTo = createFieldRenderer();

  /* A real hovering pointer. Two desktop behaviours hang off it — the copy says `click`
     instead of `tap`, and hovering the field probes the model — and both are wrong for a
     finger, so neither is gated on width: a touch laptop at 1440 still taps. */
  const canProbe = matchMedia('(hover: hover) and (pointer: fine)');
  const say = (s: string): string => forPointer(s, canProbe.matches);

  /* ── state ───────────────────────────────────────────────────────── */
  let net: Net = initNet(SEED, HID_DEFAULT);
  // presetEl's own initial value is the source of truth (its options are generated from
  // PATTERN_ORDER, and the default-selected option is PATTERN_ORDER[0] = 'straight') —
  // read it once instead of a second, independently-hardcoded literal.
  let presetKey: PatternKey = presetEl.value as PatternKey;
  let data: Point[] = [];
  /** Bumped on every weight change, so the field's grid cache can never go stale. */
  let modelGen = 0;
  /** False until the user's own first example — the chip carries the thesis until then. */
  let touched = false;
  let pending: [number, number] | null = null;
  let editing = -1;
  let settleT0: number | null = null;
  let settleRan = 0;
  let ghost: Seg[] | null = null;
  let ghostUntil = 0;
  let dropT0: number | null = null;
  let cursor: [number, number] | null = null;
  let focused = false;
  /** The point a mouse is hovering — desktop's extra verb (ticket 13). Null on touch. */
  let probe: [number, number] | null = null;
  /** The class map before this settle, to detect whether the line actually moved. */
  let preSign: Uint8Array | null = null;
  let chipMsg: string | null = null;
  let chipUntil = 0;
  let undoSnap: { data: Point[]; net: Net; touched: boolean } | null = null;
  let undoUntil = 0;
  /** The animated fit — spec §5.5. Null once it has finished (or under reduced motion,
   *  where it never starts: the epochs run synchronously in refit() instead). */
  let fitT0: number | null = null;
  let fitRan = 0;
  /** Cumulative epoch counter — the readout block's `epoch` slot (spec §6.3), wired in
   *  once that block exists. */
  let epoch = 0;

  const trained = (): boolean => data.length > 0;
  const armed = (): boolean => pending !== null || editing >= 0;
  const undoOpen = (): boolean => undoSnap !== null && undoUntil > 0;

  /* ── status ──────────────────────────────────────────────────────── */
  function statusText(): string {
    const n = data.length;
    if (!n) return CHIP.empty;
    if (!touched) return CHIP.thesis;
    if (settleT0 !== null) return CHIP.learning;
    if (chipMsg !== null) return chipMsg;
    if (data.every((d) => d.y === data[0]!.y)) return data[0]!.y === 0 ? CHIP.allRipe : CHIP.noneRipe;
    const { correct } = metrics(net, data);
    if (correct < n) return CHIP.missed(n - correct, n);
    return CHIP.count(n, data.reduce((k, d) => k + (d.y === 0 ? 1 : 0), 0));
  }

  function syncChrome(): void {
    explainEl.textContent = say(EXPLAIN);
    askEl.textContent = say(pending ? ASK.armed : editing >= 0 ? ASK.editing : ASK.rest);
    askEl.classList.toggle('asking', armed());
    rmvBtn.hidden = editing < 0;
    // The label buttons are never disabled and never dimmed: they are the only colour
    // legend on screen and the most button-shaped thing on it, so a first-timer taps them
    // first. Disabled they read as two broken buttons and answer nothing.
    for (const b of labs) b.classList.toggle('rest', !armed());
    const status = say(statusText());
    chipEl.textContent = status;
    overBtn.textContent = undoOpen() ? UNDO : RESET;
    altEl.textContent = say(fieldAlt(data.length, status));
    syncRmNote();
  }
  /** Driven off the ghost's expiry, never off "a ghost object once existed" — the one
   *  affordance built for an access need must not outlive the line it names. */
  function syncRmNote(): void {
    const on = reduced && ghost !== null;
    rmNoteEl.hidden = !on;
    rmNoteEl.textContent = on ? RM_NOTE : '';
  }

  /* ── learning ────────────────────────────────────────────────────── */
  /** Capture the ghost + the pre-training class map, then (re)settle. Shared by a new
   *  example, a relabel and a removal — all three are "the rule changed because you said so". */
  function relearn(): void {
    preSign = trained() ? signOf(computeField(net, GRID_LO)) : null;
    ghost = drawFieldTo.segs();
    ghostUntil = performance.now() + GHOST_MS;
    if (reduced) {
      for (let i = 0; i < SETTLE_EPOCHS; i++) step(net, data, LR);
      settleT0 = null;
      afterSettle();
    } else {
      settleT0 = performance.now();
      settleRan = 0;
    }
    modelGen++;
    syncChrome();
  }
  function afterSettle(): void {
    if (!preSign) return;
    const post = signOf(computeField(net, GRID_LO));
    let flips = 0;
    for (let i = 0; i < post.length; i++) if (post[i] !== preSign[i]) flips++;
    preSign = null;
    if (flips / post.length > MOVED_FRAC) {
      chipMsg = CHIP.moved;
      chipUntil = performance.now() + MOVED_MS;
    }
  }
  function commit(x: number, y: number, label: 0 | 1): void {
    data.push({ x: [x, y], y: label });
    touched = true;
    dropT0 = performance.now();
    relearn();
  }
  const presetData = (key: PatternKey): Point[] => samplePattern(key, PRESET_SEED, PATTERN_N[key]);

  /** Replace the data and START the fit — never run it. Spec §5.5. */
  function refit(nextData: Point[], hid: number): void {
    net = initNet(SEED, hid);
    data = nextData;
    epoch = 0;
    touched = false;
    pending = null;
    editing = -1;
    settleT0 = null;
    ghost = null;
    dropT0 = null;
    chipMsg = null;
    if (reduced) {
      for (let i = 0; i < FIT_EPOCHS; i++) step(net, data, LR);
      epoch = FIT_EPOCHS;
      fitT0 = null;
    } else {
      fitT0 = performance.now();
      fitRan = 0;
    }
    modelGen++;
    drawFieldTo.invalidate();
  }

  /* ── the loop ────────────────────────────────────────────────────── */
  const dpr = (): number => Math.min(devicePixelRatio || 1, 2.5);
  function fitCanvas(cv: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; W: number; H: number } {
    const r = dpr();
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * r) || cv.height !== Math.round(H * r)) {
      cv.width = Math.round(W * r);
      cv.height = Math.round(H * r);
    }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return { ctx, W, H };
  }

  function fieldState(): FieldState {
    return {
      w: net, data, modelGen,
      settling: settleT0 !== null,
      reduced,
      pending, editing, dropT0,
      cursor: focused && cursor ? cursor : null,
      probe,
      ghost,
    };
  }

  function frame(): void {
    requestAnimationFrame(frame);
    const now = performance.now();

    if (fitT0 !== null) {
      const want = fitEpochsBy(now - fitT0);
      for (let i = fitRan; i < want; i++) step(net, data, LR);
      if (want > fitRan) { epoch += want - fitRan; fitRan = want; modelGen++; }
      if (now - fitT0 >= FIT_MS) { fitT0 = null; syncChrome(); }
    }
    if (settleT0 !== null) {
      const el = now - settleT0;
      const want = epochsBy(el);
      for (let i = settleRan; i < want; i++) step(net, data, LR);
      if (want > settleRan) { settleRan = want; modelGen++; }
      if (el >= SETTLE_MS) { settleT0 = null; modelGen++; afterSettle(); syncChrome(); }
    }
    // Transient chrome expires on its own, on the frame it is actually due.
    if (chipMsg !== null && now >= chipUntil) { chipMsg = null; syncChrome(); }
    if (undoOpen() && now >= undoUntil) { undoSnap = null; undoUntil = 0; syncChrome(); }
    if (ghost !== null && now >= ghostUntil) { ghost = null; syncRmNote(); }
    if (dropT0 !== null && now - dropT0 >= DROP_MS) dropT0 = null;

    const f = fitCanvas(fieldC);
    drawFieldTo(f.ctx, f.W, f.H, fieldState());

    /* The net diagram reads whatever point is being ASKED about: the hovered point, else
       the keyboard crosshair, else the last example placed. On the phone only the last
       branch can ever happen, so the glyph behaves exactly as it did. */
    const asked = probe ?? (focused && cursor ? cursor : null);
    const n = fitCanvas(netC);
    if (n.W && n.H) {
      const sample = asked ?? (data.length ? data[data.length - 1]!.x : ([0, 0] as [number, number]));
      drawNet(n.ctx, n.W, n.H, net, sample, trained());
    }
    // Written only on change: this runs every frame, and textContent is a style recalc.
    const want = asked ? probeText(forward(net, asked).p) : '';
    if (probeEl.textContent !== want) probeEl.textContent = want;
  }

  /* ── placing and labelling ───────────────────────────────────────── */
  const disarm = (): void => { pending = null; editing = -1; syncChrome(); };
  const armAt = (x: number, y: number): void => { editing = -1; pending = [x, y]; syncChrome(); };

  /** Distance in CSS px between two points in input space. */
  function gapPx(a: readonly [number, number], b: readonly [number, number]): number {
    const dx = (nx(a[0]) - nx(b[0])) * fieldC.clientWidth;
    const dy = (ny(a[1]) - ny(b[1])) * fieldC.clientHeight;
    return Math.hypot(dx, dy);
  }
  /** Which committed mark did that tap land on? −1 for none. */
  function hitAt(p: readonly [number, number]): number {
    let best = -1;
    let bd = HIT_PX;
    data.forEach((d, i) => {
      const g = gapPx(d.x, p);
      if (g < bd) { bd = g; best = i; }
    });
    return best;
  }

  const ptOf = (e: PointerEvent): [number, number] => {
    const r = fieldC.getBoundingClientRect();
    return [
      vx(clamp((e.clientX - r.left) / r.width, 0, 1)),
      vy(clamp((e.clientY - r.top) / r.height, 0, 1)),
    ];
  };

  /* Arm on pointerdown, TRACK on pointermove, commit on pointerup — 2.5.2 Pointer
     Cancellation. Placing on pointerdown made a mis-touch uncancellable.
     `armedAtDown` is where the pending mark sat when the press STARTED: the disarm test
     has to run against that, not against the tracked position, or dragging the mark would
     always end up 0 px from itself and cancel instead of moving. */
  let down = false;
  let armedAtDown: [number, number] | null = null;
  fieldC.addEventListener('pointerdown', (e) => {
    down = true;
    armedAtDown = pending ? [pending[0], pending[1]] : null;
    try { fieldC.setPointerCapture(e.pointerId); } catch { /* not capturable — harmless */ }
  });
  /* A mouse can ask the model about a point without committing to one, and the rail's
     enlarged net diagram is the answer — so hovering feeds that point through the live
     net. */
  fieldC.addEventListener('pointermove', (e) => {
    if (canProbe.matches) probe = ptOf(e);
    if (!down || !pending) return;
    pending = ptOf(e);
  });
  fieldC.addEventListener('pointerleave', () => { probe = null; });
  fieldC.addEventListener('pointercancel', () => {
    down = false;
    if (armedAtDown) { pending = armedAtDown; armedAtDown = null; }
  });
  fieldC.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    const p = ptOf(e);
    const from = armedAtDown;
    armedAtDown = null;
    if (from) {
      // Re-tapping the pending ring disarms; anywhere else moves the mark there.
      if (gapPx(from, p) < DISARM_PX) disarm();
      else armAt(p[0], p[1]);
      return;
    }
    const h = hitAt(p);
    if (h >= 0) { editing = h; syncChrome(); return; }
    armAt(p[0], p[1]);
  });

  /* The field is a real control: absent a role, a tabindex and a key handler it was
     missing from the accessibility tree entirely (2.1.1 A, 4.1.2 A). Arrow keys move a
     visible crosshair, Enter arms and hands focus to the label pair — so place-and-label
     is Tab → arrows → Enter → Enter, with no pointer at all. */
  fieldC.addEventListener('focus', () => { focused = true; if (!cursor) cursor = [0, 0]; });
  fieldC.addEventListener('blur', () => { focused = false; syncChrome(); });
  fieldC.addEventListener('keydown', (e) => {
    if (!cursor) cursor = [0, 0];
    const f = e.shiftKey ? 0.25 : 1;
    const sx = ((XR[1] - XR[0]) / 20) * f;
    const sy = ((YR[1] - YR[0]) / 20) * f;
    switch (e.key) {
      case 'ArrowLeft': cursor[0] = clamp(cursor[0] - sx, XR[0], XR[1]); break;
      case 'ArrowRight': cursor[0] = clamp(cursor[0] + sx, XR[0], XR[1]); break;
      case 'ArrowUp': cursor[1] = clamp(cursor[1] + sy, YR[0], YR[1]); break;
      case 'ArrowDown': cursor[1] = clamp(cursor[1] - sy, YR[0], YR[1]); break;
      case 'Enter': case ' ': armAt(cursor[0], cursor[1]); labs[0]?.focus(); break;
      case 'Escape': disarm(); break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    syncChrome();
  });

  for (const b of labs) {
    b.addEventListener('click', () => {
      const k = Number(b.dataset.k) as 0 | 1;
      if (editing >= 0) {
        // Reuses the one gesture to supply the missing verb. Without it a mis-tapped
        // label is indistinguishable from a deliberate one: the user watches the machine
        // get it wrong and cannot tell it was their own error.
        if (data[editing]!.y !== k) { data[editing]!.y = k; touched = true; editing = -1; relearn(); }
        else { editing = -1; syncChrome(); }
        return;
      }
      if (!pending) { askEl.textContent = say(ASK.needPoint); askEl.classList.add('asking'); return; }
      const p = pending;
      pending = null;
      commit(p[0], p[1], k);
    });
  }

  rmvBtn.addEventListener('click', () => {
    if (editing < 0) return;
    data.splice(editing, 1);
    editing = -1;
    touched = true;
    if (trained()) relearn();
    else { net = initNet(SEED, HID_DEFAULT); modelGen++; syncChrome(); }
  });

  presetEl.addEventListener('change', () => {
    presetKey = presetEl.value as PatternKey;
    // Disarm any undo in flight BEFORE refitting: undoSnap holds a snapshot of the preset
    // that was active before it was armed, and refit() below builds the NEW preset's data.
    // Leaving undoSnap set would let the undo button restore a different pattern than the
    // one now selected in the dropdown — same desync `reset`'s own undo window would hit
    // if left alone (final review, Important #2).
    undoSnap = null;
    undoUntil = 0;
    refit(presetData(presetKey), HID_DEFAULT);
    syncChrome();
  });

  /* `reset` re-seeds whichever preset is currently selected, so it is a reset, not "start
     over" — and it is one unconfirmed tap in the right-thumb landing zone that wipes
     everything. Undo, not a confirmation dialog. */
  overBtn.addEventListener('click', () => {
    if (undoOpen()) {
      const s = undoSnap!;
      data = s.data; net = s.net; touched = s.touched;
      undoSnap = null; undoUntil = 0;
      pending = null; editing = -1; settleT0 = null;
      modelGen++;
      syncChrome();
      return;
    }
    undoSnap = { data: data.map((d) => ({ x: [d.x[0], d.x[1]] as [number, number], y: d.y })), net: cloneNet(net), touched };
    undoUntil = performance.now() + UNDO_MS;
    refit(presetData(presetKey), HID_DEFAULT);
    syncChrome();
  });

  // Escape has to work from the label buttons too — that is where focus sits once armed.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && armed() && e.target !== fieldC) disarm();
  });

  /* ── boot ────────────────────────────────────────────────────────── */
  refit(presetData(presetKey), HID_DEFAULT);
  syncChrome();
  requestAnimationFrame(frame);
}
