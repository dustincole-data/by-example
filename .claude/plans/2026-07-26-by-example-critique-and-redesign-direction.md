# By Example — critique + redesign direction

**Date:** 2026-07-26 · **Status:** direction doc, awaiting Dustin's review. **No implementation.**
**Subject:** the live artefact at byexample.dustincoledata.com after ticket 14.

---

## 0. How this was produced

Three independent adversarial passes, all hostile-outsider framing, no rubber-stamping.

| Lens | Who | Basis |
|---|---|---|
| 1 · Mobile UX | `intent:vigil` subagent | 10 phone captures + full source read |
| 2 · Desktop UX + visual craft vs the design canon | `intent:vigil` subagent | 4 desktop/tablet captures + full source read |
| 3 · AI/ML pedagogy + mathematical honesty | done directly (no skill covers it) | live instrumentation + source + arithmetic |

The live site was driven in a real Chrome at 390×844, 844×390, 834×1112, 1280×800 and
1440×900: taps dispatched as real pointer events, canvases sampled pixel-by-pixel, DOM
geometry measured, the hover probe read at seven positions, the empty state reached by
hand. 14 captures in `…scratchpad\shots\` (index in §8). The two subagents could not drive a
browser; they worked from those captures plus the source, and every dynamic claim of theirs
that this doc repeats was re-verified against code or the live page. Where a reviewer was
wrong, it is not in here (one reported layout artefact was a Chrome compositor ghost and was
dropped).

Independent convergence is worth noting: all three lenses arrived at the same root cause from
different directions.

---

## 1. Verdict

Dustin's read is correct, and the reason is structural rather than cosmetic. The engine is
genuinely good — a real 2→8→1 MLP, real backprop, a real marching-squares p=0.5 contour, real
metrics, zero dependencies, no faking anywhere. Everything above the engine either deletes the
information that would teach something or asserts things the picture does not show.

**By Example opens on the answer.** 600 gradient-descent epochs run silently before the first
paint and again on every reset and every preset change; a visible settle is 200. So roughly
three quarters of all the learning this net ever does happens before anyone can look, and the
first frame a visitor sees is a converged, correct boundary. There is no "before", so there is
no difference, and *learning is a difference*. Everything else follows: the confidence field is
clipped until 88% of it is a pixel-identical plateau, so two examples look exactly as certain as
thirty-six; each new tap is arithmetically diluted to 1/(n+1) of a full-batch gradient and
further suppressed by very heavy L2, so agency is capped by design and is *worst* on the two
most interesting presets; the only narrator is a 14px pill that sits on the data 658px from the
buttons, changes four times in three seconds, expires, and can claim "moved the line" when 16 of
4096 cells flipped. The result teaches three wrong lessons — a classifier is certain everywhere,
a neural net "can't fit" simple data, and teaching a machine means it obeys you — and never
teaches the one it promises, which is how learning happens.

As a piece of craft it fails all three references in the locked canon, structurally. **Stefaner
(the frame):** the 1440×900 landing state contains three digits — "2 in → 8 → 1" — and all three
describe the app's own architecture, none describe the data; `metrics()` computes loss and
accuracy every settle and throws both away; there are no ticks, no scale, no legend (cut on the
record in a CSS comment), no metadata. **Bremer (the hero mark):** the hero is two flat fills and
a hairline — 0.34% of an 810×810 graphic carries information, and the locked CVD-validated
palette's three upper stops are unreachable code. **Lupi (hand-feel):** a native `<select>`, two
underlined text links as the entire secondary control language, and nothing authored anywhere.

And the tell that decides it: the two most explanatory devices in the whole build — a cursor
crosshair and a dashed before/after ghost boundary — both exist, both work, and both are reachable
only via accessibility paths (keyboard focus; `prefers-reduced-motion`). The a11y branches got the
instrument. The default visitor got the wallpaper.

Health scores from the two UX lenses, for calibration: mobile **34/100**, desktop craft/canon
**2/10**. No dark patterns anywhere; no console errors at any size. The failure is emptiness, not
malpractice.

---

## 2. The root cause, stated once

> The app was built so that nothing can be *wrong*, and therefore nothing can be *learned*, and
> therefore there is nothing to *do*.

Three locks enforce it, and each was taken for a defensible-sounding local reason:

| Lock | Where | Bought | Cost |
|---|---|---|---|
| `SEED_EPOCHS = 600` silent pre-fit | `seeds.ts:39`, `instrument.ts:171` | a landing frame that "reads" immediately | the entire before→after arc |
| `FIELD_MAX = 0.4` + `bloomAlpha 0.08` | `field.ts:80`, `palette.ts:LOOK` | 3:1 mark contrast on the orange class | confidence, and 2/3 of the palette |
| `WD = 0.02`, `HID = 8` | `net.ts:13,26` | a boundary that keeps visibly moving under continuous training | capacity — and `moons`/`spiral` had to be cut |

Each trade protected the *picture* at the expense of the *subject*. Ticket 07/08's
simplification then removed the last things that made the subject visible (Train/Step/pause, the
lr slider, the training curve, the accuracy/loss/epoch readout, the 3-beat on-ramp) — in response
to a complaint about *too many same-weight buttons*, which was a **control-language** problem
answered by deleting **content**. Ticket 14 restored two of the missing pieces and left the
structure untouched.

---

## 3. Prioritised critique

### P0 — the piece cannot work until these change

**P0-1 · The subject is performed before the visitor arrives.**
`SEED_EPOCHS = 600` runs synchronously inside `reseed()` (`seeds.ts:39`, `instrument.ts:167-181`),
which is called at boot (`:414`), on every preset change (`:382`) and on every `reset` (`:402`).
A visible settle is `SETTLE_EPOCHS = 200` (`pacing.ts:23-25`), applied at 1/(n+1) weight. So ≥75%
of all training is invisible — while `pacing.ts:4-6` states in writing that the settle is "the
ONLY evidence the machine learned anything." Worse, an untrained net **has** a real boundary and
the renderer deliberately refuses to draw it: the field paints only `if (trained)`
(`render-field.ts:86`) and the contour only `if (trained && segs)` (`:155`). The most valuable
frame in the experience — a meaningless line through nowhere — is unreachable by construction.
An empty state *is* technically reachable (12 taps of one-at-a-time removals, verified →
`m11-empty-state.png`) and is the calmest, best-looking screen in the app.
Evidence: `m01`, `m05`, `m11`, `d01`.

**P0-2 · The "confidence field" shows `sign(z)`, not confidence.**
`FIELD_MAX = 0.4` (`field.ts:80,85`) makes every point with p ≥ 0.7 or p ≤ 0.3 paint
*identically*. Measured on the live landing state, mid-height scanline of the real canvas: RGB is
pixel-identical `(131,73,51)` from x=3%→44% and identical `(36,94,80)` from x=64%→95%; **88.4% of
sampled field pixels are on a saturated plateau** and only ~18% of the width carries any gradient.
The clip lands *before* the gamma, so the displayed maximum is `0.4^1.22 ≈ 0.327` on a four-stop
ramp — **three of four stops and two of three segments in `palette.ts:18-31` are unreachable
code.** Lens 2 independently re-derived `lerpStops(RAMP_B, 0.327) = (119,61,39)`, ×~1.1 bloom
composite = `(131,73,51)`: exactly the measured plateau. The locked "deep, saturated,
CVD-validated poles" never render at any input.
Consequence, and the single cleanest statement of the honesty failure: **two examples and
thirty-six examples look equally certain** (`m12-from-scratch-two-points.png` vs
`m06-surrounded-needpoint.png`). Evidence quantity is nowhere in the encoding — no support, no
distance-to-data, no widening band where the model is extrapolating. The most important true fact
about a classifier, *that it is most confidently wrong where it has never looked*, is not merely
absent — the picture contradicts it.
Self-contradiction worth naming: `net.ts:19-26` spends a hyperparameter specifically to prevent
"the field flatten[ing] to two flat poles… the boundary stops visibly moving" — the exact failure
the renderer ships by default.

**P0-3 · The visitor's agency is capped by arithmetic, worst on the best presets.**
`step()` averages the gradient over the batch (`net.ts:105-113`), so a new example carries
**1/(n+1)** of the update; and `WD = 0.02` at `LR = 1.5` gives a per-epoch shrink of `k = 0.97`,
i.e. `0.97²⁰⁰ ≈ 0.0022` across one settle — the weights are pulled three orders of magnitude
toward zero per settle and held out only by the data term. The model lives at a heavily
regularised equilibrium.

| preset | seed n | first tap's share | fifth tap's share |
|---|---|---|---|
| straight | 6 | 14% | 9% |
| crisscross | 32 | 3.0% | 2.7% |
| surrounded | 36 | 2.7% | 2.4% |

`presets.ts:55-57` calls this ship order "the difficulty ladder." It is also, exactly, an
**unresponsiveness ladder**: the shapes worth looking at are the ones your finger cannot move.
Verified live — three contradicting labels dropped inside the `surrounded` blob left the boundary
visibly unchanged while the chip reported "can't fit 2 of your 37", directly under the app's one
permanent sentence, "Each tap teaches it your rule — watch the line move" (`copy.ts:102`). The
promise and its refutation are on screen simultaneously. Evidence: `m07`, `m03`, `m04`.

**P0-4 · The phone has no continuous control of anything, and the desktop's one extra verb draws nothing.**
The complete input vocabulary is: tap canvas, tap button, tap text link, native `<select>`. No
drag, scrub, pinch, long-press, swipe, or haptic. The one drag that exists requires an already-pending
mark, is unhinted, and releasing near its origin **deletes** instead of moving
(`instrument.ts:311-313`) — while that mark is drawn with two concentric pulsing rings at PR+9 and
PR+16 (`render-field.ts:236-249`), the universal grammar of "tap here" (`m02`).
On desktop, `probe` is set on `pointermove` (`instrument.ts:294-295`) but is **never passed into
`FieldState`** (`:197-206`; verified — `probe` appears nowhere in `render-field.ts` or `types.ts`),
so hovering the field paints **no marker at all**; the full crosshair renderer at
`render-field.ts:251-268` is gated on keyboard focus. The answer is a 12px `aria-hidden` mono
string in the rail corner ~800px from the cursor with no locatable referent (`d02`).
Same pattern: the dashed before/after ghost boundary is assigned only inside the `if (reduced)`
branch (`instrument.ts:138`, verified) — the clearest "did it learn?" device in the build ships
only to reduced-motion users.
Net effect: the phone loses the probe, the labelled net diagram, the title and the outbound link
by media query, and gains nothing. `render-net.ts:11-12` states the intent plainly — the phone
returns "the EXACT previous geometry"; the desktop size "is the only thing that moves." That is a
definition of derivative.

**P0-5 · Rotating the phone after one tap orphans the examples. (reproduced live)**
`syncDomain()` re-derives `YR` from the box (`field.ts:31-36`); the re-place is guarded on
`!touched` (`instrument.ts:226-233`); `seedPoints` bakes the domain scale `k = YR[1]/1.15` into the
stored coordinates (`seeds.ts:44-47`). Portrait 390×584 → `YR ±1.72`, `k ≈ 1.497`, seeds reach
|y| ≈ 1.08. Landscape 560×129 → `YR ±0.265`. Everything past ±0.265 renders off-field while still
training. **Verified:** one labelled example, then rotate → the status line reads **"7 peaches ·
4 ripe"** with exactly **one** mark on the field (`m13-rotate-after-touch.png`). The `!touched`
guard is right; the missing third option is *rescale*, not *regenerate*.

**P0-6 · An "instrument" with no quantities.**
Landing frame at 1440×900: three digits, all architectural. `metrics()` returns loss and `correct`
(`net.ts:70-80`); `statusText()` uses only `correct`, only transiently, only when the chip has
nothing better to say (`instrument.ts:97-107`). Epochs: never shown. Loss: never shown. Confidence:
only in a 12px `aria-hidden` string on desktop. No ticks on either axis (`global.css:308-316`); an
8×8 grid of unlabelled 101px cells at 5% alpha (`render-field.ts:129-139`); **no legend, cut on the
record** (`global.css:355-356`, arguing the two label buttons *are* the legend — they are two pills
in a card 700px from the field they supposedly key). Mono type plus graph paper plus axis words with
zero numbers is a signifier of measurement with no measurement behind it.

### P1 — quality and comprehension failures

1. **The most dramatic state in the app is unnarrated, and its string is unreachable.** Four
   contradicting labels from landing collapse the model: the whole field goes one colour and the
   p=0.5 contour **vanishes**, with three of the visitor's own ripe marks on not-ripe ground; the
   only narration is "can't fit 3 of your 10". `CHIP.noneRipe` — "it thinks nothing is ripe"
   (`copy.ts:68`) — is gated on `data.every(d => d.y === data[0].y)` (`instrument.ts:103`), which is
   impossible whenever both classes are present, i.e. every collapse. The one sentence worth reading
   is structurally unsayable. Reached in **4 taps**. (`m04`)
2. **"% sure" is a raw sigmoid presented as calibrated probability.** `copy.ts:94`. Sampled live on
   the 6-example landing model: `(0.95,0.05) → "ripe · 100% sure"`, `(0.05,0.95) → "not ripe · 100%
   sure"`, `(0.5,0.5) → "not ripe · 57% sure"`. Six training points, and it claims 100% certainty
   about a corner it has never seen — while the field paints 57% and 100% **identically** (P0-2). The
   app's number and the app's picture disagree about the same model.
