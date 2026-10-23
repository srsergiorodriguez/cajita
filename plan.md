# cajita — active sprint

Status: **S30 complete — field aliases, single-file parity, rollback, theme cleanup** · 2026-10-23.
S0 shell. S1 projects. S2 canvas. S3 links/map/fichas. S4 export/preview.
S5 GitHub Pages. S6 page size. S7 metadata/SEO. S8 video/sound. S9 transitions.
S10 media/embeds. S11 shapes. S12 fichas. S13 CSV. S14 movable. S15 table/card.
S16 CSV updates/grid. S17 inline table. S18 persistence. S19 schema order/images.
S20 ZIP collections. S22/S24 export options/worker. S23 ficha preview/schema/media
fixes. S25 reset, media filters, copy/cut/paste, language toggle, p5, live page thumbnails,
polygon masks, styled audio, favicon. S26 narrow add palette, split bottom bar, inspector hierarchy, custom stage sizes,
home link, mask fit, ficha front. S27 project thumbnails, localized type tags, non-scaling stage resize, static asset
info, proportional mask editor with nodes and granular undo. S28 content-space
mask mapping, natural-aspect mask canvas, no sprint number in About.
Ficha light/dark, dark default, 120% interface scale. Spanish default.

---

## Sprint S25 — interaction polish and p5

**Goal:** close the friction found in real testing and add the p5 sketch element.

### Status

| Area | State |
|---|---|
| Preview reset control | fixed |
| p5 preview loading | fixed (`embedSrc` ignored p5) |
| Audio player frame/contrast | fixed |
| Left sidebar one-column / bottom media half | done |
| Ficha bring-to-front while moving | done |
| “recortar silueta” visibility | fixed |
| Media filters for video/audio | done |
| “importar” toolbar label | done |
| Element/media copy-cut-paste shortcuts | done |
| Language toggle | done |
| p5 embed element | done |
| Plain rectangle favicon | done |
| Single bottom page strip with real thumbnails | done |
| Polygon lasso image masks | done |
| Styled exported audio player | done |
| Ficha preview image assets | fixed earlier in S23 |
| Tests | **141 passing** |
| `npm run verify` | green |

### Checklist

- [x] Preview toolbar has “reiniciar fichas” for movable pages with fichas.
- [x] Reset also works through event delegation in the exported runtime.
- [x] Media manager filters: todos, imágenes, video, audio, fichas, sin usar.
- [x] Medios import label is just “importar” / “import”.
- [x] Cmd/Ctrl+C, X, V copy/cut/paste selected elements.
- [x] A copied media asset can be pasted as an image/video/audio element.
- [x] Paste handles duplicate headings without failing validation.
- [x] Language is a globe toggle like the light/dark button.
- [x] p5 provider accepts editor.p5js.org `.../full/<id>` URLs.
- [x] p5 has its own toolbar button/iframe provider.
- [x] Favicon is a cream rectangle on the dark theme background, no ornaments.
- [x] Page thumbnails render real content from each page.
- [x] The redundant left page list is gone; pages live in the bottom strip.
- [x] Image masks support a polygonal lasso and clip images in canvas/export.
- [x] Audio exports with a custom play/progress player and noscript fallback.
- [x] Paste has a single handler, avoiding duplicate pastes.
- [x] p5 preview iframe renders; `embedSrc` handles p5.
- [x] Left sidebar contains only one-column add buttons; bottom bar splits pages/media.
- [x] Moved fichas are raised above other elements during/after drag.
- [x] Mask action is visible in the image inspector.
- [x] Audio player uses one frame, square dark play control, progress/time.

### S25 outcome

- `npm run verify`: 0 svelte-check errors/warnings, **141 tests**, build succeeds.
- Bundle JS ~127.1 KB gzipped; CSS ~13.5 KB gzipped.
- Manual: reset in preview restored authored positions; copied/pasted a text
  element and a media asset; inserted and previewed the p5 sketch; opened the
  updated media manager filters; checked real page thumbnails; verified the new
  sidebar/bottom layout; audio player and mask dialog checked.

---

## Notes on ficha size/movement

- Editor stage is zoomed to fit; preview/export show the stage at page scale.
- Small HTML export keeps fichas fixed. Full ZIP preserves movable fichas,
  persistence, and reset.
- GitHub Pages always publishes the full site.



---

## Sprint S26 — inspector and shell coherence

**Goal:** make the right sidebar and shell self-explanatory and consistent.

### Status

| Area | State |
|---|---|
| Design system label hierarchy | done |
| Element section order / actions | done |
| Page actions section | done |
| Add-tile component reused | done |
| Narrow one-column add palette | done (168px) |
| Pages/media split bottom bar | done |
| Rotated Páginas / Medios labels | done |
| Click cajita wordmark → library | done |
| Custom stage size on creation | done |
| Mask dialog fits entire image | done |
| “recortar silueta” visibility | fixed earlier |
| Site theme explanation | hint added (it affects export/preview) |
| Tests | **141 passing** |
| `npm run verify` | green |

### Design-system assessment

- **Category labels** (`Section`): strong uppercase, tracked, `--label-category-*`.
- **Parameter labels** (`Field` / `.param-label`): lowercase, small, muted,
  `--label-param-*`. This fixes the “everything looks like a category” problem.
- **Element order is now consistent:** content → position/size → link → metadata →
  actions.
- **Element actions:** duplicate spans the row; front/back share a row; delete is
  separated below a rule.
- **Page actions** moved out of details into their own section.
- **AddTile** is shared by page creation and media import; both are dotted boxes.
- Sidebar is 168px with 143px buttons, one column.

