# cajita — testing boundaries

Status: **proposal v0.32** · 2026-10-23. S28 has 141 pure tests.

This file is a set of directives, not a suggestion. If a test does not fit the
rules below, do not write it; write a pure function and test that instead.

---

## 1. The one rule

**Test the model and the bytes it produces, never the pixels.**

cajita is a visual tool, but visual correctness is verified by looking at it.
Automated tests protect the data model, the geometry math, the serialisers, the
export output, and the publishing payloads. They do not protect "does the toolbar
look right at 1280 px", and they should not pretend to.

A useful bug fix looks like this:

1. Reproduce the bug by eye (or with a fixture).
2. Find the pure function that produced the wrong number/markup.
3. Add a failing test for that function.
4. Fix it.
5. Verify the visual result manually.
6. Append the fix and the reason to `diary.md`.

---

## 2. What is tested

| Module                       | What is tested                                  | Examples                                                                                                     |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `domain/project.js`          | creation, normalisation, migrations, validation | missing start page, duplicate slug, unknown version, invalid link target                                     |
| `domain/slugs.js`            | transliteration, uniqueness, reserved words     | "Sobre mí" → `sobre-mi`, collision → `sobre-mi-2`, `assets` rejected                                         |
| `domain/geometry.js`         | frames, rotation, resize, snapping, stage fit   | rotated resize from each handle, min size, normalise −180/180, grid cell rects                               |
| `domain/links.js`            | graph projection, orphans, broken links         | self-link, duplicate links, deleted target, start page never orphan                                          |
| `domain/history.js`          | snapshots, coalescing, limits                   | one drag = one entry, redo cleared by a new command, max 40                                                  |
| `domain/text.js`             | escaping, line breaks, URL sanitising           | `<script>` escaped, `javascript:` rejected, `mailto:` allowed, newlines preserved                            |
| `domain/assets.js`           | hashing, file names, MIME, extension mapping    | same bytes → same name, accents/space slugified, unsupported type rejected                                   |
| `domain/assets/plan.js`      | import policy, dedupe, size limits, derivatives | GIF never re-encoded, WebP settings applied, 40 MP downscale, same hash reused, video count/total caps       |
| `domain/fonts.js`            | custom font validation and export               | max 2, 5 MB, unique names, used font cannot be deleted, @font-face paths, fallback                           |
| `domain/bundle.js`           | `.cajita` manifest, serialize/parse, validation | round-trip, missing asset, hash mismatch, path traversal, oversized archive, font assets                     |
| `domain/redirects.js`        | bounded redirect queue                          | max 5 FIFO, live slug wins, deleted target cleaned, start page target                                        |
| `domain/export/site.js`      | file tree, routes, relative paths, manifest     | start page at `index.html`, nested page paths, asset dedupe, no absolute paths, redirect stubs, custom fonts |
| `domain/export/html.js`      | semantic markup                                 | links, `alt`, `details`, `audio`, `lang`, headings, escaping                                                 |
| `domain/export/css.js`       | generated CSS values                            | percentages, `cqw` font size, rotation, fit modes, theme tokens                                              |
| `domain/export/fonts.js`     | used-font subset                                | only used families, `@font-face` path, fallback                                                              |
| `domain/publish/plan.js`     | diffing                                         | uploads/deletes/unchanged, first publish, empty remote, renamed asset                                        |
| `domain/publish/requests.js` | GitHub payloads                                 | blob/tree/commit/ref shapes, parent handling, Pages source                                                   |
| `i18n`                       | key parity, placeholders                        | missing key, extra key, `{count}` mismatch                                                                   |
| `styles/themes`              | mode token parity                               | same semantic keys in Ficha light/dark, no orphan values                                                     |
| `platform`                   | adapter contracts with fakes                    | repository round-trip, quota error, cancelled save, token isolation                                          |

### High-value cases (write these first)

- Stage resize scales every frame and preserves relative positions.
- Resizing a rotated element does not drift its centre or flip the box.
- Grid snapping never produces a negative or off-stage cell; spans clamp.
- Deleting a page removes inbound links and never leaves `startPageId` dangling.
- A link to a missing page is reported, not silently dropped at export.
- The exported start page is at `index.html`; every other page is at
  `<slug>/index.html`; relative asset paths are correct for both depths.
- Text with `<`, `&`, quotes, emoji, RTL characters, and newlines exports
  unchanged in content and safe in markup.