3. **Two graphics, one palette, two unrelated encodings.** `render-net.ts:51` paints `w ≥ 0` as
   `rgb(255,138,61)` and `w < 0` as `rgb(47,180,136)` — the exact hues `palette.ts` assigns to
   not-ripe / ripe on the field 300px away. A visitor who *does* try to connect the two graphics is
   actively misled into reading orange strands as "not-ripe pathways".
4. **The narrator is unusable.** Label-button centre ≈ (129,726); chip centre ≈ (150,68) — **658px
   apart**, opposite ends of the phone. It runs thesis → "learning…" → "moved the line" (1.7s) →
   "can't fit N of your M" in ~3s and expires with no history. `MOVED_FRAC = 0.004` means "moved the
   line" fires when **16 of 4096** class-map cells flip — verified firing three times during the
   `m07` sequence while the boundary did not visibly move, then contradicting itself. And it sits
   *on top of* the data (`global.css:96-114`); the fix there was `pointer-events:none` for
   tap-stealing, the occlusion was never addressed.
5. **The net diagram is decoration that costs more than it earns.** 74×30 CSS on phone with node
   radius ≈2.73 at 2.79px spacing — the 8 hidden nodes **physically merge into one vertical pill**
   (`m08-netzoom.png`, an 8× upscale of the real canvas). `render-net.ts:20` sets
   `LABEL_AT_PX = 200`, so the phone canvas is below the threshold the code itself defines as
   unreadable, and it is `aria-hidden`. On desktop it becomes **234px of a 682px rail interior —
   34%, the single largest element, and the least informative.** With the 205px `margin-top:auto`
   gap, **64% of the desktop rail is a decorative canvas plus a void.** It also redraws every frame
   (24 strokes + 11 shadow-blurred fills) against a settle throttled to a 9ms rebuild budget
   (`render-field.ts:25,96`).
