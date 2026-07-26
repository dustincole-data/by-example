# By Example

**Tap anywhere. It figures out the rule.**

A playable ML instrument, one screen and one gesture: tap the field to drop a peach, say
whether it was ripe, and a real `2→8→1` neural net re-draws its boundary in front of you.

Live at **[byexample.dustincoledata.com](https://byexample.dustincoledata.com)**.

## The point

You never wrote a rule. You gave examples, and the machine found the rule itself — and you
watched it happen. That is what training is, made visible and playable.

The field is `how sweet` × `how soft`, so the axes mean something before you read a word:
the six examples it opens with already teach *sweet + soft = ripe*, which is the rule you
believed about fruit anyway. There is no tour, no Train button and no modes. Training is
continuous — the boundary re-settles on its own after every example.

## It's real ML, not a simulation

- Hand-rolled MLP `2 → 8 → 1`, tanh hidden + sigmoid output, binary cross-entropy,
  full-batch **gradient descent**. Zero dependencies ([src/lib/net.ts](src/lib/net.ts)).
- The boundary, the counts and the net glyph's weights and activations are all read off the
  live model. Nothing is scripted or faked.
- Seeded `mulberry32` init + fixed training order → runs are bit-for-bit reproducible.
- The confidence field is a forward pass over a coarse grid → `ImageData` upscale +
  marching-squares `p=0.5` contour, canvas 2D. No WebGL.

Everything runs **in your browser**. No server, no API, no telemetry, no build-time data.

## Three things that are load-bearing, not taste

Each was measured, and each looks like a bug if you "fix" it:

1. **L2 weight decay** (`WD` in [src/lib/net.ts](src/lib/net.ts)) is what makes continuous
   training viable. Without it every tap drives `|w|` up until confidence saturates: the
   field flattens to two flat poles, the marks vanish into ground of their own colour, and
   the boundary stops visibly moving.
2. **`FIELD_MAX` and `LOOK.bloomAlpha` are pinned together** ([src/lib/field.ts](src/lib/field.ts)).
   A settled mark always sits on ground of its own hue, and saturation is absent from the
   WCAG contrast formula — only the ground's luminance can separate them. Raising either
   number breaks the 3:1 gate on the orange class first. Measure on a *used* field: at the
   six seeds it reads a false pass.
3. **Both axis labels end in `→`, including the vertical one.** The Y label renders
   `rotate(-90deg)`, which maps the text's own +x onto screen-up, so `→` renders as an up
   arrow and `↑` would render pointing left.

## Accessibility

The field is a real control, not a picture: `Tab` to it, arrow keys move a visible crosshair
(`Shift` for fine), `Enter` drops a peach and moves focus to the label pair, `Enter` again
labels it, `Escape` cancels. The canvas carries a written description of the picture, which
doubles as the no-canvas fallback. Status, prompt and captions are live regions.

Under `prefers-reduced-motion` the boundary lands instantly and the previous line is held
dashed for ~1.8 s, captioned — the change is legible with zero movement.

## Develop

```bash
npm install
npm run dev       # http://localhost:4321
npm test          # 56 tests — engine, field, seeds, pacing, palette, copy
npm run build     # static output to dist/
```

Astro (static) + TypeScript + Vitest, Node 22.

---

Built by [Dustin Cole](https://dustincoledata.com).