- A project with no pages fails export with `EXPORT_EMPTY`, not an empty ZIP.
- The same project + same assets produce byte-identical HTML/CSS (determinism).
- Importing a bundle never writes an asset before validation passes.
- A `.cajita` bundle round-trips title, pages, elements, links, metadata, and
  asset hashes; media is stored as binary files, not base64.
- A bundle with a missing asset, a hash mismatch, a `..` path, or an oversized
  archive is rejected before the current project is touched.
- Importing the same image twice creates one asset and two references.
- A GIF import keeps its original bytes; a JPEG/PNG import follows the WebP
  policy and produces a stable derivative setting key.
- Renaming a page after publish produces a redirect stub at the old slug; a later
  live page wins over a redirect with the same slug.
- The redirect queue keeps at most 5 entries, newest last, and drops the oldest
  first; deleting the target page removes its redirects.
- A project accepts at most 2 custom fonts; the third is rejected, a used font
  cannot be deleted, and the export writes the right `@font-face` for the used
  custom font only.
- Media caps are enforced by the pure planner: 3 videos, 100 MB total video,
  50 MB per file, 80 images, 20 audio files.
- Export and publish refuse a site over the hard size limit instead of uploading
  something GitHub will reject.
- GitHub publish of the first site creates a root commit and a `gh-pages` ref;
  the second publish has the first commit as parent.
- Spanish and English dictionaries have identical key sets and placeholders.
- Ficha light and dark declare exactly the same semantic tokens; no component CSS
  contains a mode selector outside the theme files.

---

## 2.5 S2 coverage

S2 adds `geometry.test.js`, `pages.test.js`, and `elements.test.js`, and extends
`bundle.test.js` with a text element round-trip. S3 adds `links.test.js`:
projection, orphans, inbound/outbound counts, broken targets, metadata
validation, and unsafe URL rejection. S4 adds `export.test.js`: page tree, links,
headings, images, native fichas, redirect stubs, used assets, and shared cqw
geometry. S5 adds `publish.test.js`: repo parsing, pages URL, SHA-256 manifest,
upload/delete/unchanged planning, cached blob reuse, Git tree/commit payloads,
Pages source payload, map edge routing, full layer ordering, stage resizing, domain normalization, and canonical/CNAME/sitemap output, media frame defaults, video/audio export, transition serialization, publish-history ordering/cap, embed URL parsing, and embed export. The GitHub
transport itself is exercised with a mocked end-to-end flow; one real publish
remains a manual check with a token.

## 3. What is **not** tested

These are forbidden. They are slow, brittle, and they fail for reasons unrelated
to the code being changed:

- Svelte component rendering with `@testing-library/svelte`, jsdom snapshots, or
  `render()` assertions;
- Playwright/Cypress flows that click through the editor;
- screenshot / pixel / visual-regression tests;
- computed-layout assertions (`getBoundingClientRect`, "the panel is 272 px");
- CSS class presence as a proxy for appearance;
- drag-and-drop simulation through the DOM;
- iframe preview screenshots;
- real network calls to GitHub, real IndexedDB in tests, real timers;
- tests that depend on a specific font being loaded or on `devicePixelRatio`;
- snapshot tests of whole HTML documents (they break on every copy change).

If a behaviour is only observable through the DOM, it is verified manually using
the checklist in §6. If a bug can be isolated into a number or a string, move that
logic into `domain/` and test it there.

**Allowed exception:** `npm run build` is a smoke test that the app compiles and
bundles. `svelte-check` is a type/semantic check, not a visual test. Neither
renders the UI.

---

## 4. How tests are written

### Pure, deterministic, fast

- No `Date.now()`, `Math.random()`, `crypto.randomUUID()`, or locale-dependent
  defaults inside tested functions. Inject them:

```ts
export interface Deps {
  now: () => number;
  id: () => string;
  locale?: 'es' | 'en';
}
```

Tests pass a fixed clock and a counter-based ID factory. This makes fixtures
readable and failures reproducible.

- No DOM, no `window`, no `document`, no `fetch`, no `IndexedDB` in domain tests.
  If a function needs bytes, pass a `Uint8Array`. If it needs a URL, pass a string.
- File system and network are tested through fakes that implement the platform
  interfaces. The fake records calls; the test asserts the contract, not the
  implementation.
- Tests run in Node (`environment: 'node'`). No jsdom.

### Fixtures

`tests/fixtures/` contains:

- `empty-project.json`, `three-pages.json`, `grid-project.json`,
  `broken-links.json`, `metadata-project.json`;