6. **The card is furniture.** 390×260 = **31% of the phone**, pixel-identical across `m01/m03/m04/
   m05/m07`; total dynamic range is one 26px line ≈ 3% of the screen. ~137 of its 260px is spent on
   things a first-timer uses zero or once.
7. **Protection is inverted against frequency.** No undo for a committed label — repairing one costs
   locate-13px-mark → tap within 22px → hit a 14px underline (`m10`). `reset`, which wipes the
   session in one unconfirmed tap, **does** have undo, is the **smallest target on screen (35×36)**,
   and sits in the right-thumb rest corner. Its undo is announced by a 14px word change in the
   least-watched pixel on the screen.
8. **An invisible mode mask.** Every committed mark carries a silent `HIT_PX = 22` capture radius
   (`instrument.ts:30,316-318`) — on `surrounded`, ~54,700 px² gross against a 227,760 px² field,
   roughly a fifth of the surface — that flips the field's meaning from *add* to *edit* with no drawn
   boundary, signalled only by two words 584px below the finger.
9. **Responsive behaviour is unfinished.** No landscape rule exists anywhere in `global.css`:
   844×390 gives a 560×129 field — 33% data / 67% chrome — at aspect 4.34, with the x-axis label
   floating over the data and the chip covering ~238×27 of it, while the project's own comment says
   1.25 "already reads as a shallow slope" (`global.css:270-276`). The 900–1119.98px band caps the
   column at **440px — narrower than the 560px an 834px iPad gets**; empty space *grows* as the
   window widens (33% at 834px → **61% at 1119px**) before snapping to two-pane at 1120px.
