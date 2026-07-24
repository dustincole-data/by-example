/**
 * By Example — the instrument controller.
 *
 * Ported from the locked on-ramp reference (.scratch/teach-a-machine/assets/03) over the
 * locked look reference (assets/01). Choreography per spec §4, engine per §5.
 * Everything on screen is the real model: accuracy, loss, epoch, the boundary, and the
 * net panel's activations and weights are all read off the trained network.
 */
import { train, initNet, EPOCHS, SEED, LR_ONRAMP, LR_SANDBOX } from '../lib/net';
import { planRun, type RunPlan } from '../lib/pacing';
import { GW, GH, vx, vy, XR, YR } from '../lib/field';
import { PRESET_GEN, moons, type PresetKey } from '../lib/presets';
import { clamp } from '../lib/prng';
import {
  beatScript, THESIS_HTML, NEED_A, NEED_B, nudgeA, nudgeB, NEED_BOTH,
  type BeatId, type BeatState,
} from '../lib/copy';
import type { Point, Snapshot, Brush } from '../lib/types';
import { createFieldRenderer, type FieldState } from './render-field';
import { drawNet } from './render-net';
import { drawCurve } from './render-curve';

const prefersReducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

type Phase = BeatId | 'thesis' | 'sandbox';

/** `reduced` is injectable so the no-motion path (spec §4.8) can be driven in a test. */
export function mountInstrument(root: HTMLElement, reduced = prefersReducedMotion()): void {
  const REDUCED = reduced;
  const q = <T extends Element>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`instrument: missing ${sel}`);
    return el;
  };

  const fieldC = q<HTMLCanvasElement>('.fieldcanvas');
  const netC = q<HTMLCanvasElement>('.netcanvas');
  const curveC = q<HTMLCanvasElement>('.curvecanvas');
  const fieldwrap = q<HTMLElement>('.fieldwrap');
  const exEl = q('.ex'), acEl = q('.ac'), lsEl = q('.ls'), epEl = q('.ep');
  const lrInput = q<HTMLInputElement>('.lr');
  const lrVal = q('.lrval');
  const trainBtn = q<HTMLButtonElement>('[data-act=train]');
  const coach = q<HTMLElement>('.coach');
  const ckickt = q('.ckickt'), cline = q('.cline'), csub = q('.csub');
  const cnext = q<HTMLButtonElement>('.cnext');
  const skipBtn = q<HTMLButtonElement>('.skip');
  const dots = [...root.querySelectorAll<HTMLElement>('.dots i')];
  const badge = q<HTMLElement>('.badge');

  const SCRIPT = beatScript(REDUCED);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const drawFieldTo = createFieldRenderer();

  /* ── state ───────────────────────────────────────────────────────── */
  let data: Point[] = [];
  let hist: Snapshot[] | null = null;
  let cur = 0;
  let curF = 0;
  let trained = false;
  let playing = false;
  let raf = 0;
  let runT0 = 0;
  let lrv = LR_ONRAMP;
  let brush: Brush = 0;
  let phase: Phase = 'beat1';
  let netSample = 0;
  let snapFired = false;
  let snapPulse = 0;
  let fieldFade = 1;
  let plan: RunPlan = { snapEpoch: 1, rampEnd: 20, rampEps: 20 / 2.4 };
  /** Bumped on every fit. The field's grid cache keys on this as well as the epoch —
   *  a new model can land on the same epoch (preset switch, added point, lr change). */
  let modelGen = 0;
  const idleW = initNet(SEED);
  const cross = { x: 0, y: 0, active: false };

  let fctx!: CanvasRenderingContext2D, nctx!: CanvasRenderingContext2D, cctx!: CanvasRenderingContext2D;
  let FW = 0, FH = 0, NW = 0, NH = 0, CW = 0, CH = 0;

  /** The single place a new fit is produced, so the render cache can never go stale. */
  function fit(): void {
    hist = train(data, lrv, SEED);
    plan = planRun(hist);
    modelGen++;
  }

  const onRamp = (): boolean => phase === 'beat2' || phase === 'beat3';
  const endEpoch = (): number => (onRamp() ? plan.rampEnd : EPOCHS);
  const curW = () => (trained && hist ? hist[cur]!.w : idleW);
  const countClass = (y: 0 | 1): number => data.reduce((n, d) => n + (d.y === y ? 1 : 0), 0);

  /* ── coach strip ─────────────────────────────────────────────────── */
  function setCoach(beat: BeatId, state: BeatState): void {
    const s = SCRIPT[beat][state];
    ckickt.textContent = SCRIPT[beat].kick;
    cline.innerHTML = s.line.replace('{n}', String(data.length));
    cline.classList.toggle('payoff', state === 'payoff');
    csub.innerHTML = s.sub;
    const n = { beat1: 0, beat2: 1, beat3: 2 }[beat];
    dots.forEach((d, i) => { d.className = i < n ? 'done' : i === n ? 'on' : ''; });
  }
  function flashCoachSub(msg: string): void {
    const old = csub.innerHTML;
    csub.innerHTML = `<span style="color:#ffd166">${msg}</span>`;
    setTimeout(() => { csub.innerHTML = old; }, 1600);
  }
  const enableNext = (): void => { cnext.disabled = false; cnext.classList.add('pulse'); };
  const disableNext = (): void => { cnext.disabled = true; cnext.classList.remove('pulse'); };

  /* ── layout ──────────────────────────────────────────────────────── */
  function sizeWH(c: HTMLCanvasElement, cssW: number, cssH: number) {
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH };
  }
  const parentW = (el: HTMLElement): number =>
    Math.max(140, el.parentElement!.getBoundingClientRect().width);

  function layout(): void {
    const fw = parentW(fieldC);
    const fh = Math.round((fw * GH) / GW);
    const f = sizeWH(fieldC, fw, fh); fctx = f.ctx; FW = f.w; FH = f.h;
    // the right column (net over curve) fills exactly the field height → no dead space
    const rw = parentW(netC);
    const half = Math.round((fh - 1) / 2);
    const n = sizeWH(netC, rw, half); nctx = n.ctx; NW = n.w; NH = n.h;
    const c = sizeWH(curveC, rw, fh - 1 - half); cctx = c.ctx; CW = c.w; CH = c.h;
    drawAll();
  }

  /* ── draw ────────────────────────────────────────────────────────── */
  function fieldState(): FieldState {
    return {
      w: curW(),
      data,
      trained,
      fieldFade,
      snapPulse,
      crosshair: cross.active ? { x: cross.x, y: cross.y, active: true, brush } : null,
      modelGen,
      epoch: cur,
    };
  }
  function updateReadouts(): void {
    exEl.textContent = String(data.length);
    if (trained && hist) {
      const h = hist[cur]!;
      acEl.textContent = h.acc.toFixed(2);
      lsEl.textContent = h.loss.toFixed(3);
      epEl.textContent = String(cur);
    } else {
      acEl.textContent = '—';
      lsEl.textContent = '—';
      epEl.textContent = '—';
    }
  }
  function drawAll(): void {
    const w = curW();
    drawFieldTo(fctx, FW, FH, fieldState());
    const sampleX = data.length ? data[netSample % data.length]!.x : ([0.3, 0.3] as [number, number]);
    drawNet(nctx, NW, NH, w, sampleX, trained);
    drawCurve(cctx, CW, CH, {
      hist, cur, end: endEpoch(), trained,
      accHero: phase === 'sandbox',
      isSandbox: phase === 'sandbox',
    });
    updateReadouts();
  }

  /* ── the training play-through ───────────────────────────────────── */
  function startTrain(): void {
    if (data.length < 2 || countClass(0) === 0 || countClass(1) === 0) {
      flashCoachSub(NEED_BOTH);
      return;
    }
    fit();
    trained = true;
    snapFired = false;

    if (REDUCED) {
      // Spec §4.8 — render the final boundary instantly: no bloom, no descent, no pulse.
      cur = endEpoch();
      curF = cur;
      fieldFade = 1;
      drawAll();
      onSnap();
      if (onRamp()) enableNext();
      return;
    }
    cur = 0; curF = 0; runT0 = 0; fieldFade = 0;
    playing = true;
    setTrainBtn();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function loop(t: number): void {
    if (!playing) return;
    const END = endEpoch();
    if (!runT0) runT0 = t;

    // Wall-clock exact: the epoch shown is a pure function of elapsed time, so a slow
    // frame drops an epoch rather than stretching the run. (The prototype accumulated
    // per-frame deltas and drifted ~32% long — spec §4.4's build note.)
    curF = onRamp()
      ? Math.min(END, ((t - runT0) / 1000) * plan.rampEps)
      : Math.min(END, curF + 1);

    const prev = cur;
    cur = Math.round(curF);
    if (cur !== prev && cur % 6 === 0) netSample++;
    fieldFade = Math.min(1, fieldFade + 0.1);
    if (!snapFired && cur >= plan.snapEpoch) onSnap();
    drawAll();

    if (cur >= END) {
      playing = false;
      setTrainBtn();
      // A set that settles past MAX_WIN clamps its window, so the snap can land outside
      // it — fire the payoff at window end rather than leave the beat hanging.
      if (!snapFired) onSnap();
      if (onRamp()) enableNext();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function onSnap(): void {
    snapFired = true;
    if (phase === 'beat2' || phase === 'beat3') setCoach(phase, 'payoff');
    if (!REDUCED) { snapPulse = 1; pulseLoop(); }
  }
  function pulseLoop(): void {
    if (snapPulse <= 0) return;
    snapPulse = Math.max(0, snapPulse - 0.08);
    drawFieldTo(fctx, FW, FH, fieldState());
    if (snapPulse > 0) requestAnimationFrame(pulseLoop);
  }
  function setTrainBtn(): void {
    trainBtn.textContent = playing ? '❚❚ Pause' : trained && cur >= endEpoch() ? '↺ Replay' : '▷ Train';
  }

  /* ── beat gating ─────────────────────────────────────────────────── */
  function checkBeat1(): void {
    if (phase !== 'beat1') return;
    if (countClass(0) >= NEED_A && countClass(1) >= NEED_B) {
      setCoach('beat1', 'payoff');
      enableNext();
    } else if (countClass(0) < NEED_A) {
      csub.innerHTML = nudgeA(countClass(0));
      brushSet(0);
    } else {
      csub.innerHTML = nudgeB(countClass(1));
    }
  }

  cnext.addEventListener('click', () => {
    disableNext();
    if (phase === 'beat1') {
      phase = 'beat2';
      setCoach('beat2', 'prompt');
      trainBtn.classList.add('pulse');
      trainBtn.focus();
    } else if (phase === 'beat2') {
      phase = 'beat3';
      setCoach('beat3', 'prompt');
      brushSet(0);
    } else if (phase === 'beat3') {
      releaseToThesis();
    }
  });

  /* ── the hand-off: thesis (once) → sandbox ───────────────────────── */
  function releaseToThesis(): void {
    phase = 'thesis';
    coach.classList.add('thesis-mode');
    if (!REDUCED) coach.classList.add('anim');
    coach.innerHTML =
      `<div class="lead"><p class="tline">${THESIS_HTML}</p></div>` +
      `<div class="cact"><button class="btn go playfree" type="button">Play freely →</button></div>`;
    const pf = coach.querySelector<HTMLButtonElement>('.playfree')!;
    pf.addEventListener('click', enterSandbox);
    pf.focus();
  }

  /** Spec §4.7 — the sandbox INHERITS their taught machine: their points, their boundary. */
  function enterSandbox(): void {
    phase = 'sandbox';
    coach.remove();
    badge.remove();                                   // the "on-ramp" badge is dropped, not reworded
    for (const d of data) delete d.intruder;          // the beat-3 ring was an annotation, not a property
    if (trained) { cur = EPOCHS; curF = EPOCHS; fieldFade = 1; }  // settle to the converged model
    // Spec §5 — the lr control is sandbox-only, so it is simply REVEALED at 1.5.
    // The user's trained machine is untouched; only their next Train is faster.
    lrv = LR_SANDBOX;
    lrInput.value = String(LR_SANDBOX);
    lrVal.textContent = LR_SANDBOX.toFixed(2);
    root.classList.add('sandbox');
    trainBtn.classList.remove('pulse');
    setTrainBtn();
    drawAll();
  }

  /** Skip → a pre-trained moons sandbox (returning visitors / no-mouse). */
  skipBtn.addEventListener('click', () => {
    playing = false;
    cancelAnimationFrame(raf);
    data = moons(SEED);
    lrv = LR_SANDBOX;
    fit();
    trained = true;
    fieldFade = 1;
    enterSandbox();
  });

  /* ── controls ────────────────────────────────────────────────────── */
  trainBtn.addEventListener('click', () => {
    if (playing) { playing = false; setTrainBtn(); cancelAnimationFrame(raf); return; }
    if (trained && cur >= endEpoch() && phase === 'sandbox') {   // Replay
      cur = 0; curF = 0; runT0 = 0; fieldFade = 1;
      playing = true;
      setTrainBtn();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      return;
    }
    trainBtn.classList.remove('pulse');
    startTrain();
  });

  q<HTMLButtonElement>('[data-act=step]').addEventListener('click', () => {
    if (!trained) return;
    playing = false; cancelAnimationFrame(raf);
    cur = Math.min(endEpoch(), cur + 1); curF = cur;
    netSample++; fieldFade = 1;
    setTrainBtn(); drawAll();
  });
  q<HTMLButtonElement>('[data-act=reset]').addEventListener('click', () => {
    if (!trained) return;
    playing = false; cancelAnimationFrame(raf);
    cur = 0; curF = 0;                                 // back to the seeded init, points kept
    setTrainBtn(); drawAll();
  });
  q<HTMLButtonElement>('[data-act=clear]').addEventListener('click', () => {
    playing = false; cancelAnimationFrame(raf);
    data = []; trained = false; hist = null; cur = 0; curF = 0; modelGen++;
    setTrainBtn(); drawAll();
  });

  lrInput.addEventListener('input', () => {
    lrv = parseFloat(lrInput.value);
    lrVal.textContent = lrv.toFixed(2);
    if (trained) {
      const keep = cur / EPOCHS;
      fit();
      cur = Math.round(keep * EPOCHS); curF = cur;
      drawAll();
    }
  });

  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      playing = false; cancelAnimationFrame(raf);
      data = PRESET_GEN[b.dataset.preset as PresetKey](SEED);
      fit();
      trained = true;
      cur = EPOCHS; curF = EPOCHS; fieldFade = 1;
      setTrainBtn(); drawAll();
    });
  });

  const brushBtns = [...root.querySelectorAll<HTMLButtonElement>('.brush')];
  function brushSet(b: Brush): void {
    brush = b;
    brushBtns.forEach((x) => x.classList.toggle('on', Number(x.dataset.brush) === b));
  }
  brushBtns.forEach((b) =>
    b.addEventListener('click', () => brushSet(Number(b.dataset.brush) as Brush)),
  );

  /* ── placing a point (shared by mouse + keyboard) ────────────────── */
  function addPoint(xv: number, yv: number): void {
    const intruder = phase === 'beat3' && brush === 0;   // the "lesson": +A into B land
    data.push(intruder ? { x: [xv, yv], y: brush, intruder } : { x: [xv, yv], y: brush });

    if (phase === 'beat1') { drawAll(); checkBeat1(); return; }
    if (phase === 'beat3') {
      // Spec §4.2 — the boundary must stay STALE here. The beat is: drop a contradicting
      // example, SEE it sitting in the wrong-coloured region, then press Train and watch
      // the boundary bend around it. Retraining on drop fires the payoff before its prompt.
      drawAll();
      return;
    }
    if (phase === 'sandbox' && trained) {
      fit();
      cur = EPOCHS; curF = EPOCHS; fieldFade = 1;
      setTrainBtn();
    }
    drawAll();
  }

  fieldC.addEventListener('click', (e) => {
    const r = fieldC.getBoundingClientRect();
    addPoint(vx((e.clientX - r.left) / r.width), vy((e.clientY - r.top) / r.height));
  });

  /* ── keyboard crosshair (the no-mouse path, spec §4.8) ───────────── */
  fieldwrap.addEventListener('focus', () => { cross.active = true; drawAll(); });
  fieldwrap.addEventListener('blur', () => { cross.active = false; drawAll(); });
  fieldwrap.addEventListener('keydown', (e) => {
    const step = 0.06;
    if (e.key === 'ArrowLeft') cross.x = clamp(cross.x - step, XR[0], XR[1]);
    else if (e.key === 'ArrowRight') cross.x = clamp(cross.x + step, XR[0], XR[1]);
    else if (e.key === 'ArrowUp') cross.y = clamp(cross.y + step, YR[0], YR[1]);
    else if (e.key === 'ArrowDown') cross.y = clamp(cross.y - step, YR[0], YR[1]);
    else if (e.key === 'Enter' || e.key === ' ') addPoint(cross.x, cross.y);
    else if (e.key === 'a' || e.key === 'A') brushSet(0);
    else if (e.key === 'b' || e.key === 'B') brushSet(1);
    else return;
    e.preventDefault();
    drawAll();
  });

  /* ── boot ────────────────────────────────────────────────────────── */
  setCoach('beat1', 'prompt');
  lrInput.value = String(LR_ONRAMP);
  lrVal.textContent = LR_ONRAMP.toFixed(2);
  requestAnimationFrame(() => { layout(); setTimeout(layout, 240); });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(layout, 120); });
  document.fonts?.ready.then(layout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { playing = false; setTrainBtn(); cancelAnimationFrame(raf); }
  });
}