- fake asset metadata (`image-1x1.png` only when dimensions are needed);
- recorded GitHub API request/response shapes as JSON, never live calls.

Build fixtures with small factory helpers rather than 200-line JSON blobs:

```ts
// tests/fixtures/factories.js
export function project(overrides: Partial<Project> = {}): Project;
export function page(overrides: Partial<Page> = {}): Page;
export function imageElement(overrides: Partial<ImageElement> = {}): ImageElement;
```

### Naming

- `*.test.js` next to the module, or under `tests/domain/` when the fixture setup
  is large.
- `describe('geometry.resizeFrame', ...)`, `it('keeps the centre when Alt is held', ...)`.
- Test names describe behaviour, not implementation ("rejects a missing target",
  not "calls validateTarget").

### Assertions

- Prefer exact values for numbers and strings, `toMatchObject` for partial
  structures, and `toThrowError` only for programmer errors that should never
  cross a boundary.
- For HTML, assert specific fragments and invariants, not a full snapshot:
  `expect(html).toContain('<a class="el el-image" href="../sobre/"')`,
  `expect(html).not.toContain('javascript:')`.
- For CSS, parse the custom property values with a small helper and assert the
  numbers (`52.5%`, `2.6667cqw`), not a substring of the whole file.
- For ZIPs, assert the manifest entries and read back one file; do not snapshot
  binary output.

### Example

```ts
import { describe, it, expect } from 'vitest';
import { frameToCss, elementToCss, pxToCqw, resizeFrame } from './geometry';

const stage = { width: 1200, height: 800 };

describe('geometry.frameToCss', () => {
  it('converts a frame to percentages of the stage', () => {
    const css = frameToCss({ x: 120, y: 80, w: 300, h: 200, rotation: -4 }, stage);
    expect(css).toEqual({
      '--x': '10%',
      '--y': '10%',
      '--w': '25%',
      '--h': '25%',
      '--rot': '-4deg'
    });
  });
});

describe('geometry.elementToCss', () => {
  it('adds z-order and opacity without changing the frame vars', () => {
    const element = imageElement({
      frame: { x: 120, y: 80, w: 300, h: 200, rotation: 0 },
      z: 3,
      opacity: 0.8
    });
    expect(elementToCss(element, stage)).toMatchObject({
      '--z': '3',
      '--opacity': '0.8'
    });
  });
});

describe('geometry.pxToCqw', () => {
  it('scales type with the stage width', () => {
    expect(pxToCqw(32, 1200)).toBe('2.6667cqw');
  });
});

describe('geometry.resizeFrame', () => {
  it('does not drift the centre when resizing from the centre', () => {
    const start = { x: 100, y: 100, w: 200, h: 100, rotation: 0 };
    const next = resizeFrame(
      start,
      'se',
      { x: 400, y: 300 },
      {
        keepAspect: false,
        fromCenter: true,
        minSize: 8
      }
    );
    expect(next.x + next.w / 2).toBe(200);
    expect(next.y + next.h / 2).toBe(150);
  });
});
```

---

## 5. Commands and CI

```bash
npm run check        # svelte-check (JavaScript + Svelte)
npm run test         # vitest run
npm run test:watch   # vitest
npm run build        # vite build (smoke)
npm run verify       # check + test + build
```

- `npm run verify` must pass before a task is marked done in `plan.md`.
- CI uses Node 24, `npm ci`, then `npm run verify`. No browser installation, no Playwright.
- Coverage: report it, but do not chase a global number. The gate is:
  **`src/lib/domain/geometry.js`, `links.js`, `export/`, and `publish/` at ≥ 90%
  lines and ≥ 85% branches.** UI and platform adapters are measured by
  integration/manual checks, not a coverage target.
- A failing test blocks the task. A skipped test needs a comment explaining why
  and a link to the diary entry.

---

## 6. Manual QA checklist (the part automation cannot do)

Run before declaring a milestone done. Use a real browser, **both app modes**,
both locales, at 1280 × 800 and 1440 × 900.

### Project and persistence

- [ ] Create a project, add a page, reload: content is still there.
- [ ] Duplicate a page; links and elements are copied with new IDs.
- [ ] Rename a page 6 times; only the newest 5 redirect stubs are exported, the
      oldest URL 404s, and a live page reusing an old slug wins.
- [ ] Delete a page that is the target of a link: the link is reported/cleared.
      Its redirects disappear too.
- [ ] Delete the start page: another page becomes start; export still works.
- [ ] Download a `.cajita` bundle, clear site data, re-import: pages, media,
      links, metadata, and page order survive.