10. **Type hierarchy is inverted.** `h1` = 12px mono (`global.css:319-329`); the largest text on the
    page is a lowercase hint sentence at 20px (`:344`). Six of ten text roles collapse onto 12px, so
    there is no claim tier, no deck, no caption tier — the top of the scale is occupied by a
    transient status string, and the composition can therefore never make an assertion. The field
    also sits 18px off optical centre (145px of dead space left vs 109px right).
11. **Nothing leaves the tab.** Verified: zero hits repo-wide for
    `URLSearchParams|location.|history.|localStorage|toDataURL|share|clipboard` in application code.
    No URL state, no persistence, no export, no permalink. On the phone the title is at
    `left:-9999px` and the brand link is `display:none` — a stranger arriving from a shared link
    cannot tell what this is called, who made it, or that anything else exists.
12. **The reveal was thrown away as a bug.** `moons` was cut because it "plateaus at 82-86% no
    matter what… swept 26→5000 epochs and lr 1.5/3.0" (`presets.ts:6-13`); `spiral` was cut earlier
    for the same reason. **That plateau is the lesson.** A capacity wall you hit yourself is exactly
    the shape of Cascade's percolation threshold, and it was deleted for being one.
13. **The deep idea is only in the source.** `presets.ts:20` calls `crisscross` "the canonical *a
    line cannot do this*". Nothing on any screen at any width ever says a line cannot do this, or
    that the eight hidden units are why it can, or what the "8" in "2 in → 8 → 1 guess" is. `HID` is
    locked, so the visitor can never discover that 1 fails, 2 nearly works, 4 nails it.

