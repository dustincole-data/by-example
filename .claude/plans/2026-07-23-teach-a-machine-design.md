# By Example — Locked Visual Design Spec + Build Plan

> **📛 NAMED (ticket 05, 2026-07-24): the project is `By Example`.** The working title *"Teach a Machine"* is retired — it collided with Google's Teachable Machine. Where this document still says "Teach a Machine" below, that is the **historical working title**, not a shippable string. **Nothing user-visible may ship it** — see §3's title block and §12.

**Status:** ✅ **FINAL / COMPLETE** (charted 2026-07-23 via `/wayfinder`; foundational forks approved by Dustin). **Locked: §1+§3 look (ticket 01) · §5 engine (ticket 02) · §4 on-ramp choreography (ticket 03) · §5+§5.1 width, learning rate + preset roster (ticket 04) · §12 name (ticket 05).** **No open decisions remain — hand to a separate BUILD session.**
**One-line:** a personal, playable ML instrument for dustincoledata — *you give a machine examples, it learns the rule in front of you* — one crisp 2-class classifier whose decision boundary bends and accuracy climbs live as you teach it.
**Repo (to create):** standalone `github.com/dustincole-data/by-example` → own Vercel → **`byexample.dustincoledata.com`** → linked from dustincoledata.com (external-card pattern, like Namesake / Cascade / Fanbase Weather).
**Sibling precedent:** **Cascade** (`Projects\Cascade\.claude\plans\2026-07-23-cascade-design.md`) — same dark-instrument-stage register, type system, deploy model. This spec inherits Cascade's aesthetic system and adapts it from *simulation* to *ML instrument*.

---

## 0. Approved decisions (this charting session, 2026-07-23)