- [ ] Import a bundle with a missing asset, a corrupted hash, or a `..` path:
      a helpful error, no partial project, current project untouched.
- [ ] Import a bundle while another project is open: confirmation, current
      project autosaved first, no merge.
- [ ] Open the same project in two tabs: the second tab warns or becomes
      read-only; no silent overwrite.
- [ ] Kill the tab during autosave, reopen: recovery offers the last good
      snapshot, not a half-written project.
- [ ] Project library lists projects with title/thumbnail/date; delete asks for
      confirmation and does not delete the open project from another tab.
- [ ] Undo/redo after drag, resize, rotate, text edit, page delete, link change.
- [ ] Autosave indicator changes; closing/reopening keeps the latest change.
- [ ] Storage quota simulation (if practical): a clear error with a backup path.

### Design system

- [ ] Ajustes → Apariencia: the interface-size slider moves between 90% and 130%;
      every UI label grows, while the stage/site content stays fixed.
- [ ] Interface size survives reload and is applied before first paint.
- [ ] At 1280 × 800 and 1440 × 900, at 110% and 130%, the top bar does not clip
      its rightmost control and there is no horizontal scroll.
- [ ] Top-bar tooltips open **below** their button and are readable.
- [ ] Hidden tooltips do not add phantom horizontal overflow.
- [ ] The UI says **proyecto / project**, not "cajita", except the app name and
      the `.cajita` file extension.
- [ ] Both modes use the same type scale; switching does not move the layout.

### Modes

- [ ] Switch light ↔ dark; layout, spacing, and hit targets do not move.
- [ ] Mode choice survives reload and applies before first paint (no flash).
- [ ] Both modes pass contrast: body text, muted text, buttons, selection,
      focus, stamps, and link badges. The stage stays paper in dark mode.
- [ ] Wordmark, desk motif, rules, shadows, and selection color change; no
      component fork is visible.
- [ ] The exported site does not inherit the editor theme; site theme is separate.
- [ ] Both modes usable at 1280 × 800; no horizontal scroll.

### Links, map, and fichas

- [ ] Set a text link to a page, a URL, and a ficha; every change survives reload.
- [ ] A page link opens the target from the map card and from the exported site later.
- [ ] URL schemes: https, mailto, and tel work; javascript: is rejected.
- [ ] Ficha: fill title/creator/date/medium/rights/source/description; native `<details>` opens and closes.
- [ ] A ficha with no fields is rejected; adding one field makes it valid.
- [ ] Left page list shows the outbound link count; deleting a target page clears the link.
- [ ] Map: cards, inbound/outbound counts, start stamp, page wires.
- [ ] A page with no inbound links is marked orphan; a missing page target is marked broken.
- [ ] Clicking a map card opens that page in the page view.
- [ ] Layers remain visible while an element is selected; switching elements works from the list.

### Publishing

- [ ] Open **publicar** from the top bar; public warning is visible.
- [ ] Publish is disabled until both token and `owner/repo` are present.
- [ ] Fake token → localized auth error, no raw JSON, ZIP fallback visible.
- [ ] Token without the repo in Repository access → specific 404/token-access guidance.
- [ ] Organization repo with SSO pending → same guidance, not a format error.
- [ ] “Olvidar token” clears session and local storage.
- [ ] “Recordar” survives a tab close; default does not.
- [ ] Mock publish first run uploads all files; second run uploads zero.
- [ ] Real token + public repo creates/updates `gh-pages` and returns the public URL.
- [ ] Token without Administration permission: files upload, then the dialog explains the one-time Pages setup and links to its settings.
- [ ] After enabling Pages manually with `gh-pages` root, a retry skips creation and succeeds.
- [ ] Unpublish removes Pages but keeps the repository and history.
- [ ] Token never appears in project JSON, `.cajita`, exported files, or console.

### Export and preview