### P2 / P3

- **Features are decorative.** "how sweet" / "how soft" have no units, ticks, scale or numbers, so
  the metaphor cannot connect to any real quantity — and "softer = riper" with no upper bound
  quietly teaches that an infinitely soft peach is infinitely ripe.
- **`reset` does not reset**, it re-seeds the active preset (`instrument.ts:389-403`), so `CHIP.empty`
  and the `!n` branch are effectively dead code.
- **The difficulty ladder is rendered as a native `<select>`** — the narrative spine drawn as a form
  field.
- **Two `role="status"` live regions** (`.chip` and `.ask`) are both rewritten in `syncChrome()`
  (`instrument.ts:111,119`) plus `.fieldalt` (`:121`), so a phone screen reader double-announces,
  out of order.
- **The math is device-dependent.** `YR` follows the box aspect, so the same *relative* tap feeds a
  different input vector on a phone (±1.72) than on a square desktop field (±1.15), interacting with
  `LR` and `WD`. The "bit-for-bit reproducible" claim holds per-viewport only.
- **README overclaims.** "You gave examples, and the machine found the rule itself — and you watched
  it happen." The last clause is false in the shipped artefact.

---

## 4. What is honest and must survive the rebuild

Not praise — scope protection. These are load-bearing and easy to break while doing §5.

- **The engine is real.** Genuine 2→8→1 MLP, tanh/sigmoid, BCE, full-batch gradient descent, seeded
  and reproducible (`net.ts`). The boundary is genuinely the p=0.5 contour of the live model via
  marching squares (`field.ts:103-138`), not a drawn curve. `metrics()` is honest training-set
  accuracy and says so. Keep all of it.
- **`syncDomain`'s isotropy** (`field.ts:31-36`) — the reason the boundary's slope is not a lie. The
  P0-5 fix must preserve it.
- **`pointerup`-commit + `pointercancel` restore** (`instrument.ts:279-319`) — 2.5.2 pointer
  cancellation. Any new drag gesture must keep cancel-on-drag-off-screen.
- **`pointer-events:none` on `.chip` and `.ax`** — recovered 4.4% of the only input surface. Never
  reintroduce siblings over the canvas without it.
- **Shape + hue redundancy on the marks** (disc vs diamond, `render-field.ts:173-183`) — the
  colour-blind and greyscale reading. Extend it to the ground rather than dropping it.
- **The pending-mark treatment** (cream disc, dimmed siblings, pulsing double ring,
  `render-field.ts:236-249`) is the one moment of real craft on the page. It is the correct model for
  the cursor marker P0-4 needs.
- **`surrounded`'s closed contour** (`m06`) is the only genuinely ownable mark in the whole capture
  set. Land on that geometry class, not on a diagonal.

---

## 5. Redesign direction

### The reframe

The current loop is **observe**: tap, answer a question, watch a settle. It should be **contest**:
the machine states an opinion, you find where it is wrong, you correct it, it gets less wrong, and
a number you care about climbs. Same engine, same free/static/client-side constraints — different
loop, different feeling.

> The machine shows you a peach it has never seen and states its guess. You tell it whether it was
> right. It retrains in front of you. The score on peaches it has never seen goes up. Goal: get it
> to 10-in-a-row on unseen fruit, in as few examples as you can.

That makes the visitor the teacher in the causal sense rather than a person adding dots to a
finished picture — and it needs no new buttons.

### Six structural moves

**M1 · Open untrained. Make every fit a performance, never a precondition.**
Delete the silent pre-fit *as the landing condition*. The first 1.5 seconds should be the boundary
being born: a randomly-initialised net **with its wrong boundary drawn** (un-gate
`render-field.ts:86,155`), two examples land, the line forms in front of you. Keep the 600-epoch
budget — spend it on screen at ~1.5s instead of at 0ms. Every preset change and every reset
*animates* the fit rather than jumping to it; `crisscross` in particular, because watching a curve
that a straight line cannot make assemble itself is the best thing this engine can show and it is
currently spent off-screen. Presets stop being interchangeable wallpaper and become chapters.
*Fixes:* P0-1, P1-12/13, the boredom verdict. *Also fixes P0-3 for free:* at n = 1,2,3 the
visitor's gradient share is 1/2, 1/3, 1/4 — the response is finally large.