| # | Decision | Locked choice |
|---|----------|---------------|
| 1 | The interaction | **Label 2-class points → watch the decision boundary form.** You click to drop class-A / class-B points on a dark field; a live classifier redraws its boundary each training step as accuracy climbs. TensorFlow-Playground reimagined as a lab instrument. Fully self-contained — no webcam, no big model download, no assets. *(Rejected: draw-digits recognizer — 'watch it learn' is weak live + MNIST cliché; teachable-machine webcam — permission friction + big model + reads as 'demo'.)* |
| 2 | Instrument depth | **Boundary field = hero + a small FIXED-architecture live net diagram (mechanism panel).** Neurons pulse with activation, edges thicken/color by weight, live as it trains — "you can see it think." Fixed architecture (no user-editable layers) = the strongest real-ML flex without Playground scope creep. *(Dustin deferred to judgment; the hero-look prototype validates the net panel earns its place — if it competes with the boundary, it dials back.)* |
| 3 | Narrative | **Light guided on-ramp + one quiet thesis line → free sandbox** (Cascade's on-ramp→sandbox shape). Narrates the *concept* (what training is), never Dustin. The "I direct AI" flex lives on the dustincoledata.com card + the fact this exists — NOT in preachy in-app copy. *(Dustin deferred to judgment.)* |

**The aha (the point):** *You never wrote a rule. You gave examples, and the machine found the rule itself — and you watched it happen.* That is what "training" is, made visible and playable.

**Standing brand/design constraints applied:** anchors on `dustin-brand-anchor` (a regular analytics guy who directs AI to build real, visual, trustworthy things; publish only personal projects; non-engineer-who-directs-AI is the feature; NO "governed analytics / eval-gate" reach-language) and the design canon (`design-canon-visual-cinnamon`, `dustin-dataviz-borrow-recipe`, `dustincoledata-design-direction`). **Personal, apolitical, free, low-upkeep, fully client-side.**

**Anti-cliché guardrails (verbatim intent):** NO neon gradients · NO cartoon robots / 🤖 · NO glitchy sci-fi · NO "AI magic" mysticism. Minimal, precise. The **data / decision boundary / neurons are the only color**. Rigorous labels (examples seen, accuracy, loss, epoch). It must read as a **scientific instrument**, not an AI demo.

---

## 1. Aesthetic system (inherited from Cascade, adapted for ML)

> **🔒 LOOK LOCKED (ticket 01, 2026-07-24).** Reference: `.scratch/teach-a-machine/assets/01-instrument-look.html` (2-dir study alongside it). The graft: **framed chrome + rigorous scatter + climbing-accuracy curve + mechanism net as a modest side-panel** (fork 2 = net earns its place, stays secondary), with a touch of field **bloom**. §1.2 starting hexes **CONFIRMED as-is** — CVD: class-A teal ↔ class-B orange **ΔE 8.8 (protan)** ≥ 8.0; poles kept **deep/saturated (not pastel)**; state also carried by **luminance** (dim seam → bright poles) + **point position**, never hue alone; coral = class-B deep end only. **Boundary field** = coarse forward-pass grid (≈176×132) → ImageData **upscale** + p=0.5 **marching-squares contour** (canvas 2D, ~5–9 ms/epoch → repaints every epoch in real time, no WebGL). **JetBrains Mono** for readouts. **Training curve** = accuracy hero + normalized-loss companion, annotation OFF the line, mono axes, live epoch marker. **⚠ Scoped amendment (ticket 03, §4.5):** this hero assignment holds in the **sandbox**; during the **on-ramp** the hero stroke goes to **loss ↓**, because the user's hand-placed points drive accuracy to 1.00 by epoch ~2 and a flat 100% line across the hero moment reads as trivial or faked. The reference's frozen frame is real seeded hand-rolled-MLP output (honest; does not decide §5 engine — that's ticket 02).

### 1.1 Register
An **observatory / lab bench**: a dark instrument on which a machine visibly learns. Chrome is quiet, technical, restrained — it never competes with the stage. The colorful, glowing boundary field, the pulsing net, and the training curve are the largest, brightest things on screen (canon: *the work carries the page; type stays small*).

### 1.2 Palette (starting tokens — CVD-validate & lock in ticket 01)
CVD-honest rule (canon): **spectral within an encoding, never a rainbow across categories; luminance also carries state so nothing relies on hue alone.** Two-class classification is a natural **diverging** encoding: cool pole = class A, warm pole = class B, the decision boundary = the neutral seam between them.

| Token | Intent | Start value |
|-------|--------|-------------|
| `--stage` | near-black field (slight blue) | `#0a0c10` |
| `--chrome` | panel / control-bar ground | `#12151c` |
| `--ink` | primary chrome text | `#c9d1d9` |
| `--ink-muted` | labels, secondary | `#8b949e` |
| `--focus` | focus ring / active control | `#4cc9f0` (soft cyan) |
| Class A (cool) | one label + its confidence region | `#2fb488` bright teal → deep `#1f7a5c` |
| Class B (warm) | other label + its confidence region | `#ff8a3d` orange → `#ff5a5f` coral |
| Boundary heatmap | classifier confidence field | **diverging ramp** teal ⇢ neutral ⇢ orange; low-confidence midband dim, high-confidence poles bright |
| Decision line (p=0.5) | the boundary itself | bright hot-core hairline `#fff1c2` |
| Net: neuron | activation | glow intensity (luminance) on `--chrome`, hot-core when saturated |
| Net: edge | weight | thickness = |w|; sign color = cool (−) / warm (+); dim when near-zero |

Glow = additive radial halo behind confident regions / active neurons (reads only because the ground is dark). Keep halos disciplined (Stefaner rigour keeps Bremer glow from reading tacky). **Points** (the user's examples) sit crisp and solid on top of the soft confidence field — a hard mark on a soft ground, so the *data* always reads as the ground truth.

### 1.3 Typography
- **Archivo** (locked free grotesque, Atlas-Grotesk stand-in) for UI + headings — **small and restrained; biggest heading ≈28–32px, NEVER a billboard**.
- **JetBrains Mono** for numeric readouts, axis labels, control values, the "instrument" register (engineered digits read as a readout; inherited from Cascade's ticket-01 lock).
- **Hard bans (canon):** no serif anywhere; no giant display type; never Fraunces / Inter / Space Grotesk / Hanken / IBM Plex as the sans. Inline woff2 as base64 data-URIs (CSP blocks CDN fonts).

### 1.4 Motion
- The **training loop** is a canvas `requestAnimationFrame` loop (boundary repaint + net animation per epoch) — NOT GSAP.
- **GSAP only for chrome** (landing entrances, beat transitions). Apply `gsap-scrub-from-conflict` rules: scroll-triggered `from()` gets `immediateRender:false`; never double-drive one transform prop with both a `from()` and a scrub tween; ~2.5s failsafe clears inline transform/opacity/visibility.
- `prefers-reduced-motion`: no auto-train; instrument loads idle with a visible **Train**; boundary/curve can render final state without the animated descent; no essential info conveyed by motion alone.

### 1.5 Layout
Truth & Beauty discipline (calm editorial chrome) around a dark stage. **Boundary field dominant (hero)** + **net-diagram mechanism panel** + **training-curve strip** + **control bar**. Generous quiet margins; small labels; the glowing field is the hero. (Exact arrangement — panels side-by-side vs. curve-as-strip — is a ticket-01 look decision; the field must stay clearly dominant.)

---

## 2. The interaction (fork 1, locked)

1. **Place examples.** Two "brush" toggles: `+ class A` / `+ class B`. Click the field to drop a labeled point. (Optionally shift-click or right-brush for the other class.)
2. **Train.** Hit **Train** → gradient descent runs, animated: the **boundary field repaints each epoch** as the model fits, the **net diagram pulses**, and **accuracy climbs / loss falls** on the readouts + training curve.
3. **Teach it a lesson.** Drop a point in the *other* class's territory and retrain → the boundary **bends** to accommodate it. This is the "watch it learn *your* intent" beat.
4. **Sandbox controls:** `+A` / `+B` brushes · **Train / Pause / Step** (one epoch) · **Reset weights** (re-init, keep points) · **Clear** (wipe points) · learning-rate + preset-dataset affordances (§4). All keyboard-operable; visible `--focus` ring.

---

## 3. The instrument (three reading zones + chrome)

- **Boundary field (hero).** The 2D input space. Soft diverging confidence heatmap (§1.2) with the bright p=0.5 decision line; the user's example points crisp on top. This is where "the machine learns" is *seen*.
- **Mechanism net (fork 2).** A small fixed MLP drawn as nodes + edges (e.g. `2 → [hidden] → 1`). Neuron glow = activation, edge thickness/color = weight. Animates live during training — the "you can see it think" flex. Secondary to the field.
- **Training curve (the Visual Cinnamon "data-art payoff," Cascade parallel).** **Accuracy ↑ / loss ↓ vs epoch** — the "accuracy climbing" from the brief rendered as a rigorous instrument plot: thin spectral stroke, faint gridlines, mono axis labels, annotation OFF the line (canon overlap rule), a live marker at the current epoch. The curve *is* the receipt that real training happened.
- **Readouts (mono).** `examples N` · `accuracy 0.xx` · `loss 0.xx` · `epoch k`. Rigorous, unglamorous, always visible.
- **Stage title block (🔒 ticket 05).** Archivo `By Example` **+ the existing mono line `2→8→1 MLP · tanh · gradient descent`, unchanged. No English descriptor under the title** — the mono spec line already answers "what is this" in the instrument's own voice; a prose sub-line either restores the collision or pre-states §4.6's thesis. ⚠ **Both prototypes render `<h2>Teach a machine</h2>` — that string is the collision and must not ship.**

---

## 4. On-ramp + sandbox (fork 3 — 🔒 CHOREOGRAPHY LOCKED, ticket 03, 2026-07-24)

> **🔒 LOCKED via HITL `/prototype` + `/grilling` with Dustin, 2026-07-24** (nine decisions, Q1–Q9). Reference implementation: [assets/03-onramp-choreography.html](../../.scratch/teach-a-machine/assets/03-onramp-choreography.html) — driven end-to-end in-browser: all three beats, the snap, the thesis, the hand-off, and sandbox inheritance verified. **This supersedes the pre-grilling draft**, which had ghost target zones, an `accuracy ≥ 0.90` snap, and a modal thesis — all three were measured or argued out and replaced below.

### 4.1 Beat model — **prompt → you act → payoff**, action-gated

Each beat states a **prompt**, waits for the user to *actually do the thing*, then reveals a **payoff**. **Never timed; nothing auto-plays.** `Next` unlocks only once the action is done.

The aha ("*you* gave the examples, the machine found the rule") only lands if the user performs it rather than watching it. Bonus: action-gating **is** the reduced-motion path, so there is no separate no-motion script to maintain.

### 4.2 The locked script

| Beat | Prompt (before you act) | Payoff (after) |
|---|---|---|
| **1 · Give it examples** | "Give it a few examples of each class."<br>*Brush is on +A — click a few spots. Then switch to +B and click somewhere else. No boundary yet — just your examples.* | "That's the whole dataset — **{n}** points and two labels."<br>*This is everything the machine gets to see. Nothing else.* |
| **2 · Watch it learn** | "Press Train."<br>*Gradient descent, running live: the field fills in, the boundary bends, loss falls.* | "It found a boundary that separates them — and you never wrote one."<br>*That bright line is the rule it settled on.* |
| **3 · Teach it a lesson** | "Now contradict it: drop a +A deep in the B cluster, then Train again."<br>*One example that breaks the pattern.* | "The boundary bent to fit your new example."<br>*No code changed. The examples changed, so the rule changed.* |

- `{n}` = the **live example count**, substituted at render.
- **Beats stay strictly factual/observational; the thesis is the ONLY line that generalises.** The earlier draft had beats 2 *and* 3 each delivering the thesis, so the thesis card was its third restatement and landed flat.
- **Beat-1 gate:** 3 × `+A` and 3 × `+B`; the sub-line carries a live `(2/3)` counter.
- **Beat-3 rule (bug fixed):** dropping the contradicting point must **NOT** retrain. The boundary stays stale so the point visibly sits in enemy territory; pressing **Train** is what bends it. *(The prototype originally retrained on drop — the payoff fired before its own prompt.)*
- **Register:** narrates the *concept*, never Dustin. Zero self-promo, no anthropomorphising, no "AI magic". Light, a little dry.

### 4.3 The empty stage

Field starts **dark and empty — no boundary until Beat 2's Train**, so "you gave examples, *then* it found the rule" lands. **No ghost target boxes** — labelled "+A here / +B here" drop-zones were cut: they read wizard-y and quietly turned *"teach it YOUR rule"* into *"put A in the pre-approved A spot."* The coach line + counter carry the guidance.

### 4.4 **The snap** — a real model event with a derived playback window

- **The snap = the boundary *settling***: the first epoch where **mean confidence reaches 95% of the run's final confidence**. The p=0.5 line pulses once; Beat 2's payoff appears at that instant.
- **NOT accuracy.** Measured on the real engine: with hand-placed points **accuracy hits 1.00 by epoch 1–2 at every dataset size** (6/10/16/24 points, tight or overlapping) — an 8-unit tanh net separates two blobs essentially at init. An `acc ≥ 0.90` trigger fired at **epoch 1 of 240**, before the field finished blooming. Confidence is what actually moves (0.30 → 0.99).
- **The playback window is DERIVED from the snap, not fixed.** A fixed 60-epoch window was measured to break: well-separated points snapped at 0.5s; interleaved points **never snapped inside the window at all** — confidence rises at a rate set by how separable the user's points happen to be.
  - `snapEpoch` = first epoch with `conf ≥ 0.95 × conf(final)`
  - `window = clamp(round(1.7 × snapEpoch), 20, 140)`, played over **~2.4s** at a constant rate
  - Verified across 8 placements (textbook / close-together / vertical / interleaved / 1+1 / lopsided / many-points / beat-3-intruder): the snap lands consistently at **~60% through the run** in every case.
  - Only the playback **rate** adapts — the epoch the model actually settles on is untouched. This is choosing a playback speed, not faking an event.
- **Build note:** in the prototype the snap landed at ~2.1s rather than the intended ~1.4s. The window sizing was exact (proportion held at 67%), but per-frame render cost stretched the wall clock ~32%. Budget frame cost in build; throttle the confidence-field repaint to every 2nd epoch if the target duration slips.
- **Sandbox `Train` keeps the full 240-epoch run** (unchanged).

### 4.5 The training curve flips its hero by phase

- **On-ramp: loss ↓ is the hero stroke**; accuracy is the thin dashed companion.
- **Sandbox: reverts to §1's locked accuracy-hero + loss-companion.**
- Why: during the on-ramp a flat 100% accuracy line runs straight across the single most important moment in the piece — a first-timer reading "accuracy 1.00" the instant they press Train may conclude it's trivial or faked, exactly the credibility this project cannot spend. **A scoped amendment to §1, not a reversal** — accuracy climbs *genuinely* on the sandbox presets, which is where "accuracy climbs live" is honestly delivered:

  | preset | accuracy (sandbox, lr 1.5) | note |
  |---|---|---|
  | two blobs | 0.78 → 1.00 | shortest climb — the opener |
  | XOR | 0.56 → 1.00 | needs the hidden layer |
  | circles | 0.53 → 1.00 | sits flat, then breaks through — best drama |
  | moons | 0.57 → 1.00 | longest climb; the prettiest final frame |

  *(Superseded by ticket 04: this table previously showed moons plateauing at 0.93 and a spiral at 0.82 — both were measured at the on-ramp's `lr 0.55`, where moons only converges on 2 seeds in 8. At the sandbox's locked lr 1.5 all four solve on every seed, and spiral is out of the roster entirely. §5.1.)*

### 4.6 The thesis — inline, once

> **You give the examples. The machine finds the rule. That's all training is.**

Rendered as an **inline takeover of the coach strip**: the strip expands, beat-dots disappear, type steps up one size, and the instrument stays **fully visible and un-dimmed** below. `Play freely →` dismisses it into the sandbox.

**No modal.** A full-screen dim+blur overlay hides the machine at the exact moment the user finished teaching it — the boundary they made is the *proof of the sentence* — and it was the one webby pattern in the whole piece.

### 4.7 The hand-off

The sandbox **inherits their taught machine** — their points, their trained boundary, settled to the converged model. Wiping to a clean field or a preset would discard what the on-ramp just built and make the sandbox feel like a different app.

On release: coach strip removed · the **"on-ramp" badge is dropped entirely** (not reworded) · the **Beat-3 intruder's dashed ring is cleared** (a beat annotation, not a property of the point) · sandbox controls revealed (Step / Reset / Clear / learning-rate / presets).

**Skip the tour →** is present throughout, jumping straight to a pre-trained `moons` sandbox (returning visitors / no-mouse). Moons stays the destination — at the sandbox's lr 1.5 it solves cleanly (ticket 04) and its curved seam threading two arcs is the best single frame in the set, so a skipper lands on the instrument at its most legible. *(The earlier "it plateaus at 0.93, which shows the machine can struggle" rationale was an artefact of the on-ramp's lower lr — see §5.1.)*

### 4.8 Reduced motion & a11y

- `prefers-reduced-motion` → **Train renders the final boundary instantly**: no bloom, no epoch descent, no snap pulse; payoff copy appears at once; the thesis appears without the rise animation. Beats still advance by action. The button pulse degrades to a static bright border. **No information is lost — the training curve still plots the whole descent.**
- **Beat 2's sub-line adapts** under reduced motion → *"Gradient descent runs on your examples — the curve records the whole descent."* Never describe an animation the user will not see.
- **The coach strip carries `aria-live="polite"`** so the prompt→payoff swap is announced — without it the entire beat structure is silent to a screen-reader user.
- Field is `role="application"` + `tabindex=0` with a keyboard crosshair (arrows move · Enter drops · A/B switches brush); all controls keyboard-operable with a visible focus ring; Skip is the no-mouse escape hatch.

### 4.9 Sandbox

Full brushes, Train/Pause/Step, learning-rate (revealed at **1.5** — §5), **preset datasets**, Reset/Clear. Presets are where the hidden layer visibly earns its keep — the quiet second aha. **Roster locked = two blobs · XOR · circles · moons (§5.1).**

---

## 5. The ML (real, not faked — LOCKED, tickets 02 + 04)

> **🔒 ENGINE LOCKED (ticket 02, 2026-07-24)** — hand-rolled MLP, decisively over TF.js on all five criteria. Rationale + sources: `.scratch/teach-a-machine/assets/02-model-engine.md`.
> **🔒 WIDTH + LEARNING RATE LOCKED (ticket 04, 2026-07-24)** — `H = 8`; sandbox lr default **1.5**, on-ramp **0.55**. Evidence: `.scratch/teach-a-machine/assets/04-preset-datasets.html`.

- **Task:** binary classification of 2D points. **Fixed MLP `2 → 8 → 1`**, tanh hidden + sigmoid output, binary cross-entropy, trained by **full-batch gradient descent** on the user's points. Fixed architecture (fork 2) — no user layer editing.
- **Engine: hand-rolled, ~100–150 lines, zero dependencies.** State is four plain arrays — `W1[2][8], b1[8], W2[8], b2` — which *are* also exactly what the mechanism-net panel draws (edge = weight sign/magnitude, node = activation). TF.js was rejected: it hides activations behind an auxiliary model + a second forward pass and weights behind per-epoch GPU→CPU readback, costs ~208 KB gzipped, and needs the `cpu` backend pinned for determinism. (TensorFlow Playground ships its own hand-written net for the same reasons.) Still genuinely real ML both ways.
- **What's REAL (non-negotiable):** genuine forward pass + backprop + metrics. Accuracy, loss, epoch, and the boundary are computed from the actual model — nothing is scripted or faked. The net diagram reads the model's *actual* activations + weights.
- **Init + determinism:** Xavier-ish weights scaled by a seeded `mulberry32` PRNG (the shipped prototypes use `gauss × 0.9`, `b1 = gauss × 0.3`), fixed training order → bit-for-bit reproducible demos.
- **Learning rate — one control, two defaults (ticket 04):** the **on-ramp trains at 0.55**, the value its choreography was measured against; the **sandbox default is 1.5**, the value at which all four presets converge on every seed. The lr slider is a **sandbox-only control that does not exist during the tour**, so it is simply revealed at 1.5 at hand-off alongside Step / Reset / Clear / presets. The user's trained machine is untouched — only their next Train is faster. *(Measured: a global 1.5 drags the on-ramp snap from ~1.4s to 0.60–0.96s, and to 0.12s on the beat-3 intruder placement, because those models converge in 1–6 epochs and the `MIN_WIN` floor cannot stretch that back out.)*
- **Confidence field:** evaluate `p` over a coarse grid (≈176×132) each epoch → ImageData upscale + marching-squares `p=0.5` contour, canvas 2D, ~5–9 ms/epoch. **No WebGL.**
- **Sandbox pacing:** 1 epoch per animation frame (≈60 epochs/s), which puts every preset's settle at **0.4–3.3s** at lr 1.5. (The on-ramp's Beat-2 window stays derived from the snap epoch per §4.)

### 5.1 Preset datasets — 🔒 ROSTER LOCKED (ticket 04, 2026-07-24)

**Four presets ship, in this order** — a genuine easy → aha → hard ladder, which is also strictly increasing in snap epoch (9 → 58 → 144 → 151), so the buttons read left-to-right as "harder":

| # | Preset | Shape | What it teaches | Snap / settle epoch (lr 1.5) |
|---|--------|-------|-----------------|------------------------------|
| 1 | **two blobs** | linearly separable | The gentle first move — a straight boundary suffices. Earns its place as the opener, and by making the next three mean something. | 9 / 25 |
| 2 | **XOR** | 4 clusters, diagonal classes | The canonical *a line cannot do this*. The hidden layer visibly earns its keep: two crossing seams. Delivers §9's acceptance clause literally. | 58 / 60 |
| 3 | **circles** | one class enclosed by the other | A **closed** boundary — the net wraps a ring around the inner class. Best drama: accuracy sits flat, then breaks through. | 144 / 145 |
| 4 | **moons** | interlocking arcs | A **curved seam** threading between two arcs; reads most like "it learned a shape". The prettiest final frame; the Skip-the-tour destination (§4.7). | 151 / 155 |

Each fits **8/8 seeds** — train accuracy ≥ 0.98 **and** ≥ 0.95 on 400 held-out points from the same generator (all four score **1.00** held-out). Generators + measurements: [assets/04-preset-datasets.html](../../.scratch/teach-a-machine/assets/04-preset-datasets.html).

**Spiral is OUT — every variant.** TensorFlow Playground's 1.75-turn spiral is **0/8 at every setting swept** (`H` ∈ {4, 6, 8, 12} × `lr` ∈ {0.55, 1.5, 3} × {240, 600} epochs), held-out ≈ 0.53 — a coin flip. That is a **capacity wall, not a tuning problem**: eight tanh units cannot wrap two arms of 1.75 turns, and the architecture is fixed by fork 2. Shipping it would break the map's one hard promise — never ship a preset the net can't fit. A 0.6-turn "swirl" *does* fit 8/8, but renders as an S-curve visually near-identical to moons, so it was cut as redundant (curation: smallest roster, no overlap); calling a half-turn arc "spiral" would also invite the Playground comparison we'd lose.

**BUILD note:** the ticket-03 prototype ships a `spiral` preset button + generator — **delete both**. Ship exactly the four above.

---

## 6. Tech / constraints / deploy

- **Stack:** Astro (static) + TypeScript + Vitest; **canvas 2D** for the boundary field + net (WebGL not expected — a coarse confidence grid ≤ ~200² repaints fine); the classifier per §5/ticket 02.
- **Hard constraints (verbatim, honored):** FREE; LOW upkeep — client-side ML, fully **in-browser, NO server, NO API, no cron**; static; self-contained. (If TF.js is chosen it ships as a static client lib — still zero server.) Medium build — ML UX is fiddly; scope stays tight (ONE 2-class classifier).
- **Deploy (Namesake/Cascade gotchas baked in):**
  - Standalone repo `github.com/dustincole-data/<name>`, public, `main`; its **own Vercel project**, Node 22, 100% static → ~zero runtime compute (do NOT proxy through the main site).
  - `base:'/'`, **default `outDir`** (so `astro preview` works — don't nest outDir), `site='https://<sub>.dustincoledata.com'`.
  - DNS: CNAME `<sub>` → Vercel. Verify live: landing, instrument route, boundary/net/curve render, train loop, reduced-motion path.
  - **Static OG image only** (no `@vercel/og` edge fn — nothing here is per-URL personalized).
- **dustincoledata link-in:** add a `<ProjectCard external>` on `/projects` (external subdomain pattern), later — out of scope for this repo's build; note for the site session.

## 7. Accessibility & performance
- Keyboard-operable controls (brush toggle, Train/Pause/Step/Reset/Clear, sliders); visible focus ring; logical tab order; the field is operable without a mouse (e.g. keyboard crosshair to place points, or preset datasets as the no-mouse path).
- `prefers-reduced-motion` honored (loads idle; final states renderable without the animated descent; no motion-only information).
- **CVD-validated palette** (§1.2) via the `dataviz` skill's `validate_palette.js` in ticket 01 — the class-A↔class-B poles must survive color-blindness (target worst-adjacent ΔE ≥ 8.0, per Cascade) and state must also read by luminance/position, not hue alone.
- **60fps target:** repaint the confidence field at a coarse grid resolution (upsampled) rather than per-pixel per-epoch; throttle boundary repaint to every N epochs if needed; `devicePixelRatio`-aware canvas; pause rAF when tab hidden. Confirm the render budget in ticket 01 (Cascade-style perf sanity).

## 8. Build plan (phased, low-risk — design-first)

**Phase 0 — Gates (design-first + de-risk; run before the engine is wired):**
- **Look-study (ticket 01, HITL /prototype + Impeccable):** static 2-direction look of the dark instrument — a frozen mid-training frame (boundary field + net + training curve + control bar), two variations. Dustin picks one → visual lock. Folds in CVD palette validation + mono confirm + 60fps sanity. *(Namesake/Cascade ticket-01 pattern.)*
- **Model approach (ticket 02, research/decision):** TF.js vs hand-rolled MLP → recommendation + rationale. Can run in parallel with ticket 01 (the look-study fakes a frozen frame).

**Phase 1 — Scaffold + shell.** Astro + deploy config (§6). Layout/theme (palette tokens, dark stage, three zones, control bar), a11y plumbing, seedable init.

**Phase 2 — The instrument end-to-end.** Wire the classifier (ticket-02 engine): brushes → points → train loop → live boundary repaint + net animation + training curve + readouts. **Verify the look live in-browser at each step** (never leave polish to the end). Meet the §9 acceptance.

**Phase 3 — On-ramp + sandbox.** The 3 beats + thesis line (§4), preset datasets, then release to free play. Landing frames the concept + register.

**Phase 4 — Ship.** Deploy + live-verify (routes, train loop, reduced-motion, OG unfurl). Add the dustincoledata `/projects` card (site session).

**Tracker:** local markdown in the repo (`.claude/plans/` build log). No external tracker.

## 9. Acceptance
Boundary redraws smoothly (≥ ~30–60fps) during training; accuracy/loss/epoch are the model's real values; dropping a point in enemy territory + retraining visibly bends the boundary; the net diagram reflects real activations/weights; a preset like XOR visibly needs the hidden layer; keyboard + reduced-motion paths work; **looks beautiful live in-browser** (design-first — verified, not assumed); reads as a scientific instrument, not an AI demo (guardrails §0).

## 10. Risks & watch-items
- **AI-demo cliché (the #1 risk):** guard the guardrails (§0) — no neon, no robot, no glitch, no mysticism; rigorous mono labels; the instrument register from ticket 01.
- **Blind-mock burn (Dustin's #1 design frustration):** mitigated by the Phase-0 look-study + anchoring on Cascade/named references, not iterating mocks blind.
- **Net diagram clutter:** it's secondary; if it competes with the boundary in ticket 01, dial it back (smaller, quieter, or on-demand).
- **Billboard/serif/AI-tell reflex:** small Archivo, mono labels, no giant hero, no decorative generative art.
- **ML UX fiddliness / perf:** coarse-grid confidence repaint; throttle; cap grid size; profile in ticket 01.
- **Determinism:** seed the weight init + any point-jitter so demos/beats reproduce (ticket 02 to confirm the engine supports it).
- **Scope creep:** ONE 2-class 2D classifier, fixed architecture. No editable net, no multiclass, no digits, no webcam.

## 11. References (anchor the look; do NOT copy)
- **TensorFlow Playground** (`playground.tensorflow.org`) — the *interaction* lineage (2D classifier + live boundary + net), to be **re-registered as a dark lab instrument**, not copied.
- **Visual Cinnamon / Nadieh Bremer** — spectral color + radial glow (signature graphics register).
- **Truth & Beauty / Moritz Stefaner** — editorial rigour + calm chrome.
- **Giorgia Lupi** — hand-feel / legend-as-art accent.
- Borrow-recipe zones (`dustin-dataviz-borrow-recipe`): Stefaner = frame · Bremer = hero mark (glow) · Lupi = legend/key.
- **Sibling:** Cascade spec (`Projects\Cascade\.claude\plans\2026-07-23-cascade-design.md`) — inherit its aesthetic system.

## 12. Open items (resolve before/within build)
- **Model engine** — ✅ locked, ticket 02 (hand-rolled MLP).
- **Hero look** (palette hexes, boundary/net/curve treatment, layout) — ✅ locked, ticket 01.
- **On-ramp beats + copy** (final wording, when the boundary snaps) — ✅ locked, ticket 03 (§4).
- **NAME** — ✅ **locked, ticket 05 = `By Example`** (repo `dustincole-data/by-example`, `byexample.dustincoledata.com`). Beat the object-family names (*Seam · Boundary · Descent · Fit · Separatrix*) because **the aha is the act, not the artifact** — "you never wrote a rule" is what Teachable Machine and TF Playground don't say — and beat the act-family alternates (*Induction · Supervised · Label · Point Made*) because it **states the thesis, not the category**, in the zero-jargon register of Namesake / Cascade / Meaning Map / Where America Moves. Collision-clear; the *"X by Example"* docs genre is a known, accepted echo.
- **Preset datasets** (which shapes) + final `H` + sandbox lr — ✅ locked, ticket 04 (§5, §5.1).
- **Logo / favicon / share-OG** — deferred (Namesake/Cascade pattern); **a BUILD task** — the name now fixes it. Static OG image only (§6).

### 12.1 Locked strings (ticket 05) — use these verbatim

| Slot | String |
|---|---|
| Repo | `github.com/dustincole-data/by-example` |
| Domain | `byexample.dustincoledata.com` (hyphenless sub; kebab repo) |
| Stage title | `By Example` + mono `2→8→1 MLP · tanh · gradient descent` |
| `<title>` / OG / meta / repo description / `/projects` card | **"Drop labeled points. Watch a machine find the rule."** — meta appends *"A real 2→8→1 neural net, trained live in your browser."* |

**Thesis discipline:** none of the above spends §4.6's *"You give the examples. The machine finds the rule. That's all training is."* — that line generalises **once**, in-app, over the machine the user just taught.

**✅ No open decisions remain. This spec is COMPLETE and goes to BUILD.**

---

## 13. Look-study brief (for ticket 01)
Deliver a single static HTML with **two directions** of the dark instrument, each showing: (a) a **frozen mid-training frame** — the boundary field with a soft diverging confidence heatmap + bright p=0.5 line + crisp example points (a shape with a slight bend, so the boundary reads as *learned*, not linear); (b) the **mechanism net** (small fixed MLP, neurons glowing by activation, edges by weight); (c) the **training curve** (accuracy↑/loss↓ vs epoch, annotation off the line, mono axes); (d) the **control bar** (+A/+B brushes, Train/Pause/Step/Reset/Clear, learning-rate) + one small Archivo heading + mono readouts. Vary the two directions on **glow intensity / chrome weight / net-panel prominence / plot treatment** — NOT on the locked fundamentals (dark stage, small Archivo type, CVD-honest cool-A/warm-B poles, labels-off-lines, no AI-demo cliché). Fold in: CVD-validate the palette (`validate_palette.js`); confirm 60fps confidence-field repaint; confirm mono. Dustin picks one (or a graft) → the visual lock for Phases 1–4, fed back into §1 + §3.