- [ ] Preview opens in the same renderer, with the current page and page selector.
- [ ] Internal page links in the preview navigate without leaving the dialog.
- [ ] Images, built-in fonts, and custom fonts render in preview.
- [ ] Export site produces a ZIP with index, nested pages, CSS, JS, assets, fonts, 404, `.nojekyll`.
- [ ] Export a second time: no missing-asset/wrong-hash errors; used assets only.
- [ ] Serve the exported folder over HTTP; page links, fichas, and images work.
- [ ] Redirect stubs resolve to the right pages.
- [ ] No `__CAJITA` placeholder, absolute `/assets` path, or editor chrome is present.
- [ ] Export labels and preview close/focus behaviour are translated.
- [ ] Letterbox around the stage uses the page background, not the site theme.
- [ ] Text alignment is three icon buttons inline with size and colour.
- [ ] Select an image tile, then click the stage: it places there, no button or hint.
- [ ] Collapse/restore left, right, and bottom panels; the stage reflows without overlap.
- [ ] No floating `imán / seleccionar / size` toolbar over the canvas.
- [ ] Zoom −/+ changes percentage and stage width; fit width returns to 100% with margins.
- [ ] At >100% the desk scrolls; at <100% the stage stays centered.
- [ ] Drag a layer between rows; the insertion line is clear and undo restores order.
- [ ] Double-click a layer row to rename; no input appears before the double-click.
- [ ] Lock/eye controls live in Capas and are absent from the element inspector.

### Canvas and commands

- [ ] Add text and image elements; both are selectable and survive reload.
- [ ] **Añadir imagen** opens the picker even if a medium is selected; the image is imported and placed immediately.
- [ ] Import the same image twice: the second adds the image to the canvas but not a second Medios tile.
- [ ] Text selection handles hug the text height; editing uses a contrasting background and visible caret.
- [ ] Dropping a layer on the highlighted insertion line actually reorders it.
- [ ] Drag, resize from all eight handles, and rotate; one gesture is one undo.
- [ ] Drag/resize an image: it never flashes or turns into a solid block; the cached blob URL stays stable.
- [ ] Smart guides appear near stage edges/centres and other elements.
- [ ] Lock a selected element: handles disappear and it cannot be dragged.
- [ ] Hide an element: it disappears from the stage but stays in the layers list.
- [ ] Double-click text, edit, Escape/Cmd+Enter; the inspector text stays in sync.
- [ ] Undo/redo after text, move, resize, rotate, page delete, and page slug change.
- [ ] Add/duplicate/delete a page; the start page survives; a deleted target link is cleared.
- [ ] Rename a slug; old URL is queued; after six renames only the newest five survive.
- [ ] Add a custom TTF/OTF/WOFF/WOFF2; apply it to text; delete is blocked while used.
- [ ] Change interface size to 120%/130%; canvas chrome stays readable; site text is unchanged.

### Canonical and custom domain

- [ ] Custom domain field accepts `mi-sitio.com` and `https://mi-sitio.com/`.
- [ ] Invalid domains and `*.github.io` are rejected.
- [ ] Export ZIP contains `CNAME` only with a custom domain.
- [ ] Export contains `robots.txt` and `sitemap.xml` when canonical is set.
- [ ] Every page has canonical and Open Graph tags.
- [ ] Publish success URL uses the custom domain.
- [ ] Real DNS/certificate cycle is still a manual test.

### Page size

- [ ] Page inspector shows ancho/alto; values persist after reload.
- [ ] Width change scales frames and type without stretching images.
- [ ] Height change scales only vertical positions.
- [ ] Text handles re-fit after a size change; selection and export match.
- [ ] Preview and export use the new stage dimensions.
- [ ] Values outside 320–4000 show an error and are not committed.

### Map

- [ ] Long same-column link routes through the side gutter, not behind cards.
- [ ] Different-column links use a row gap; arrowheads land on the target edge.
- [ ] No false connection appears between intervening pages.
- [ ] Card click still opens the page.

### Transitions and history

- [ ] Exported page HTML has the page's transition in `data-transition`.
- [ ] Fade/slide work in a supported browser; cut is instant.
- [ ] No-JS navigation and reduced-motion fallback remain instant.
- [ ] Preview always opens on the active editor page.
- [ ] Preview animates the page you are leaving for fade/slide; cut stays instant.
- [ ] Fade/slide last ~1000 ms; reduced motion is instant.
- [ ] Successful publish adds exactly one history entry.
- [ ] Unpublish adds a history entry and keeps the old publish rows.
- [ ] History is capped at 5, newest first, and survives `.cajita` export/import.
- [ ] History shows site and commit links; no rollback control exists.

### Inline table editing

- [ ] Clicking a cell opens one input; Enter/Escape/blur behave.
- [ ] Duplicate codes and empty required cells show inline errors.
- [ ] Invalid values do not mutate the document.
- [ ] Valid cells commit and update the selected form draft.
- [ ] Tab switch cancels an unfinished cell edit.

### CSV updates and placement