**M2 · One continuous gesture instead of two taps. This is the load-bearing change.**
`pointerdown` places the mark **and opens the label as a direction**: drag up = ripe, drag down =
not ripe, release commits. While the finger is down, retrain at `GRID_LO` every frame and let the
boundary follow the finger, with the model's current p shown **at the fingertip** — the probe,
finally, on the device that has a pointer permanently in contact. One gesture per example instead
of two taps plus two 584px saccades; cause and effect under the same thumb.
Second gesture, additive: **drag an existing mark and watch the boundary track it live.** Dragging
one point across the boundary until the model gives up is the knife-edge this toy is missing, and
it already exists in the maths.
*Fixes:* P0-4, P1-1's discoverability, P1-4 (no pending state ⇒ the ring trap dies), P1-6 (~60px of
card comes back; the label buttons become a legend), P1-8.
*On desktop, ship the two one-line un-gatings immediately regardless of everything else:* pass
`probe` into `FieldState` and draw the marker at the cursor; show the dashed ghost on every settle
for everyone.

**M3 · Put the honest numbers on screen, and narrate topology instead of a label census.**
Hold out points the visitor never labels and make **"right on 7 of 12 it has never seen"** the hero
number. It is the actual definition of learning, it climbs as you teach, and it replaces the app's
worst sentence — "can't fit 3 of your 10", a training error reported as a verdict — with its best.
Around it, the readout block the brief always wanted: examples · unseen score · helpers · epoch ·
loss sparkline. That is the Stefaner frame, and it is exactly what the 205px hole in the rail is
for.
Then narrate off the *shape of the field*, persistently, anchored at the mark that caused it:
`segs().length === 0` ⇒ "it stopped drawing a line — it now thinks nothing is ripe" (the most
interesting sentence in the app, currently unsayable); a stuck contour with rising `missed` ⇒ "no
single line can fit these — that's what the eight detectors are for."
And when an example loses the vote, **say why in plain language** — "your 3 new peaches disagree
with 34 older ones; it went with the majority" — then let the visitor delete the older evidence and
watch the same three taps suddenly win. That converts the most confusing message in the app into
its best lesson: models average over evidence.
*Fixes:* P0-6, P1-1, P1-4, P0-3's legibility.

**M4 · Make the field a probability landscape, and show *support* as well as opinion.**
Stop making the ground carry both mark-legibility and information. Move the information into
**structure**: an iso-contour ladder at p = 0.1 / 0.25 / 0.5 / 0.75 / 0.9 drawn as lines on a ground
that stays dim. Contour *spacing* then reads as how sharp the model's opinion is, and it visibly
tightens as training hardens. This keeps the 3:1 mark gate intact (the mark's own dark plate at
`r+1.3` already does that work — thicken it), gives the hero mark shape instead of two fills, and
gives Lupi a legend actually worth drawing — the ramp swatch with its own numbers, which is
currently a documented deletion.
Then add **support**: dim or hatch regions far from any labelled example — "nothing like this yet."
The app then teaches the true, memorable, nobody-else-says-it thing: *a machine is most confidently
wrong where it has never looked.*
Retire the phrase "% sure". Show the model's raw output as a number the diagram can be traced to,
or as a two-sided bar. Never round 0.9996 to "100% sure".
*Fixes:* P0-2, P1-2, P1-3's half of the palette collision, the Bremer failure.

**M5 · Show the mechanism, and make capacity the subject rather than a hidden constraint.**
Two moves that finally make "2 in → 8 → 1" mean something:
- **The 8 hidden units *are* 8 straight lines in input space** (`z_j = w_j·x + b_j`, `net.ts:50`).
  Draw them on the field, faintly, and let the visitor watch a curve get assembled out of straight
  cuts. This is the most explanatory thing this project could possibly do, it costs one function,
  and it retroactively earns the net diagram its 34% of the rail.
