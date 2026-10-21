# Advanced Image Editor + Image Encoding — Task Tracker

Update this file after each step (`[✓]` done · `[•]` in progress · `[ ]` todo).

---

# Part 2 — WebP encoding on Safari/iOS (active)

**Bug**: PNG→WebP and JPG→WebP produce a **.png** file on Safari iOS.

**Root cause (verified)**: WebKit (all Safari versions, incl. iOS) does not
implement WebP *encoding* in `canvas.toBlob()`. It does not throw — it
silently returns a **PNG** blob. Every image tool that encodes WebP is
affected (converters, compress, resize, crop, rotate, flip, filters,
watermark, social optimizer, editor export).

**Fix strategy**: encode natively first, then **verify the produced bytes**
(magic bytes: `RIFF….WEBP` / `FFD8FF` / `89504E47`); if the browser lied
(Safari), fall back to a real WebP encoder — `@jsquash/webp` (WASM libwebp,
client-side, already on the roadmap in todo.md) — and never emit a
mislabeled file.

- [✓] Install `@jsquash/webp` (+ `wasm-feature-detect`) as a dependency
- [✓] Fix latent type-check break: jest-dom v7 augments `vitest`, but
  Vitest 4 declares `Assertion` in `@vitest/expect` → added
  `tests/setup/jest-dom-matchers.d.ts` + pinned `@vitest/expect` devDep.
  (A stale `tsconfig.tsbuildinfo` was hiding this on every clean install.)
- [ ] Shared encoder `src/lib/image-encode.ts`:
  - native `toBlob` → magic-byte verification of the result
  - WebP fallback via dynamic `import("@jsquash/webp")` (lazy chunk, only
    loaded when the browser lacks native WebP encoding)
  - friendly, actionable error when neither path works
  - pure helpers (`detectImageFormat`) so they are unit-testable
- [ ] Wire the encoder into every `canvas.toBlob` call site:
  `src/tools/image/{shared,compress-image,crop-image,flip-image,
  image-filters,image-watermark,resize-image,rotate-image,
  social-image-optimizer}.tsx` + editor `src/tools/image/processing/export.ts`
- [ ] Unit tests (`tests/unit/lib/image-encode.test.ts`):
  format detection per magic bytes; Safari-style fallback (mock `toBlob`
  returning PNG) → WASM encoder used; WASM failure → friendly error;
  native path untouched when the browser encodes correctly
- [ ] E2E tests: PNG→WebP + JPG→WebP assert **RIFF/WEBP magic bytes** of
  the downloaded file, tagged `@critical` so they also run on WebKit
  (Safari engine) — the check that would have caught this bug
- [ ] Verify WebKit behaviour (does Playwright's WebKit fall back to PNG?)
  to confirm the `@critical` test exercises the fallback path
- [ ] Docs: TESTING.md (suite counts, fixtures), todo.md (@jsquash/webp item)
- [ ] Verify: `pnpm lint`, `pnpm type:check`, `pnpm test`, `pnpm test:e2e`,
  `pnpm build` — all green

---

# Part 1 — Advanced Image Editor (complete)

## P0 — Render correctness (ALL DONE)

- [✓] P0-RENDER: Filter-preset condition in `renderImageLayer` uses
  `!isDefaultAdjustments(composed)` — presets now render
  (src/tools/image/processing/render.ts:301)
- [✓] P0-RENDER: Single `roundRect` clip wraps background AND layer loop;
  border frame drawn after, unclipped (render.ts:189–241)
- [✓] P0-RENDER: Pixel pass runs on an offscreen layer canvas sized by
  renderScale (rotation/flip safe); `fast` skips only `unsharpMask`
  (render.ts:312–353, skipSharpen flag)
- [✓] P0-RENDER: Pixel-assertion E2E — filter delta, corner-radius alpha,
  border color at edge, solid.png fixture (tests/e2e/image-editor.spec.ts)

## P0 — Leaks / perf (ALL DONE)

- [✓] P0-LEAKS: ExportFile no longer carries `previewUrl`; ExportDialog
  creates blob URLs via `useObjectUrls` (revoked on mount/close)
- [✓] P0-LEAKS: `roundCollageCells` uses LOCAL scratch store + `subs` map,
  released by caller (export.ts:338–398)
- [✓] P0-LEAKS/P0-PERF: CollagePreview renders via buildCollageProject +
  renderCollageProject at preview scale, rAF-batched, releases scratch in
  `finally` (advanced-image-editor.tsx:850–895)
- [✓] P0-PERF: `fast: state.ui.transientSession` wired in EditorCanvas draw
  (editor-canvas.tsx:118)

## P1 — Done items (verified)

- [✓] P1-SPLIT: Split-region overlay drawn on canvas (dashed outlines +
  index labels; `splitRegions` prop, editor-canvas.tsx:121–145)
- [✓] P1-CROP: `cropAspectValue` → `applyAspectToCrop` during crop drag
  (editor-canvas.tsx:447–450); canvas→source mapping via layer-local
  transform with rotation%90 guard + disabled Apply with note
  (advanced-image-editor.tsx:280–317)
- [✓] P1-CROP: Atomic `crop-canvas` reducer action — target crop/box/pos,
  origin-delta shift for other layers, canvas resize, single history entry,
  overlay re-anchor (state.ts:241–269)
- [✓] P1-INTERACT: Pan (space+drag editor-canvas.tsx:247, middle-drag
  :247–259), pinch zoom 2-pointer (:226–244, :341–357), ctrl-wheel
  zoom-at-cursor with scroll anchoring (zoomAt :503–544)
- [✓] P1-INTERACT: Double-click text layer → select + focus Content input
  (editor-canvas.tsx:607–616; focus ref in properties-panel TextPanel)
- [✓] P1-IMPORT: Editor-wide clipboard paste (window paste listener,
  skips focused inputs) + re-import dedupe by file signature
  (name+size+lastModified — File identity proved unstable across re-drops)
- [✓] P1-GAPS: Split custom draggable guides (splitRegionsFromGuides /
  normalizeGuides / nextGuidePosition pure fns + canvas drag handles +
  panel controls)
- [✓] P1-GAPS: Merge order controls + "Open in editor" (buildMergeProject);
  collage slot swap (swap-collage-slots action)
- [✓] P2-GAPS: Split >3 files → single ZIP (JSZip)

## P2 — Cleanup (done)

- [✓] P2-CLEANUP: Registry reconcile (history-union + collage slots,
  idempotent); TextLayer resize junk removed; friendlyError() wrapper
  everywhere; downscale notices as separate neutral alert
- [✓] P2-GAPS: Text/Elements modes enabled without images + "Start a text
  design" entry; tablet layout (3-panel lg / sheet md) via useMediaQuery
- [✓] P2-GAPS: Straighten slider in Crop mode (±15°, base rotation +
  canvas auto-size via straightenCanvasSize)

## Tests — Part 1 (done)

- [✓] Unit: crop-canvas reducer, swap-collage-slots, registry reconcile,
  friendlyError, split guides math, MergePanel/CollagePanel/SplitPanel
  components → 370 unit tests green
- [✓] E2E: split overlay + guide count flow, crop aspect lock, re-import
  dedupe, pan smoke, text-only design, merge order + open-in-editor
  → 196 E2E green (all browsers)