- [ ] Create-only mode rejects existing codes; update mode marks them updates.
- [ ] Update rows carry existing ids and keep blank images.
- [ ] Duplicate codes within a CSV still fail.
- [ ] Grid placement uses only created ids and asks on non-empty pages.

### Ficha table and card

- [ ] Table shows all schema columns, image thumbs, and a dash for empty values.
- [ ] Required markers appear in headers.
- [ ] Search filters rows; row click/Enter opens the editor.
- [ ] Card rectangle stays inside the ficha frame.
- [ ] Card scrolls internally when content is taller than the frame.

### Masks/audio/pages

- [ ] Mask clip paths require 3+ normalized points and clamp 0–100.
- [ ] Audio export emits custom controls and a noscript native fallback.
- [ ] Page miniature renders live page elements.
- [ ] One-column left palette; pages/media split bottom bar.
- [ ] Custom stage size creates the requested dimensions.
- [ ] Stage resize leaves element frames and fonts untouched.
- [ ] Project card renders the start page miniature.
- [ ] Localized type stamps include image/text/video/audio/p5.
- [ ] Masked images use contain and mask points stay proportional.
- [ ] Mask dialog uses natural image aspect and converts frame/content points.
- [ ] About shows a version without a sprint number.
- [ ] Home wordmark returns to the library.
- [ ] Mask dialog contains the whole image.
- [ ] Clipboard paste runs once per shortcut.

### Interaction/p5

- [ ] p5 `.../full/<id>` URLs parse and `embedSrc` resolves them.
- [ ] Clipboard pastes headings without invalid pages.
- [ ] Preview toolbar reset restores authored positions.
- [ ] Media manager exposes video/audio filters.

### Ficha fixes and media

- [ ] Preview includes ficha record image assets.
- [ ] Hidden schema fields are omitted from cards.
- [ ] showCode hides card/canvas code.
- [ ] Media manager filters and blocks deletion of used assets.
- [ ] Empty schema derivation is explicit and inferred by value shape.

### Export options

- [ ] Options builds both candidates and shows exact sizes.
- [ ] Small is one HTML with all pages and a hash router.
- [ ] Small embeds media/fonts and keeps fichas fixed.
- [ ] Full ZIP preserves pages, assets, SEO files, and movable runtime.
- [ ] ZIP compression uses the worker.
- [ ] Recommendation flips at 20 MB/video/audio.

### Collection ZIP

- [ ] ZIP finds one CSV and reduces image paths to basenames.
- [ ] Multiple CSVs are ambiguous unless `fichas.csv`.
- [ ] Duplicate image basenames fail.
- [ ] Hidden/`__MACOSX` entries are ignored.
- [ ] CSV preview precedes media import; image assets then match records.

### Schema ordering and images

- [ ] Schema up/down reorders the draft and saves in that order.
- [ ] Table/card/CSV order follows the schema.
- [ ] Table image select can set or clear a record image.
- [ ] Image changes preserve the record id and placed elements.

### Persistent positions

- [ ] Storage key includes project, page, and element id.
- [ ] Drag/keyboard positions persist and restore.
- [ ] Reset restores authored layout and removes storage.
- [ ] Fixed mode has no persistence controls.

### Movable fichas

- [ ] Fixed mode emits no movement script or body flag.
- [ ] Movable mode emits `data-ficha-movable` and the runtime.
- [ ] A drag changes `--x`/`--y` and suppresses the click.
- [ ] A plain click still opens the card.
- [ ] Arrow keys move within stage bounds.
- [ ] Positions reset on reload.

### Ficha CSV

- [ ] BOM, semicolons, quoted commas, and quoted newlines parse.
- [ ] Unknown/duplicate headers block import; schema is never auto-created.
- [ ] Required values, URLs, and duplicate codes produce line-level errors.
- [ ] Image filename matches become asset ids; mismatches warn.
- [ ] Template/export round-trip.
- [ ] Import is one command; records are not auto-placed.

### Fichas

- [ ] Schema fields validate key/type/required and unique keys.
- [ ] Records require unique codes, names, required values, and safe URLs.
- [ ] A ficha element references an existing record.
- [ ] Deleting a record removes its placed elements.
- [ ] Export includes the ficha image and a `<details>` card with schema rows.
- [ ] Older projects gain empty ficha schema/records during migration.
- [ ] Legacy meta links still export.

### Shapes

