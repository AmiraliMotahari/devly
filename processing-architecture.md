# File / PDF / Image processing architecture

Plan for the "rewrite from the ground up" item. **No code yet** — this
is the design step, per the repo's own rule ("design the architecture and
before you start it ask me for the tech stack").

## What "real architecture" means here

The Advanced Image Editor already has the target shape. Copy it:

| Editor (done) | Why it matters |
|---|---|
| Typed, serializable model (`types/editor.ts`) | The model can be validated, snapshotted and tested without a DOM |
| Pure processing modules (`processing/*.ts`) | Geometry, adjustments and export are unit-testable in isolation |
| Resources outside React state (bitmap registry) | Undo/redo stays cheap; bitmaps have one owner and one release path |
| One shell, many panels | Modes share the canvas, the layer list and the export dialog |
| Errors funnel through one mapper (`friendlyError`) | No raw library errors reach the user |

The file/PDF/image tools have the first three nowhere: **16 separate
`createImageBitmap` call sites** across the image tools alone, each
re-implementing decode → canvas → draw → encode, and every tool
re-implements its own progress, error and download handling.

## Current state (measured)

| Domain | Tools | State |
|---|---|---|
| Image (simple) | 11 | Boilerplate per tool: decode, canvas, draw, encode, progress, download. The shared `image-encode` helper now covers encoding only. |
| Image (advanced) | 1 | Target shape: `editor/` + `processing/` + `types/` |
| PDF | 8 | Each tool owns its pdf-lib/pdfjs wiring; `pdfjs.ts` shares the worker but not the pipeline |
| File | 6 | Each tool owns its zip/crypto wiring; `encrypted-archive.ts` is the only shared piece |

## Target: one pipeline per domain

```text
src/tools/<domain>/processing/
├── model.ts        # typed input/output contracts (what a tool gets, what it returns)
├── pipeline.ts     # decode → transform → encode, with progress + cancellation
├── errors.ts       # domain errors → one friendly mapper
└── <operation>.ts  # one file per operation (rotate, split, compress …), pure
```

Every tool becomes: **UI (input/output) + one call into `pipeline.ts`**.
No tool touches `canvas`, `createImageBitmap`, `pdf-lib` or `pdfjs` directly.

### File domain (smallest, do first)

- `model.ts` — `ArchivePlan` (entries, password, method), `FileReport` (hashes, metadata)
- `pipeline.ts` — `createArchive`, `extractArchive`, `inspectFile`
- Tools keep their UIs; only the body moves.

### Image domain

- Move the shared decode/encode/draw boilerplate that currently sits in
  each of the 11 simple tools into `processing/pipeline.ts`
  (`decodeToCanvas(file, {maxPixels})` → canvas + bitmap, `encodeCanvas`)
- The advanced editor keeps its own modules — it is already there.

### PDF domain (biggest, last)

- `model.ts` — `PdfPlan` (page range, rotation, quality), `PdfReport`
- `pipeline.ts` — `loadPdf`, `applyPlan`, `renderPages`
- One place that knows about pdf-lib and pdfjs; tools only describe plans.

## Migration order (each step is shippable and independently valuable)

1. **File** — 6 tools, one shared pipeline (~2 days)
2. **Image (simple)** — 11 tools, collapse the decode/encode boilerplate (~3 days)
3. **PDF** — 8 tools, pdf-lib/pdfjs behind one module (~5 days)
4. **Cross-cutting** — shared `ToolResult`/download/progress contract so
   every domain reports progress and errors the same way

Each step ends with: unit tests for the new module, the existing E2E
tests unchanged (they are the regression net), and the tools reduced to
UI + one call.

## Definition of done

- No tool file imports `pdf-lib`, `pdfjs-dist`, `jszip` or calls
  `createImageBitmap` directly
- Every tool's progress, cancellation, error and download behaviour
  comes from the shared pipeline
- New operations are added as a `processing/<operation>.ts` module plus
  a thin tool — not as a new copy-pasted tool

## Open questions (need your call before coding)

1. **Scope** — do all three domains, or file + image first and PDF after?
2. **Stack for the V5 server phase** — this plan is client-only; if the
   same pipelines should also run server-side (per the V5 item), the
   module boundaries above stay the same but the runtime differs
   (workers/queues). Which stack?
3. **Dependency policy** — the file domain wants `jszip`/`pako` (already
   in), the PDF domain wants `pdf-lib`/`pdfjs-dist` (already in). Keep
   those, or are you open to a different archive/PDF library?
4. **Deprecations** — should the old per-tool implementations be deleted
   in the same change, or kept behind a flag for a release?

## Related, smaller items from the same backlog

- **Upload UX** — the canonical TODO says `react-upload-zone` is an
  *implementation option, not a product feature*. The house
  `UploadZone` already does drag/drop, paste, previews, size/type
  validation and removal. The cheap win is adding the two capabilities
  it lacks (directory upload, retry) to the existing component; the
  library swap would rewrite the upload path of ~30 tools for the same
  end state.
- **Zod** — its first real job is client-side upload validation
  (canonical TODO, "Upload system"). In a client-only app there is
  little else to validate; the server phase (V5) is where Zod earns its
  keep (forms, API payloads).
