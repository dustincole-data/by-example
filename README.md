# By Example

**Drop labeled points. Watch a machine find the rule.**

A playable ML instrument: you give a machine examples, and it learns the rule in front of you.
Click to drop class-A / class-B points on a dark field, press Train, and watch a real
`2→8→1` neural net bend its decision boundary to fit them while accuracy climbs and loss falls.

Live at **[byexample.dustincoledata.com](https://byexample.dustincoledata.com)**.

## The point

You never wrote a rule. You gave examples, and the machine found the rule itself — and you
watched it happen. That is what training is, made visible and playable.

## It's real ML, not a simulation

- Hand-rolled MLP `2 → 8 → 1`, tanh hidden + sigmoid output, binary cross-entropy,
  full-batch **gradient descent**. ~150 lines, zero dependencies ([src/lib/net.ts](src/lib/net.ts)).
- Accuracy, loss, epoch and the boundary are computed from the actual model. Nothing is
  scripted or faked. The mechanism-net panel draws the model's **real** weights and activations.
- Seeded `mulberry32` init + fixed training order → runs are bit-for-bit reproducible.
- The confidence field is a forward pass over a coarse grid each epoch → `ImageData` upscale
  + marching-squares `p=0.5` contour, canvas 2D (~5–9 ms/epoch). No WebGL.

Everything runs **in your browser**. No server, no API, no telemetry, no build-time data.

## Presets

A genuine easy → aha → hard ladder. Every one fits on all 8 seeds
(train accuracy ≥ 0.98 **and** ≥ 0.95 on 400 held-out points) — verified in
[src/lib/presets.test.ts](src/lib/presets.test.ts).

| # | Preset | What it teaches |
|---|--------|-----------------|
| 1 | **two blobs** | Linearly separable — a straight boundary suffices. |
| 2 | **XOR** | The canonical *a line cannot do this*; the hidden layer earns its keep. |
| 3 | **circles** | A **closed** boundary — the net wraps a ring around the inner class. |
| 4 | **moons** | A curved seam threading two arcs. Reads most like "it learned a shape". |

## Accessibility

Keyboard-operable throughout: tab into the field for a crosshair (arrows move · Enter drops ·
`A`/`B` switch brush). The coach strip is `aria-live`. Under `prefers-reduced-motion` Train
renders the final boundary instantly — no information is conveyed by motion alone, and the
training curve still plots the whole descent.

## Develop

```bash
npm install
npm run dev       # http://localhost:4321
npm test          # 56 tests — engine, presets, pacing, palette, copy
npm run build     # static output to dist/
```

Astro (static) + TypeScript + Vitest, Node 22.

---

Built by [Dustin Cole](https://dustincoledata.com).
