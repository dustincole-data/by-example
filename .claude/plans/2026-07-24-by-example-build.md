# By Example — build log (Phases 1–4)

Built 2026-07-24 from the FINAL spec [2026-07-23-teach-a-machine-design.md](2026-07-23-teach-a-machine-design.md) §8.
Reference impls ported (not redesigned) from `.scratch/teach-a-machine/assets/` 01 (look) · 03 (on-ramp) · 04 (presets).

## Status

| Phase | State |
|---|---|
| 1 · Scaffold + shell | ✅ Astro static, Node 22, default `outDir`, `site=byexample.dustincoledata.com`, tokens/global CSS, self-hosted fonts |
| 2 · Instrument end-to-end | ✅ engine + field + net + curve + readouts, verified live in-browser |
| 3 · On-ramp + sandbox | ✅ 3 beats → thesis → sandbox, 4 presets, keyboard + reduced-motion |
| 4 · Ship | ⏳ built + committed locally; **GitHub repo + Vercel + DNS not yet done** (awaiting go) |

## The two required deletions (done + regression-tested)

- `<h2>Teach a machine</h2>` → `<h1>By Example</h1>`. `grep -ri "teach a machine\|teachable" dist/` is clean.
  Locked in by [src/lib/copy.test.ts](../../src/lib/copy.test.ts) — it fails if the retired title reappears in any shipped string.
- **Spiral preset button + generator deleted.** Roster is exactly `two blobs · XOR · circles · moons`;
  a test asserts no `spiral`/`swirl` key survives.

## What changed vs the reference prototypes (and why)

1. **Wall-clock-exact playback.** The prototype accumulated per-frame `dt` (clamped at 50 ms) and drifted
   ~32% long — spec §4.4's build note measured the snap at ~2.1 s instead of ~1.4 s. The epoch is now a pure
   function of elapsed time, so a slow frame drops an epoch rather than stretching the run.
   **Measured: snap at 1422 ms** (spec target ~1.35–1.44 s); reference on the same input: 1614 ms.
   The spec's fallback (throttle the field repaint to every 2nd epoch) was therefore not needed.
2. **lr slider range 0.05–3.00** (reference capped at 1.0, which cannot express the locked sandbox default 1.5).
   Revealed at 1.5 on hand-off **without retraining** — the taught machine is untouched, only the next Train is faster.
3. **Field grid cache** keyed on `(modelGen, epoch)`. Caching on epoch alone shipped a real bug (below).
4. **`mountInstrument(root, reduced?)`** — the reduced-motion flag is injectable so the no-motion path can
   actually be driven in a test. Production behavior unchanged.

## Bug found in build (caught by screenshot, not by code review)

**Stale boundary on preset switch.** The field's grid cache keyed on the epoch alone. Switching presets goes
240 → 240, so the cache hit and the *previous* model's boundary was redrawn under the new points — XOR showed
`accuracy 1.00` with orange points sitting in teal territory. Same class of miss as Climate Fingerprint's d3
arc bug: verbatim review passed, the picture did not. Fixed by bumping a `modelGen` counter in the single
`fit()` helper that every retrain now routes through.

## Verified live in-browser (dev + production bundle)

- Beat 1 gate (3+3, live `(n/3)` counter, `{n}` substitution) · Beat 2 snap + payoff · Beat 3 **stale boundary**
  (dropping the intruder does NOT retrain: epoch/loss unchanged, examples 6→7) · thesis inline takeover, no modal,
  field stays visible · hand-off (coach + badge removed, intruder ring cleared, lr revealed 1.50, sandbox controls shown).
- All four presets fit at lr 1.5 — **XOR renders two crossing seams**, circles renders a closed ring (§9 acceptance).
- Keyboard: crosshair, Enter drop, A/B brush, whole Beat 1 completable with no mouse. Coach is `aria-live="polite"`.
- Reduced motion: copy swaps, Train renders the final boundary instantly, no descent, no pulse.
- Mobile 390px: no horizontal overflow, panels stack.
- Console clean. 56 unit tests, `astro check` 0 errors.

## Known / flagged, NOT changed (locked look — port, don't redesign)

- **Field saturation.** With few well-separated points the model is confident nearly everywhere, so both poles
  render near-max and the crisp example points can vanish against their *own* pole. Verified **bit-for-bit
  identical to the locked reference** (same pixels, same epoch 22, loss 0.015) — it is honest model output, not
  a port error. Worth a look-tweak decision if it bothers you (a lower `fieldGamma` or dialled-back bloom would
  restore more dim midband), but that reopens the ticket-01 lock so I left it alone.
- The `TRAINING CURVE` panel tag overlaps the 100% gridline at narrow panel widths. Present in the reference too.

## Deploy — remaining (Phase 4)

1. Create public repo `github.com/dustincole-data/by-example`, push `main`.
2. Vercel: import repo, Node 22, framework Astro, 100% static. Do **not** proxy through the main site.
3. DNS: CNAME `byexample` → Vercel. (Namesake/WAM gotcha: if the cert stalls, remove + re-add the domain via the API.)
4. Live-verify: on-ramp beats, train loop, presets, reduced-motion, OG unfurl.
5. Separate site session: add the `<ProjectCard external>` on dustincoledata.com `/projects` (§6, out of scope here).

## OG image

`public/og.png` — 1200×630, captured from the real instrument in the pre-trained `moons` sandbox
(the Skip destination, §4.7). Static image only, no `@vercel/og` edge function.