- **Unlock `HID` as the one visible dial: 1 → 2 → 4 → 8 → 16 helpers.** On `straight`, 1 solves it.
  On `crisscross`, 1 **provably cannot** (XOR is not linearly separable) — you watch it thrash and
  plateau, flip to 2, and the boundary bends. Then **restore `moons`** as the wall at 8, and let
  16 dissolve it. That is a discrete, unavoidable, qualitative change the visitor found themselves
  — the Cascade percolation moment, in the only place this problem space offers one. Framed as a
  puzzle ("solve crisscross with the fewest helpers"), it is also replayable and shareable in one
  sentence.
*Fixes:* P1-5, P1-12, P1-13, and the "why is there a hidden layer" gap.

**M6 · Give it a spine, an ending, and something to take away.**
Three beats in the Statistical Illusions register — set the trap, let them fall in, show the
mechanism — each closing on a line the visitor earned rather than read:
1. **Teach it from nothing.** Empty field; your first taps fit the model in front of you.
   → *That's all training is.* (the thesis line written for this and never spent, `copy.ts:26`)
2. **A shape a line can't do.** `crisscross`, animated; it fails visibly, then the helpers solve it.
   → *This is what the hidden layer is for.*
3. **Take the helpers away — then hit the wall.** Same problem at 1 helper; then `moons` at 8.
   → *That's what capacity buys.*
Then a real ending: the confidently-wrong reveal (drop a peach where there are no examples and let
the machine be 100% sure and 100% wrong), the visitor's field encoded in the URL, a par score
("crisscross solved with 3 helpers / 9 examples"), the title, the author, the link home. All of it
is a URL hash and a canvas export — no server, no dependency.
*Fixes:* P1-11, P2 naming/authorship, retention, and the portfolio job the phone build currently
abandons.

### Composition rebuild (required, but subordinate to M1–M6)

- Desktop becomes **field-first**, not a stretched phone card beside a square. The 145px left band
  and the 205px hole take the **apparatus**: real labelled scales with ticks on both axes, the
  contour-ramp legend, the fixed metadata block from M3. A gutter that holds no scale is a margin
  error.
- Fix the type hierarchy: three roles at three sizes — nameplate, thesis, live status — with the
  status moving beside the field into the metadata block so the top of the scale can carry an
  assertion.
- Recolour weight sign onto a neutral ± encoding (width + value); reserve orange/teal for class
  everywhere.
- Delete the 900–1119px band: two-pane from ~1000px with a flexible field, or field-above /
  rail-below at tablet width. **No layout should get narrower as the viewport widens.**
- Ship landscape: reuse the existing two-pane grid at
  `(orientation: landscape) and (max-height: 500px)`.
- Promote the presets out of the `<select>` into the visible ladder they actually are.

### Locks that must be reopened, with the trade named

| Lock | Reopen because | Paid for instead by |
|---|---|---|
| `SEED_EPOCHS = 600` as the landing condition | it deletes the entire subject (P0-1) | animating the fit (M1) — same epoch budget, spent on screen |
| `FIELD_MAX = 0.4` + `bloomAlpha` | it deletes confidence and 2/3 of the palette (P0-2) | contours on a dim ground + a thicker mark plate (M4) — the 3:1 gate survives |
| `HID = 8` | capacity is the lesson, not a constraint to hide (P1-12/13) | making the dial the subject (M5) |
| `WD = 0.02` | it caps agency and forced two presets to be cut (P0-3) | small n from M1 + focused attention on the newest example |

**Re-verification gate:** `field.ts:66-79` is explicit that a naive `FIELD_MAX` increase breaks the
3:1 gate on the orange class first, and that it must be re-sampled on a **used** field, not on the
seeds, where it reads a false pass. M4 changes the mechanism rather than the number, so it needs its
own contrast measurement on a used field before shipping — not an assumption that structure buys it.

### What NOT to do

- **Not another polish pass.** Nothing above is a colour, a radius, or a wording tweak.
- **Do not re-add the four-button control bar.** Dustin's original complaint was too many
  same-weight buttons; the answer is *continuous* controls (the drag, the helper dial, a training
  scrub), not the deleted buttons back.
- **Do not keep the chip as the narrator.** A status line that can claim "moved the line" on 16 of
  4096 cells and contradict itself 1.7s later cannot be the only thing explaining the product.
- **Do not ship the phone as the desktop minus features.** That is the decision producing the
  verdict at the top of this doc.

---

## 6. Suggested sequencing

Direction only — not a plan, and not to be executed without Dustin's sign-off on §7.

1. **Free wins, independent of everything** (hours, no design decisions): pass `probe` into
   `FieldState` + draw the cursor marker; un-gate the ghost; fix the rotation orphaning (P0-5);
   fix the unreachable `noneRipe` gate; ship a landscape rule.