- [ ] Circle, square, and triangle create valid shape elements.
- [ ] The one Forma button opens exactly three choices.
- [ ] Fill/stroke/stroke width update on canvas and export.
- [ ] Shapes export as inline SVG and retain links/layers.
- [ ] Selecting a circle/square/triangle draws a rectangular bounding box equal to the shape frame.
- [ ] Resizing the frame resizes the SVG with it; Shift keeps the aspect ratio.
- [ ] Invalid shapes or colors fail project validation.

### Embeds and large media

- [ ] Video import accepts up to 20 MB and rejects 21 MB.
- [ ] YouTube watch/short/share URLs become no-cookie embeds.
- [ ] Observable notebook/embed URLs become `/embed/...`; `?cells=` is preserved; archived `old.observablehq.com` and `%40` URLs work.
- [ ] YouTube uses `strict-origin-when-cross-origin` (not no-referrer).
- [ ] Preview loads through `preview.html`, not a blob URL.
- [ ] Multiple preview page changes keep rendering; the shell listener survives `document.open()`.
- [ ] Dragging from an input to select text and releasing outside the dialog does not close it.
- [ ] Editor shows a placeholder; no third-party request is made while editing.
- [ ] Preview/export show the sandboxed iframe with source link and caption.
- [ ] Invalid providers/URLs are rejected on insert and by project validation.
- [ ] Medios scrolls horizontally with several assets.
- [ ] Pages success waits for the build commit matching the new commit.
- [ ] “usar esta pestaña” clears a stale lock.

### Video and sound

- [ ] Añadir video imports and places an MP4 immediately.
- [ ] Añadir sonido imports and places a WAV/MP3 immediately.
- [ ] Selecting a video/sound in Medios and clicking the stage places it there.
- [ ] Video uses the source aspect ratio; sound uses a compact 76 px bar.
- [ ] Editor media is paused by default; play/pause works and does not drag.
- [ ] Video fit/controls/autoplay/loop/muted survive reload and export.
- [ ] Sound label/controls/autoplay/loop survive reload and export.
- [ ] Export has native `<video>`/`<audio>` markup; preview matches.
- [ ] Limits still apply (3 videos, 50 MB/file, 20 audio, no transcode).

### Assets

- [ ] Import JPEG/PNG: optimized to WebP, orientation correct, full image visible.
- [ ] Import PNG with transparency: alpha preserved.
- [ ] Import GIF: animation preserved; no re-encode; size shown.
- [ ] Import the same file twice: one asset, two references, size counted once.
- [ ] Import a >40 MP image: downscaled with a warning, not silently accepted.
- [ ] Import a huge video: warning, no transcode, poster frame present.
- [ ] Import a 4th video: blocked with the "3 videos" message; usage meter shows
      the count and total.
- [ ] Import a 51 MB file: rejected before it is stored.
- [ ] Import unsupported SVG: rejected with a clear message.
- [ ] Thumbnails load quickly in the page strip; full-size image is not used.
- [ ] Export/publish size report shows totals, counts, and largest assets.
- [ ] "Guardar original" (v1.1) keeps the original and still exports WebP.
- [ ] Upload a TTF, OTF, and WOFF2 custom font: preview, name, weight, style, and
      license note accepted; it appears in the text font picker.
- [ ] Upload an invalid font: FontFace fails, nothing is stored, error is clear.
- [ ] Try a 3rd custom font: blocked; delete a used font: blocked with the
      replacement path.
- [ ] Custom font survives project download/import and is embedded in the site
      export only when used.
- [ ] A custom font that fails to load in the exported site falls back to the
      site pairing (text remains visible).

### Editing

- [ ] Add image by button, by drop, and by paste; natural aspect is preserved.
- [ ] GIF animates in preview/export and is not converted to a still.
- [ ] Video plays, pauses, loops, and respects autoplay/mute settings.
- [ ] Audio plays with the custom control; keyboard Space works; no autoplay
      surprise.
- [ ] Text edits in place; escape cancels; line breaks and accents survive.
- [ ] Typography controls change only the selected element.
- [ ] Resize on all 8 handles, rotated and unrotated; Shift keeps aspect.
- [ ] Rotate snaps to 15° in free and 90° in the grid type preset; angle label
      is correct.
- [ ] Multi-select, move, align, z-order, lock, hide.
- [ ] Grid mode snaps; toggling grid off keeps positions; changing columns
      does not scramble frames.
- [ ] Type preset baseline feels right; text does not jump when switching presets.
- [ ] Elements can extend off-stage; warning appears; export clips correctly.
- [ ] Zoom 25–400%, fit, pan; handles stay the same screen size.