### Outcome

- `npm run verify`: **141 tests**, 0 svelte-check warnings; build succeeds.
- JS ~127.9 KB gzip; CSS ~13.7 KB gzip.
- Screenshots: `s26-final-layout.png`, `s26-mask.png`, `s26-custom-size.png`.
- Home wordmark click and custom stage fields tested in the browser.

### Theme decision

`Tema del sitio` is not decorative: it sets the exported/preview palette. Kept,
renamed to “tema del sitio exportado”, with a hint.



---

## Sprint S27 — content-aware cards and mask editing

**Goal:** make project cards and inspectors show the actual project, and make
page/mask edits predictable.

### Status

| Area | State |
|---|---|
| Project card thumbnail = Inicio miniature | done |
| Localized element/asset type tags | done |
| Stage resize leaves elements in place | done |
| Read-only asset inputs → static definition list | done |
| Mask editor image fit / WYSIWYG mapping | done |
| Mask node dragging / merge / undo / redo | done |
| Page resize test | updated |
| Tests | **141 passing** |
| `npm run verify` | green |

### Checklist

- [x] Project cards load the start page and render `PageMiniature`.
- [x] Cards keep the stage aspect ratio.
- [x] Inspector stamps use localized type labels: Imagen, Texto, Video,
      Sonido, Forma, Ficha, P5, YouTube, Observable.
- [x] `resizeStage` only changes the stage frame; element frames/fonts stay put.
- [x] Media details are a definition list, not editable-looking readonly inputs.
- [x] Masked images use `contain` consistently in editor, preview, export, and
      thumbnails; mask points match the fitted image.
- [x] Mask canvas supports node dragging, nearby-node merge, granular undo/redo,
      clearing, and full-image fitting.

### S27 outcome

- `npm run verify`: **141 tests**, 0 svelte-check warnings; build succeeds.
- JS ~128.8 KB gzip; CSS ~13.7 KB gzip.
- Screenshots: `s27-project-thumbs.png`, `s27-asset-info.png`,
  `s27-mask-nodes.png`.
- Browser checks: start-page thumbnails, localized “IMAGEN” stamp, asset info
  without inputs, and a four-node mask draft.

### Note on positioning

Editor and preview element boxes were measured as the same normalized
percentages. The remaining apparent scale difference is the editor fitting the
stage into a smaller viewport; page resizing no longer moves elements.



---

## Sprint S28 — content-space masks and copy cleanup

**Goal:** validate the user-supplied project and fix the remaining mask/copy issues.

### Status

| Area | State |
|---|---|
| Imported `.cajita` project test | done |
| Ficha overlap after reset | confirmed user error, no code change |
| Mask dialog fit | natural image aspect |
| Mask points ↔ image content | mapped through the contained frame |
| Masked image rendering | contain in editor/preview/export/thumbnails |
| About sprint number | removed |
| Tests | **141 passing** |
| `npm run verify` | green |

### What changed

- Mask points are stored in frame percentages but edited in the image content
  box. On open, frame points are converted into the content box; on save they
  convert back.
- The mask canvas uses the image’s **natural aspect**, not the element frame
  aspect, so the modal contains the whole image without letterboxing.
- If asset dimensions are missing, the image’s `naturalWidth`/`naturalHeight`
  determine the aspect.
- Masked images use `contain`, so editor/export/thumbnail masks match the modal.
- `app.version` is now “Versión 0.1” with no sprint number; the library header
  is just “cajita”.
- The ficha overlap was caused by moving fichas and then using reset; reset
  restored the authored layout correctly.

### Outcome

- `npm run verify`: **141 tests**, 0 svelte-check warnings.
- JS ~129.1 KB gzip; CSS ~13.7 KB gzip.
- Screenshots: `s28-user-editor.png`, `s28-user-mask-fixed3.png`,
  `s28-mask-result.png`.



---

## Sprint S29 — tutorial modal

**Goal:** make cajita self-explanatory without a separate manual.

### Status

| Area | State |
|---|---|
| Tutorial entry points | library + topbar help |
| Tutorial modal | done |
| Example project for screenshots | built and exercised |
| Project / media / canvas / embeds / map | screenshot |
| Fichas / preview / export / publish / settings | screenshot |
| Tests | **142 passing** |
| `npm run verify` | green |

### Tutorial content

- `TutorialDialog` uses the shared `Dialog`, `TUTORIAL_STEPS`, and the current
  locale.
- Ten steps: project, media, canvas, p5/Observable embeds, pages/map, fichas,
  preview, export, publish, settings.
- Screenshots live in `public/tutorial/` and are checked by
  `tests/tutorial.test.js`.
- The example project uses `forTutorial/` images, video, sound, the Observable
  cell, and the p5 sketch. The raw 28 MB media folder is gitignored; only the
  app-ready tutorial screenshots ship.

### Outcome

- `npm run verify`: **142 tests**, 0 svelte-check warnings.
- JS ~138.9 KB gzip; CSS ~14.6 KB gzip.
- Screenshots: `s30-tutorial-top.png`, `s30-tutorial-bottom.png`.

---

## Deferred / next

- Live GitHub Pages smoke test with fichas, persistence, reset, and p5.
- Media cut semantics (currently cut copies media; element cut removes).
- Publish history rollback.

---

## Working agreement

- One task at a time from this file; check it off in the same change that
  completes it.
- Read `diary.md` before starting a task; append to it after finishing one.
- Every document mutation goes through a command; every platform call goes
  through an interface; every UI string goes through `t()`.
- `npm run verify` before “done”.
- Do not silently diverge from `architecture.md`; amend and record it.