2. **Decide §7 first.** M1 + M5 are the two that change what the piece *is*; everything else
   composes onto them.
3. **M1 → M3 → M4** rebuild the honesty layer. The engine survives; the controller and the field
   renderer are rewritten.
4. **M2** is the biggest single UX change and wants its own flow document before code.
5. **M5 → M6** turn it from an exhibit into a piece with an argument and an ending.
6. Composition rebuild lands with M3/M4, since the readout and the legend are what fill the frame.

---

## 7. Open decisions for Dustin

1. **Sandbox or guided piece?** Recommendation: a three-beat guided spine (M6) that releases into a
   free sandbox, matching Statistical Illusions' shape. This is the decision everything else hangs
   from.
2. **Reopen `HID` / `WD` / `FIELD_MAX`?** Recommendation: yes, all three, with the M4 contrast
   re-measurement as the gate. Without this the piece cannot be made honest or fun.
3. **The peach metaphor:** commit or drop? Recommendation: commit *and* give the axes real units,
   ticks and a scale (sweetness, firmness), which is free and is exactly the Stefaner move — or drop
   the fruit for two abstract classes with real quantities. What cannot continue is a metaphor with
   no numbers behind it.
4. **Is the unseen-fruit score (M3) the hero number?** Recommendation: yes. It is the only number in
   the design space that is both honest and climbs.
5. **Scope acceptance:** this is a re-conception of the interaction layer, not a revision. `net.ts`,
   `palette.ts`, `prng.ts` and the marching-squares contour survive largely intact; `instrument.ts`,
   `render-field.ts`, `render-net.ts`, `copy.ts` and `global.css` are substantially rewritten.

---

## 8. Evidence index

Captures live in
`C:\Users\dusti\AppData\Local\Temp\claude\c--Users-dusti-brain\9f68a781-04ab-4512-866a-e41b49ed662d\scratchpad\shots\`
(session scratch — copy anything worth keeping before it is swept). Full lens-3 working notes and
the two subagent reports are in the same scratchpad (`LENS3-math-pedagogy.md`,
`REVIEW-BRIEF.md`, `DIRECTION-draft.md`).

| File | Shows |
|---|---|
| `m01-landing.png` | 390×844 landing, `straight` — solved boundary at t=0 |
| `m02-armed.png` | pending mark, "Was that one ripe?" |
| `m03-settling.png` | 1 contradiction → "can't fit 1 of your 7" |
| `m04-four-contradictions.png` | **collapse: field one colour, contour gone, "can't fit 3 of your 10"** |
| `m05-crisscross.png` | XOR, pre-solved on arrival |
| `m06-surrounded-needpoint.png` | closed contour (the one ownable mark) + "tap the field first" |
| `m07-surrounded-3contradictions.png` | **3 contradictions, boundary unchanged, "can't fit 2 of your 37"** |
| `m08-netzoom.png` | the 74×30 net glyph at 8× — 8 hidden nodes fused into one pill |
| `m09-landscape-844x390.png` | landscape: 560×129 field, 67% chrome |
| `m10-editing.png` | editing an existing mark + `remove` |
| `m11-empty-state.png` | the unreachable empty state (12 taps to get there) |
| `m12-from-scratch-two-points.png` | **2 examples render as certain as 36** |
| `m13-rotate-after-touch.png` | **"7 peaches · 4 ripe" with 1 mark on the field** |
| `d01-landing-1440.png` | desktop composition, the 205px hole |
| `d02-hover-probe.png` | hover probe reading with no marker on the field |
| `d03-1280x800.png` | same composition at laptop size |
| `t01-834x1112.png` | iPad portrait: phone shell at 560px, 137px bars |

**Key measurements:** field plateau RGB `(131,73,51)` / `(36,94,80)`, pixel-identical across
x=3-44% and 64-95%; 88.4% of field pixels saturated; displayed confidence ceiling `0.4^1.22 =
0.327` of a 4-stop ramp; desktop rail 348×718 with a 205px gap and a 234px `aria-hidden` canvas
(64% combined); phone card 390×260 (31% of viewport) with ~3% dynamic range; `reset` 35×36; net
canvas 74×30 phone / 310×234 desktop; type — `h1` 12px vs status 20px, 6 of 10 roles at 12px;
gradient share per new example 1/(n+1) with n₀ = 6 / 32 / 36; L2 shrink `0.97²⁰⁰ ≈ 0.0022` per
settle; `MOVED_FRAC` = 16 of 4096 cells; 600 pre-fit epochs vs 200 visible.
