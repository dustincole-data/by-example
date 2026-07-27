# Restore pattern variety + explanation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring back non-linear pattern variety (3 selectable data shapes, not just today's one linear fruit field) and a persistent, non-gated explanation caption — reversing the parts of tickets 07/08's simplification that went further than Dustin asked for, while keeping the tap-then-label continuous-training interaction and the ticket-13 desktop composition untouched.

**Architecture:** A new pure-data module (`src/lib/presets.ts`) exposes 3 seed-point generators behind one `PRESETS` roster. `instrument.ts` gains one piece of state (`presetKey`) that `reseed()` reads instead of always using the fixed 6 seeds. A `<select>` in the existing bottom card lets the user swap patterns; a new static `<p class="explain">` sits above the existing ask/status row so the explanation survives past the first tap (today it doesn't — the status chip gets overwritten).

**Tech Stack:** Astro 5, TypeScript, vitest (unit tests only — this repo has no DOM/jsdom test setup; UI wiring is verified manually via the dev server + chrome-devtools, matching how tickets 11/12/13 verified their changes).

## Global Constraints

- Spec: `c:\Users\dusti\brain\.claude\plans\portfolio-mobile-ux\issues\14-by-example-restore-variety.md`
- Ship exactly 3 presets: `straight` (today's default 6-seed fruit field, unchanged), `crisscross` (ported `xor`), `surrounded` (ported `circles`). **`moons`/`curvy` is cut** — empirically confirmed during planning to be a capacity wall under this engine's weight decay (`WD=0.02`, `net.ts`): plateaus at 82–86% accuracy regardless of epoch count (swept 26→5000) or learning rate (1.5 and 3.0 both tested). Do not attempt to re-add it without changing `HID`/`WD`, which are locked by ticket 08 for reasons unrelated to this ticket (contrast, settle timing).
- No new dependencies. No DOM/jsdom test framework — don't add one.
- Copy is a single source of truth in `src/lib/copy.ts`, tested in `copy.test.ts` (existing repo convention — follow it for every new string).
- Keep: continuous auto-training, tap-then-label, no Train/Step/Pause/lr-slider/training-curve. This ticket does not touch that interaction model.
- Ticket 13's desktop grid (`.instrument` CSS grid at `min-width:1120px`) is not restructured. New elements are children of the existing `.card`, which is `display:flex; flex-direction:column` at every breakpoint — they flow into the existing box without new grid rows/columns.
- Exact numbers locked by empirical testing during planning (do not re-derive): `PRESET_SEED = 0x7eac`, shared fit budget `SEED_EPOCHS = 600` (bumped from 260 — verified 260 was already insufficient for `surrounded`, which reaches 94% at 260 vs. 100% at 400+). At these values: `crisscross` fits 32/32, `surrounded` fits 36/36, both with `net.SEED = 0x7eac` init.
- Copy strings below (`EXPLAIN`, `PRESET_PICKER_LABEL`, `PRESET_LABEL`) are draft wording per the spec ("left to the build") — ship them verbatim as written here; a later wording pass is expected and out of scope for this plan.
- Spec's two remaining "left to the build" questions, resolved here: **(1) preset choice across `reset`** — `reset` re-seeds whichever preset is currently selected, not forced back to `straight` (Task 3 changes nothing about the existing `overBtn` handler; it already calls the now-preset-aware `reseed()`). **(2) contrast pass on the new caption** — both `.explain` and `.presetlabel` use `--ink-muted` (5.94:1, per ticket 08's own fix), never `--ink-faint`; no new sampling needed.

---

### Task 1: Port the two non-linear presets + roster, with fit tests

**Files:**
- Create: `src/lib/presets.ts`
- Create: `src/lib/presets.test.ts`
- Modify: `src/lib/seeds.ts` (bump `SEED_EPOCHS`, update its doc comment)

**Interfaces:**
- Produces: `PresetKey = 'straight' | 'crisscross' | 'surrounded'`; `PRESETS: { key: PresetKey; gen: (seed: number) => Point[] }[]`; `PRESET_SEED: number` — all from `src/lib/presets.ts`, consumed by Task 3 (`instrument.ts`) and Task 4 (`Instrument.astro`, roster only — `Instrument.astro` needs `PRESETS.map(p => p.key)`, not `gen`).
- Consumes: `Point` from `./types`; `mulberry32`, `gauss` from `./prng`; `SEEDS`, `seedPoints` from `./seeds` (existing, unchanged signatures).

- [ ] **Step 1: Write the failing roster + balance test**

```typescript
// src/lib/presets.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PRESETS, PRESET_SEED } from './presets';
import { initNet, step, metrics, SEED, LR } from './net';
import { SEED_EPOCHS } from './seeds';
import { syncDomain } from './field';

beforeEach(() => { syncDomain(1, 1); });

describe('the preset roster', () => {
  it('ships straight, crisscross, surrounded — in that easy-to-hard order', () => {
    expect(PRESETS.map((p) => p.key)).toEqual(['straight', 'crisscross', 'surrounded']);
  });

  it('every non-default preset is balanced two-class data', () => {
    for (const { key, gen } of PRESETS) {
      if (key === 'straight') continue; // SEEDS' 3/3 split is already covered by seeds.test.ts
      const d = gen(PRESET_SEED);
      const a = d.filter((p) => p.y === 0).length;
      const b = d.filter((p) => p.y === 1).length;
      expect(a, key).toBeGreaterThan(0);
      expect(a, key).toBe(b);
    }
  });
});

describe('every preset fits cleanly at boot, at the shared SEED_EPOCHS budget', () => {
  for (const { key, gen } of PRESETS) {
    it(`${key} — 100% train accuracy after SEED_EPOCHS steps`, () => {
      const data = gen(PRESET_SEED);
      const w = initNet(SEED);
      for (let i = 0; i < SEED_EPOCHS; i++) step(w, data, LR);
      expect(metrics(w, data).correct).toBe(data.length);
    });
  }
});

describe('no capacity-wall pattern ships', () => {
  it('never re-adds moons/curvy — confirmed a capacity wall under this engine\u2019s decay', () => {
    const keys = PRESETS.map((p) => p.key).join(' ');
    expect(keys).not.toMatch(/moon|curvy/);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run src/lib/presets.test.ts`
Expected: FAIL — `Cannot find module './presets'` (the file doesn't exist yet).

- [ ] **Step 3: Bump the shared fit budget in `seeds.ts`**

In `src/lib/seeds.ts`, change:
```typescript
export const SEED_EPOCHS = 260;
```
to:
```typescript
/** Shared with presets.ts: the same silent-fit budget runs whichever pattern is
 *  active. 260 was enough for the original 6 seeds alone; `surrounded` (ticket 14)
 *  needs ~400-600 to reach 100% under this engine's weight decay — measured
 *  empirically, not derived. */
export const SEED_EPOCHS = 600;
```

- [ ] **Step 4: Write `presets.ts`**

```typescript
// src/lib/presets.ts
/**
 * Pattern presets (ticket 14) — three shapes the field can be seeded with, so the
 * toy can show the "a straight line can't do this" range that tickets 07/08 cut
 * along with the buttons Dustin actually complained about.
 *
 * Ported from commit 9fa04c7 (blobs/xor/circles/moons), renamed off ML jargon to
 * stay inside the fruit metaphor, and trimmed to three: `moons` hits a capacity
 * wall under THIS engine's weight decay (WD=0.02, added by ticket 08 for
 * continuous training — the old batch-trained engine didn't have it). Swept
 * 26-5000 epochs and lr 1.5/3.0: plateaus at 82-86% no matter what, the same kind
 * of wall that already got `spiral` cut. Do not re-add without changing HID/WD,
 * which are locked for reasons unrelated to this ticket.
 */
import { mulberry32, gauss } from './prng';
import { SEEDS, seedPoints } from './seeds';
import type { Point } from './types';

type RawSeed = readonly [number, number, 0 | 1];

/** 2 · the canonical "a line cannot do this" — the hidden layer visibly earns its keep. */
function xorSeeds(seed: number): RawSeed[] {
  const rnd = mulberry32(seed);
  const pts: RawSeed[] = [];
  const q: RawSeed[] = [
    [-0.5, 0.5, 0],
    [0.5, -0.5, 0],
    [0.5, 0.5, 1],
    [-0.5, -0.5, 1],
  ];
  for (const [cx, cy, y] of q) {
    for (let i = 0; i < 8; i++) pts.push([cx + gauss(rnd) * 0.14, cy + gauss(rnd) * 0.14, y]);
  }
  return pts;
}

/** 3 · one class enclosed by the other — a CLOSED boundary. */
function circleSeeds(seed: number): RawSeed[] {
  const rnd = mulberry32(seed);
  const pts: RawSeed[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (2 * Math.PI * i) / 18;
    pts.push([Math.cos(t) * 0.28 + gauss(rnd) * 0.06, Math.sin(t) * 0.28 + gauss(rnd) * 0.06, 0]);
    pts.push([Math.cos(t) * 0.8 + gauss(rnd) * 0.06, Math.sin(t) * 0.8 + gauss(rnd) * 0.06, 1]);
  }
  return pts;
}

export type PresetKey = 'straight' | 'crisscross' | 'surrounded';

/** Fixed seed for every non-default generator's own randomness — reproducible,
 *  like `SEED` in net.ts. Verified during planning: crisscross fits 32/32,
 *  surrounded fits 36/36, at SEED_EPOCHS=600 with net.SEED=0x7eac init. */
export const PRESET_SEED = 0x7eac;

/** Ship order = the difficulty ladder: a straight line, then two shapes a
 *  straight line provably cannot separate. Each `gen` returns points already
 *  scaled into the live domain (via `seedPoints`, same as the default 6). */
export const PRESETS: { key: PresetKey; gen: (seed: number) => Point[] }[] = [
  { key: 'straight', gen: () => seedPoints(SEEDS) },
  { key: 'crisscross', gen: (s) => seedPoints(xorSeeds(s)) },
  { key: 'surrounded', gen: (s) => seedPoints(circleSeeds(s)) },
];
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run src/lib/presets.test.ts src/lib/seeds.test.ts`
Expected: PASS — all `presets.test.ts` cases green, and `seeds.test.ts` still green (the bump to 600 only makes an already-perfect fit run longer; `seeds.test.ts`'s `settledSeeds()` asserts `correct === 6`, which held at 260 and still holds at 600).

- [ ] **Step 6: Commit**

```bash
git add src/lib/presets.ts src/lib/presets.test.ts src/lib/seeds.ts
git commit -m "$(cat <<'EOF'
Restore two non-linear presets (ticket 14)

Ports xor/circles from 9fa04c7 as crisscross/surrounded, renamed off ML jargon.
moons/curvy stays cut: empirically a capacity wall under this engine's weight
decay (82-86% ceiling, swept 26-5000 epochs, lr 1.5 and 3.0), same reason
spiral was already cut. Bumps the shared silent-fit budget 260->600 so
surrounded reaches 100% (was 94% at 260).
EOF
)"
```

---

### Task 2: Copy — preset labels + the persistent explanation caption

**Files:**
- Modify: `src/lib/copy.ts`
- Modify: `src/lib/copy.test.ts`

**Interfaces:**
- Consumes: `PresetKey` from `../lib/presets` (Task 1).
- Produces: `PRESET_LABEL: Record<PresetKey, string>`, `PRESET_PICKER_LABEL: string`, `EXPLAIN: string` — consumed by Task 3 (`instrument.ts` reads `EXPLAIN`) and Task 4 (`Instrument.astro` reads `PRESET_LABEL`, `PRESET_PICKER_LABEL`).

- [ ] **Step 1: Write the failing copy tests**

Add to `src/lib/copy.test.ts` (new `describe` block; also add the three new names to the existing `import` line and to `allCopy()`'s array so the anti-cliché/no-old-title guardrails cover them too):

```typescript
// add to the import at the top of copy.test.ts:
import {
  TITLE, TAGLINE, META_DESCRIPTION, AXIS_X, AXIS_Y, LABEL_RIPE, LABEL_NOT_RIPE,
  NET_CAPTION, RESET, UNDO, REMOVE, RM_NOTE, FIELD_ARIA, ASK, CHIP, fieldAlt,
  BRAND, BRAND_HREF, forPointer, probeText, EXPLAIN, PRESET_LABEL, PRESET_PICKER_LABEL,
} from './copy';

// extend allCopy()'s array literal with:
//   EXPLAIN, PRESET_PICKER_LABEL, ...Object.values(PRESET_LABEL),

describe('the preset picker (ticket 14)', () => {
  it('labels all three presets, plainly, no ML jargon on screen', () => {
    expect(PRESET_LABEL.straight).toBe('straight');
    expect(PRESET_LABEL.crisscross).toBe('crisscross');
    expect(PRESET_LABEL.surrounded).toBe('surrounded');
    for (const s of Object.values(PRESET_LABEL)) {
      expect(s.toLowerCase()).not.toMatch(/xor|blob|moon|mlp/);
    }
  });

  it('the picker has a plain-English label', () => {
    expect(PRESET_PICKER_LABEL).toBe('pattern');
  });
});

describe('the persistent explanation (ticket 14)', () => {
  it('survives past the first tap — it is not the status chip', () => {
    expect(EXPLAIN).toBe('Each tap teaches it your rule — watch the line move.');
  });

  it('says click to a mouse, same as every other tap string', () => {
    expect(forPointer(EXPLAIN, true)).toBe('Each click teaches it your rule — watch the line move.');
    expect(forPointer(EXPLAIN, false)).toBe(EXPLAIN);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run src/lib/copy.test.ts`
Expected: FAIL — `EXPLAIN`/`PRESET_LABEL`/`PRESET_PICKER_LABEL` don't exist yet.

- [ ] **Step 3: Add the strings to `copy.ts`**

Add near the bottom of `src/lib/copy.ts` (after `probeText`, before `FIELD_ARIA` — keeps the file's existing top-to-bottom order of "field chrome, then desktop layer, then accessibility"):

```typescript
import type { PresetKey } from './presets';

/**
 * Ticket 14. The screen's one persistent line — separate from `.chip`, which
 * gets overwritten by live status the moment you tap. This is the thing Dustin
 * said was missing entirely: it never changes and never gates behind a step.
 */
export const EXPLAIN = 'Each tap teaches it your rule — watch the line move.';

/** The preset picker (ticket 14). Plain words, not the old ML names (xor/blobs/
 *  moons) — the whole point of ticket 07 was to keep jargon off the screen. */
export const PRESET_LABEL: Record<PresetKey, string> = {
  straight: 'straight',
  crisscross: 'crisscross',
  surrounded: 'surrounded',
};
export const PRESET_PICKER_LABEL = 'pattern';
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run src/lib/copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy.ts src/lib/copy.test.ts
git commit -m "$(cat <<'EOF'
Add preset-picker and persistent-explanation copy (ticket 14)

EXPLAIN lives outside .chip so it survives the first tap instead of being
overwritten by live status. PRESET_LABEL keeps the picker in plain words,
never the old xor/blobs/moons names.
EOF
)"
```

---

### Task 3: Wire the instrument — preset state, dropdown handling, persistent caption

**Files:**
- Modify: `src/scripts/instrument.ts`

**Interfaces:**
- Consumes: `PRESETS`, `PRESET_SEED`, `PresetKey` from `../lib/presets` (Task 1); `EXPLAIN` from `../lib/copy` (Task 2); new DOM hooks `.explain` and `.preset` that Task 4 adds to the markup.
- Produces: no new exports — this file is the mount function only, unchanged signature (`mountInstrument(root, reduced?)`).

There is no automated test for this file (the repo has no DOM/jsdom setup — every existing test here is a pure-function unit test in `src/lib/`). Verify this task by running the dev server and clicking through it (folded into Task 6, after markup + styles exist so it's actually visible).

- [ ] **Step 1: Add the new imports**

In `src/scripts/instrument.ts`, change the top-of-file imports:

```typescript
import { initNet, step, metrics, cloneNet, SEED, LR } from '../lib/net';
```
stays as-is. Add two new import lines right after the existing `copy` import (currently line 20):
```typescript
import { ASK, CHIP, RESET, UNDO, RM_NOTE, fieldAlt, probeText, forPointer, EXPLAIN } from '../lib/copy';
import { PRESETS, PRESET_SEED, type PresetKey } from '../lib/presets';
```
(Note: this also adds `EXPLAIN` to the existing `copy` import list.)

- [ ] **Step 2: Add the two new DOM refs**

Find the block of `q<...>` lookups (currently lines 41-50) and add two lines to it:

```typescript
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
```

- [ ] **Step 3: Add `presetKey` state**

In the `/* ── state ── */` block (currently lines 60-83), add one line near the top, right after `let net: Net = initNet(SEED);`:

```typescript
  let net: Net = initNet(SEED);
  let presetKey: PresetKey = 'straight';
  let data: Point[] = [];
```

- [ ] **Step 4: Render the persistent caption in `syncChrome()`**

In `syncChrome()` (currently lines 102-115), add one line — it can go anywhere in the function body since it doesn't depend on other state; put it first for readability:

```typescript
  function syncChrome(): void {
    explainEl.textContent = say(EXPLAIN);
    askEl.textContent = say(pending ? ASK.armed : editing >= 0 ? ASK.editing : ASK.rest);
    // ...rest unchanged
```

- [ ] **Step 5: Make `reseed()` read the selected preset**

Change `reseed()` (currently lines 159-172) from:

```typescript
  function reseed(): void {
    net = initNet(SEED);
    data = seedPoints(SEEDS);
    for (let i = 0; i < SEED_EPOCHS; i++) step(net, data, LR);
```

to:

```typescript
  function reseed(): void {
    net = initNet(SEED);
    const preset = PRESETS.find((p) => p.key === presetKey)!;
    data = preset.gen(PRESET_SEED);
    for (let i = 0; i < SEED_EPOCHS; i++) step(net, data, LR);
```

(The rest of `reseed()` — `touched = false; pending = null; ...` through `drawFieldTo.invalidate();` — is unchanged.)

Since `SEEDS`/`seedPoints` are no longer referenced directly in this file (the `straight` preset's `gen` now owns that call), remove them from the `../lib/seeds` import — change:
```typescript
import { SEEDS, SEED_EPOCHS, seedPoints } from '../lib/seeds';
```
to:
```typescript
import { SEED_EPOCHS } from '../lib/seeds';
```

- [ ] **Step 6: Wire the `<select>`'s change handler**

Add this near the other control event listeners — right after the `rmvBtn.addEventListener('click', ...)` block (currently ending at line 362) and before the `overBtn` handler:

```typescript
  presetEl.addEventListener('change', () => {
    presetKey = presetEl.value as PresetKey;
    reseed();
    syncChrome();
  });
```

- [ ] **Step 7: Verify it compiles**

Run: `npx astro check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/instrument.ts
git commit -m "$(cat <<'EOF'
Wire preset switching + persistent caption into the instrument (ticket 14)

reseed() now reads whichever preset is selected instead of always the fixed
6 seeds. The explain caption renders once per syncChrome() call, same as the
rest of the chrome, and goes through say() so it gesture-swaps tap/click like
everything else.
EOF
)"
```

---

### Task 4: Markup — the explanation line and the preset picker

**Files:**
- Modify: `src/components/Instrument.astro`

**Interfaces:**
- Consumes: `PRESET_LABEL`, `PRESET_PICKER_LABEL` from `../lib/copy` (Task 2); `PRESETS` from `../lib/presets` (Task 1). `.explain` and `.preset` are the DOM hooks Task 3 already queries for.

- [ ] **Step 1: Add the imports**

Change the frontmatter imports at the top of `src/components/Instrument.astro`:

```astro
import {
  AXIS_X, AXIS_Y, LABEL_RIPE, LABEL_NOT_RIPE, NET_CAPTION, RESET, REMOVE, FIELD_ARIA,
  TITLE, BRAND, BRAND_HREF, PRESET_LABEL, PRESET_PICKER_LABEL,
} from '../lib/copy';
import { PRESETS } from '../lib/presets';
```

- [ ] **Step 2: Add the explanation line and the preset row inside `.card`**

Currently:
```astro
  <div class="card">
    <div class="askrow">
      <span class="ask" role="status"></span>
      <button class="rmv" type="button" hidden>{REMOVE}</button>
    </div>
    <div class="pair">
      <button class="lab rest" type="button" data-c="a" data-k="0"><i class="dot"></i>{LABEL_RIPE}</button>
      <button class="lab rest" type="button" data-c="b" data-k="1"><i class="dot"></i>{LABEL_NOT_RIPE}</button>
    </div>
    <div class="strip">
```

Change to (adds `.explain` before `.askrow`, adds `.presetrow` after `.pair`):
```astro
  <div class="card">
    <p class="explain"></p>
    <div class="askrow">
      <span class="ask" role="status"></span>
      <button class="rmv" type="button" hidden>{REMOVE}</button>
    </div>
    <div class="pair">
      <button class="lab rest" type="button" data-c="a" data-k="0"><i class="dot"></i>{LABEL_RIPE}</button>
      <button class="lab rest" type="button" data-c="b" data-k="1"><i class="dot"></i>{LABEL_NOT_RIPE}</button>
    </div>
    <div class="presetrow">
      <label class="presetlabel" for="preset">{PRESET_PICKER_LABEL}</label>
      <select class="preset" id="preset">
        {PRESETS.map((p) => <option value={p.key}>{PRESET_LABEL[p.key]}</option>)}
      </select>
    </div>
    <div class="strip">
```

(`.explain` is left empty, same pattern as `.chip`/`.ask`/`.fieldalt` — `instrument.ts`'s `syncChrome()` fills it on mount. The `<select>`'s options ARE static server-rendered text, same pattern as the `{LABEL_RIPE}`/`{LABEL_NOT_RIPE}` button labels, since `PRESET_LABEL` never changes at runtime.)

- [ ] **Step 3: Verify it compiles**

Run: `npx astro check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/Instrument.astro
git commit -m "$(cat <<'EOF'
Add the explanation line and preset picker markup (ticket 14)

.explain is empty at build time, filled by instrument.ts on mount — same
pattern as .chip/.ask. The <select>'s options are static (PRESET_LABEL never
changes at runtime), so they're server-rendered like the ripe/not-ripe labels.
EOF
)"
```

---

### Task 5: Styles

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: existing tokens `--ink-muted`, `--chrome-line`, `--mono`, `--r`, `--ease`, `--focus` (all already defined and used elsewhere in this file — no new tokens needed).

- [ ] **Step 1: Style `.explain` and `.presetrow`**

Add right after the existing `.askrow`/`.ask`/`.rmv` block and before `.pair` (so the new rules sit next to the card-content rules they extend — currently around line 151, just before `.pair { display: grid; ... }`):

```css
/* Ticket 14: the persistent explanation. Static — it never changes and never
   gates behind a step, unlike the old 3-beat tour. Sits above the ask row so
   it survives past the first tap instead of being overwritten like .chip is. */
.explain { margin: 0 0 10px; font-size: 13px; line-height: 1.4; color: var(--ink-muted); }
```

Add right after the `.pair`/`.lab` block and before `.strip` (currently around line 178, just before `.strip { display: flex; ... }`):

```css
/* Ticket 14: the pattern picker. A native <select>, deliberately not a 4th
   loose button — Dustin's original complaint was too many same-weight buttons,
   and a labelled dropdown reads as a different kind of control from the two
   ripe/not-ripe action buttons above it. */
.presetrow { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.presetlabel {
  flex: none;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
}
.preset {
  flex: 1;
  height: 38px;
  border-radius: var(--r);
  border: 1.5px solid var(--chrome-line);
  background: #171b24;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  padding: 0 10px;
}
```

- [ ] **Step 2: Manually sanity-check the desktop rail**

No new CSS rule is expected to be needed here — `.card` is `display:flex; flex-direction:column` at every breakpoint (confirmed in the existing `@media (min-width: 1120px)` block), so `.explain` and `.presetrow` flow into the rail the same way `.askrow`/`.pair`/`.strip` already do. This step is a read-through, not a code change: re-read the `@media (min-width: 1120px)` block in `global.css` and confirm nothing there selects `.card`'s children by position (e.g. `:nth-child`) in a way the two new children would break. If it does, add a targeted override here; if not, no action.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
Style the explanation line and preset picker (ticket 14)

Both are children of .card, which is flex-column at every breakpoint, so they
flow into the existing mobile card and desktop rail without touching ticket
13's grid.
EOF
)"
```

---

### Task 6: Full verification pass

**Files:** none (verification only; fix-and-recommit only if something fails)

- [ ] **Step 1: Run the full unit test suite**

Run: `npx vitest run`
Expected: all suites green, including the new `presets.test.ts` and the extended `copy.test.ts`.

- [ ] **Step 2: Type/template check**

Run: `npx astro check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev` (background — leave running for the next steps)

- [ ] **Step 4: Verify at 390×844 (mobile)**

Using chrome-devtools (or equivalent), navigate to the dev server, resize to 390×844, and check:
- The explain caption ("Each tap teaches it your rule — watch the line move.") is visible above the ask row on first load, and **still visible** after placing a tap-and-label (this is the actual bug report — confirm it does NOT disappear like the old chip-only text did).
- The pattern picker shows `straight` selected, with `crisscross` and `surrounded` as the other two options — no `xor`/`blobs`/`moons` text anywhere.
- Selecting `crisscross` re-seeds the field into a visibly checkerboard-ish 4-cluster arrangement with a boundary that isn't a single straight line; selecting `surrounded` re-seeds into a ring arrangement with a closed boundary loop.
- No horizontal scroll; the field is still a usable size (some shrink vs. before is expected and accepted — see plan's Global Constraints).

- [ ] **Step 5: Verify at 1440×900 (desktop)**

Resize to 1440×900 and check:
- The explain line and preset row appear in the rail, below the ripe/not-ripe buttons, above the net diagram/reset strip.
- All three presets are selectable and each produces a settled (non-degenerate) boundary.
- Ticket 13's layout is otherwise unchanged — field still square, still sized off viewport height, brand link still present.

- [ ] **Step 6: If anything fails, fix it and commit the fix**

```bash
git add -A
git commit -m "Fix: <what was actually broken> (ticket 14 verification pass)"
```

- [ ] **Step 7: Report back**

Summarize what was verified (with the two screenshot paths if captured) — do not push. Pushing to `byexample.dustincoledata.com` is a separate, explicit step Dustin confirms, same as every prior ticket in this repo.