### Links, preview, export

- [ ] Link an image to a page; preview navigates; back/forward work.
- [ ] Link text to an external URL; sanitizer rejects `javascript:`.
- [ ] Link to metadata opens the card; Escape/close returns focus.
- [ ] Map view shows all pages/edges; orphan page is visible; clicking a wire
      selects the source element.
- [ ] Preview looks identical to the exported site at the same viewport.
- [ ] Export ZIP opens from `file://`; navigation and media work.
- [ ] Export to a subfolder (GitHub project path) works with relative URLs.
- [ ] `index.html` is the start page content, not a redirect.
- [ ] Every page has a title, description, `lang`, and a skip link.
- [ ] Site works with JavaScript disabled: text, images, links, metadata.
- [ ] Mobile viewport: stage fits (`contain`) or scrolls (`width`); text is not
      clipped; metadata is reachable.
- [ ] No 404s in the browser console; no CORS errors; no absolute `/assets`.

### Publish (when enabled)

- [ ] Invalid token: actionable error, export still available.
- [ ] Token with wrong scopes: clear Pages/Contents permission message.
- [ ] Private repo on a free plan: explain that Pages needs a paid plan.
- [ ] First publish to an existing empty public repo creates the `gh-pages`
      branch and enables Pages.
- [ ] Second publish only uploads changes and keeps history.
- [ ] A deleted element/file disappears from the remote tree.
- [ ] A renamed page leaves a redirect stub at the old URL.
- [ ] Pages build success shows the URL; build failure links to the log.
- [ ] Custom domain writes `CNAME`; the UI does not claim DNS is verified.
- [ ] Token is not present in the project, bundle, exported files, or logs.
- [ ] "Forget token" actually clears storage.
- [ ] A site over the hard size limit is blocked with a size breakdown; ZIP
      download still works.
- [ ] Publish dialog states that the site is public before the user confirms.
- [ ] "Despublicar" removes the Pages site but leaves the repo/history; the UI
      explains the difference and links to repo settings.
- [ ] Download ZIP + manual upload works as the fallback path.

### Accessibility and language

- [ ] Tab through the whole shell; focus is always visible; no traps except
      dialogs.
- [ ] Every icon-only button has a name; screen reader announces it.
- [ ] Switch ES/EN; no clipped labels, no mixed-language leftovers.
- [ ] Dates/numbers follow the locale.
- [ ] Reduced motion disables transitions and hover lifts.
- [ ] 200% browser zoom: controls remain usable at 1280 × 800.

### Aesthetic review

- [ ] One accent per screen; the stage is the focus.
- [ ] Both themes feel like cajita, not like a reskinned dashboard.
- [ ] No glass, no gradients, no 16 px rounded cards.
- [ ] Paper/ink/desk hierarchy reads clearly.
- [ ] Nothing decorative sits behind body text.
- [ ] Empty states point to the next action.
- [ ] The app still looks like cajita, not like a generic dashboard.

---

## 7. Definition of done for a task

A task is done only when:

1. The domain logic has tests covering the new behaviour and the edge cases in
   §2.
2. `npm run verify` passes.
3. The manual QA items relevant to the task pass.
4. Both locales are updated; `i18n` parity passes.
5. No forbidden test was added.
6. `diary.md` has an entry: what changed, why, what was learned, what is next.
7. `plan.md` is updated (checked off, or the remaining work is made explicit).

If a change cannot be tested because it is purely visual, say so in the diary and
add a manual QA item. Do not invent a DOM test to fill the gap.

---

## 8. Security and data-integrity tests

These are cheap and non-negotiable:

- HTML escaping for text, alt, titles, metadata, and page titles.
- URL sanitising: only `http:`, `https:`, `mailto:`, `tel:`; reject
  `javascript:`, `data:` (except generated asset URLs), protocol-relative
  `//evil` unless explicitly allowed.
- Slug/path sanitising: no `..`, no leading `/`, no control characters, no
  Windows reserved names (`CON`, `NUL`, etc.).
- Bundle import: reject path traversal, duplicate entries, oversized archives,
  too many files, and unknown `format`.
- Asset names: strip directories, control characters, and trailing dots/spaces;
  keep the extension; cap length.
- Link graph: no dangling `startPageId`, no self-link, no duplicate page slugs.
- Publish: token never serialised; request bodies contain no local paths or
  secrets; deleted files are explicit `sha: null` entries.
- Determinism: export twice, compare bytes (except documented timestamps).
