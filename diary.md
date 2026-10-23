# cajita — diary

A running log, newest entry last. Each entry records **what changed**, **why**,
and **what is next**. Read the last two entries before starting a task. Do not
edit history; append. If a decision is reversed, add a new entry that says so.

---

## 2026-10-21 — the box is still empty (on purpose)

### What I did

- Read the four stripped-down reference apps:
  - **motivomotivo:** fixed-size grid/geometry, cell-based composition, snapshot
    undo, sparse text/image maps, SVG→PNG export, Tauri/web dual runtime.
  - **bebop:** rune-based app state, a single `performExport` job wrapper,
    format registry, progress/restore logic, save-file abstraction.
  - **comiquero:** `mainview` / `bun` boundary, typed RPC, job bus, pure domain
    modules, atomic writes, asset service. The cleanest example of "UI calls
    interfaces, native owns the filesystem".
  - **aventura interactiva:** node/edge workspace, compile-to-data and
    load-from-data bridges, lightweight `$state` i18n with ES/EN dictionaries.
- Researched the references that matter for cajita:
  - **Hotglue:** direct manipulation on a blank page; objects link to pages,
    URLs, or anchors; "appear on all pages" for menus; a non-magnetic grid;
    revisions instead of undo; pages have URLs; uploads for images/video/audio;
    install-on-your-own-server philosophy. The important lesson is not the PHP
    stack, it is the _immediacy_ — click the thing, edit the thing.
  - **Decker:** a deck of fixed 512×342 cards; six widget types; an Interact tool
    and a Widgets tool; locked decks; export as a self-contained HTML file;
    Web-Decker runs the same deck in a browser. The lesson is the card/deck
    vocabulary and the separation between _making_ and _playing_.
  - **Bitsy:** tiny rooms, tiny sprites, a tiny palette; the constraint is the
    reason people finish things. We are not making a game engine, but the same
    discipline applies to fonts, palettes, stage sizes, and element types.
  - **Publii:** a desktop static CMS; build locally, preview, then sync to a
    host (GitHub Pages, SFTP, etc.). The lesson is the export/publish split and
    the "download is always available" escape hatch.
- Checked the constraints of the machines and the web platform:
  - macOS 26.3.1 on an M1 with 8 GB RAM and ~15 GB free. Tauri's Cargo target
    directory is not a good use of that disk.
  - Electrobun ships ~12 MB bundles with the system webview and Bun; you already
    use it in comiquero. Good later, not needed for v1.
  - File System Access API is Chromium-only; Firefox and Safari do not support it.
    So "write directly to a folder" cannot be the primary web export. ZIP is.
  - GitHub's REST API supports CORS, so a browser app can publish with a PAT.
    GitHub's OAuth device-flow endpoint does not support browser CORS, so a
    device flow needs a proxy or the desktop shell.
- Wrote the planning documents:
  - `architecture.md` — system map, pure domain boundary, model, commands,
    geometry, platform interfaces, IndexedDB, `.cajita` bundle, static export,
    GitHub Pages publish, i18n, accessibility, decision log.
  - `design-system.md` — _Caja de zapatos_ direction, tokens with measured
    contrast, typography, shell anatomy, component specs, canvas rules, motion,
    copy, shipped themes, implementation rules.
  - `testing.md` — pure-function/data-model tests only; explicit ban on visual,
    DOM, screenshot, and click-through tests; manual QA checklist.
  - `plan.md` — Sprint S0 only: decisions, scaffold, tokens, i18n, primitives,
    shell, boundary proof.
  - this diary.

### Why

The app is small but the failure modes are structural: editor/export drift,
state mutated from everywhere, media lost, tokens leaking into project files,
publishing that only works on one browser, and a visual language that collapses
into "generic dashboard" the moment a component library arrives. The documents
are an attempt to make those failures expensive to commit.

The central bet is **stage-first, export-first**:

- a page is a fixed-aspect stage, like a Decker card or a Hotglue page, not a
  liquid layout;
- the editor and the exporter share one geometry function and one CSS generator;
- preview is the exporter rendered in an iframe;
- the exported site is plain multi-page HTML with relative paths, so it works on
  GitHub Pages, in a subfolder, and from `file://`, with or without JavaScript.

That bet makes collage, comics, and precise compositions natural, and keeps the
export small and inspectable. It deliberately gives up responsive flow layout in
v1. If portfolios need long scrollable pages, a future `flow` page type is the
right extension, not a fourth layout mode.

### Decisions made (proposed, not yet locked)

- Web-first static app; optional Electrobun shell later; no Tauri.
- Vite + Svelte 5 + JavaScript (ESM); no SvelteKit, no TypeScript build step.
- Fixed-aspect stage with `contain` / `width` fit.
- Three layout intentions: libre, rejilla, tipo; two internal engines (free and
  snap). Grid and type share snapping settings.
- Link stored on the element; link graph derived; one action per element
  (page / URL / metadata card).
- Export as a real folder of pages + ZIP; single-file export deferred.
- Preview is the export pipeline in an iframe.
- GitHub Pages via PAT in v1; device flow later with desktop or a proxy.
- Spanish + English UI; site language is independent; Spanish fallback.
- GPL-3.0 app; the user owns the exported site.

### Open questions

1. Is "tipo" a distinct third mode, or a grid preset with a letterpress feel?
2. Are fixed-aspect stages acceptable for portfolios, or is a responsive flow
   page required in v1?
3. Web-first or desktop-first? (Recommendation: web-first.)
4. PAT-only publishing, or build the OAuth path now?
5. Which visual direction: Caja de zapatos, Riso print shop, or Archive/index
   card? (Recommendation: Caja de zapatos.)

### Surprises / things to remember

- Hotglue's lack of undo is a real usability cliff. cajita must have undo from
  day one, and revisions/backups should be a separate, boring feature.
- Decker's "lock the deck" is a lovely idea: a clear line between editing and
  experiencing. cajita's preview should feel like that, not like a hidden mode.
- The most dangerous part of the export is not HTML generation, it is **asset
  paths**: relative depth, subfolder hosting, GitHub Pages, and spaces/accents in
  file names. Test those pure functions hard.
- The token must never enter the project document. Students share bundles.
- A 15 GB disk and 8 GB RAM is a real constraint. No Playwright, no Electron,
  no Tauri Cargo target, no screenshot tooling. Vitest in Node is the right size.
- Fonts are a licensing and weight problem. Use the six OFL families already in
  motivomotivo, subset to woff2, ship the licenses, and do not let users upload
  arbitrary fonts in v1.
- The page strip thumbnails should be wireframes generated from the model, not
  screenshots. Cheaper, deterministic, and they look like little cards in a box.

### Next

Wait for the six decisions in `plan.md`. Then:

1. record the answers in `architecture.md` §15 and here;
2. delete the four `*_for_reference` folders (untracked) and `.DS_Store`;
3. scaffold the Vite/Svelte/TS app;
4. build tokens, fonts, i18n, primitives, and the shell;
5. add `slugs.js` + tests to prove the pure boundary;
6. run `bun run verify` and append the next diary entry.

No application code was written today. That is the point.

---

## 2026-10-21 — first decisions, and a visual detour

### What changed

The first review answered the big structural questions:

- **Platform:** web-first, no committed desktop build. The editor will be hosted
  as a static app, with **GitHub Pages as the canonical install** and **itch.io
  as an optional demo**. Desktop is deferred, not planned. Publishing to GitHub
  Pages with a PAT works from the browser via CORS, which removed the main reason
  a desktop shell existed in the first place. The `Platform` interface stays in
  the architecture for folder projects, native dialogs, or offline install if a
  concrete need ever appears.
- **Page model:** fixed-aspect stages, but with some leniency: horizontal
  alignment (`center` / `left`), a rendered **min width** and **max width**, and
  whole-page scaling between them. No reflow and no breakpoints. `width` fit
  scrolls vertically; `contain` fits the whole card and letterboxes. This is the
  Hotglue/Decker constraint with enough flexibility for a portfolio on a laptop.
- **Layout:** two modes, **libre** and **rejilla**. "Tipo" is a grid preset
  (baseline + 90° rotation step), not a third top-level mode. The UI stays
  simpler; the letterpress feeling survives as a preset.
- **Publishing:** PAT-first. The ZIP download is always available. OAuth device
  flow is not in v1.
- **Aesthetic:** the kraft-paper direction is rejected. **Riso print shop** is
  the leading candidate, with **Archive/index card** and **Fotocopia** as
  alternates. Three static mockups will decide it; the design-system colour
  table is marked as a non-implementable draft until then.

### Why

The desktop question collapsed once publishing was proven possible from the
browser. A web app is dramatically easier to hand to a class, and the remaining
desktop features (folder projects, native dialogs, offline install) are
conveniences, not requirements. The `Platform` boundary means we are not painting
ourselves into a corner.

The stage leniency is a good compromise: the composition never reflows (which
would break collage), but the page can sit at a comfortable maximum width on a
large monitor and shrink to a phone without turning text into dust. Alignment
gives the page a relationship to the browser window — centred for a poster, left
for a document/contact sheet.

Two layout modes instead of three is the right constraint. "Tipo" as a preset
keeps the letterpress idea without asking a student to understand a third mode
before making their first page.

The aesthetic is the one thing that cannot be decided in prose. Riso sounds
right, but "sounds right" is how a tool ends up looking like a theme rather than
a place. The mockups will use the same shell and the same sample page, so the
comparison is about the visual language, not about which layout looks nicer.

### Docs updated

- `architecture.md`: stage `align` / `minWidth` / `maxWidth`, two layout modes,
  type preset, web-first rationale, editor hosting, decision log (D1/D2/D3/D8
  decided, D12 pending), milestones.
- `design-system.md`: v0.2 draft, kraft rejected, Riso leading, layout references
  changed, colour table marked as a draft only.
- `plan.md`: decisions checked off, visual selection task added, open decisions
  narrowed to look/language/hosting.
- `diary.md`: this entry.

### Next

1. Build the three mockups (`design-mockups/riso.html`, `archive.html`,
   `fotocopia.html`) with the same shell and sample page.
2. Screenshot them at 1440 × 900 and review at 1280 × 800.
3. Pick one, rewrite the design tokens, and only then scaffold.

---

## 2026-10-21 — three mockups, one stage-scaling lesson

### What I did

- Built three static editor mockups in `design-mockups/`, all with the same shell
  and the same sample page so only the visual language changes:
  - `riso.html` — fluorescent pink/teal, mustard, halftone, registration marks,
    warm-cool stock, misregistered stage shadow.
  - `archive.html` — cream, slate blue, ruled lines, catalogue numbers, Fraunces
    serif, index-card inspector.
  - `fotocopia.html` — xerox black/white, one red stamp, heavy borders, black
    top bar, halftone art.
- Rendered each at 1440 × 900 with headless Chrome; rendered Riso again at
  1280 × 800. Screenshots are in `design-mockups/shots/`; the gallery is
  `design-mockups/index.html`.
- Added a tiny `ResizeObserver` to the mockups that scales the 760 × 507 page
  content inside the stage. Without it, the fixed-pixel mockup clipped its text
  at 1280; with it, the mockup behaves like the real stage will. This is exactly
  why the real export uses percentages and `cqw` units instead of pixels.
- The mockups use local OFL fonts copied from motivomotivo (Space Mono, Archivo
  Black, Fraunces, plus Syne/Zilla/IBM Plex for future site themes). They are
  throwaway design artifacts, not the app scaffold.

### What the mockups show

- **Riso** has the strongest identity and the most energy. The stage looks like a
  printed sheet, the chrome is still legible, and the inspector reads as a tool.
  Risk: the desk pattern and misregistration can become noise; if chosen, tone
  down the desk and reserve saturated ink for the stage, selection, and primary
  actions.
- **Archive** is the calmest and the best fit for digital-humanities collections
  and long reading. The serif + catalogue labels feel specific without shouting.
  Risk: it can drift toward "institutional" and lose the indie energy.
- **Fotocopia** is the most distinctive at a glance and the closest to a zine /
  Decker / punk tool. Risk: the high contrast and heavy borders are tiring after
  an hour of editing, and the black top bar makes the app feel heavier than it is.

### Recommendation

Riso, with the chrome slightly quieter than the mockup. It has the recognisable
character the brief asked for, while the stage remains the loudest thing. Archive
is the right choice if the primary use case is collections/metadata rather than
collage/comics. Fotocopia is a great _site_ direction but probably too aggressive
as the daily editor.

### Next

Pick a direction (or ask for a hybrid), rewrite `design-system.md` §2 with the
real tokens and measured contrast, then scaffold S0. No app code yet.

---

## 2026-10-21 — both themes, a real bundle, and what a PAT is

### Decisions

- **Both Riso and Ficha ship as app themes.** Riso is the default; Ficha is the
  calm alternate. The theme is per device, switchable from the top bar and from
  settings, persisted in `localStorage`, applied with `data-theme` before first
  paint. The editor theme and the exported site theme are independent.
- **Web-only confirmed.** No desktop shell is planned. Publishing from the
  browser with a PAT is the intended path; the platform interface remains only as
  a seam, not as a commitment.
- **Data safety comes before composition.** The next sprint after the shell is
  the project foundation: model, IndexedDB, `.cajita` bundle, import validation,
  autosave/recovery, project library, asset pipeline. The free canvas comes after
  that.
- **Project bundle:** a ZIP with `bundle.json`, `project.json`, binary
  `assets/`, `thumbs/`, and `README.txt`. Media is never base64 inside JSON.
  Base64 adds ~33%, forces the whole project into one string, and makes partial
  recovery impossible.
- **Image policy (recommended, still open):** optimize non-GIF images on import
  to WebP q0.85, long edge 2560 px, EXIF orientation applied and metadata
  stripped. GIFs keep their original bytes and animation. A "guardar original"
  toggle is opt-in for DH work. Video/audio are not transcoded.
- **Fonts:** the project stores font IDs, not font files. The app ships the six
  OFL families; the export includes only the used ones as subset woff2.
- **Redirects:** renaming a page after publish writes a redirect stub for the old
  slug, so links do not rot. A live page cannot reuse an old slug without a
  validation error.

### What a PAT is, for the record

A GitHub Personal Access Token is a long random secret that lets cajita call the
GitHub API as the user, limited to the repos and permissions chosen when it is
created. It is not the account password and it can be revoked. The recommended
v1 token is **fine-grained**, scoped to one repository, with **Contents:
read/write** and **Pages: read/write**; Administration is only for the optional
"create the repo for me" flow. The token is stored in `sessionStorage` by
default, optionally `localStorage`, never in the project, bundle, exported site,
or logs. It is sent only to `api.github.com` over HTTPS. If it leaks, revoke it.

For students: one token per student, their own repo, short expiration. A shared
teacher token is a bad idea. Downloading the ZIP and uploading it manually is a
first-class fallback.

### Docs updated

- `architecture.md` v0.3: two themes, web-only, bundle/import/asset pipeline,
  autosave/recovery/multi-tab, project lifecycle, redirects, PAT guide, limits.
- `design-system.md` v0.3: semantic token contract, Riso and Ficha token tables
  with measured contrast, theme switching, theme parity rules, site themes
  separated.
- `plan.md`: S0 updated with both themes and theme parity; S1 is now the project
  foundation, S2 the free canvas.
- `testing.md` v0.2: bundle, asset, redirect, theme-token, and manual QA coverage.

### Next

Resolve the image policy (optimize on import vs preserve originals), default UI
language, and editor hosting. Then scaffold S0: Vite + Svelte 5 + TS, tokens for
both themes, i18n, primitives, shell, theme switch, and the `slugs` test.

### Two follow-ups worth remembering

- **Origin stability:** IndexedDB is bound to the exact editor URL. Pick the
  canonical GitHub Pages URL early; moving to a custom domain later hides the
  projects stored under the old origin. The `.cajita` bundle is the migration
  path.
- **Classroom workflow:** the starter template, the "download before closing"
  ritual, and submission by bundle or published URL are part of the product, not
  an afterthought. No accounts or teacher dashboard in v1.

---

## 2026-10-22 — limits, redirects, fonts, and plugin seams

### Decisions

- **Image policy:** optimize non-GIF images on import to WebP q0.85, long edge
  2560 px, EXIF orientation applied, metadata stripped. GIFs keep original bytes
  and animation. Video/audio are not transcoded. Originals are not kept in v1;
  the source file stays on disk. A "guardar original" option can be added later.
- **Redirects:** not a full per-page history. A project-level FIFO queue with
  **max 5** entries; each rename pushes the old slug and drops the oldest. A live
  page always wins over a redirect with the same slug. This keeps the project and
  the export lean, which was the point.
- **Custom fonts are core, not a later plugin:** max 2 per project, 5 MB each,
  TTF/OTF/WOFF/WOFF2, validated with FontFace, license attestation, stored as an
  asset, included in the bundle, exported with `@font-face` only when used.
- **Extensibility is build-time registries, not a runtime plugin runtime:** element
  kinds, importers, exporters, site themes, publish providers, templates, font
  sources. No third-party code from a project file, no plugin JS in the exported
  site. The CSV collection importer can be a registry entry later without
  reshaping pages or the exporter.
- **Media caps (motivomotivo-style):** max 3 videos, 100 MB total video, 50 MB per
  file, 80 images, 20 audio, 2 custom fonts, 250 MB soft / 500 MB hard project
  bundle, 200 MB soft / 900 MB hard site export, 50 pages soft. The UI shows a
  usage meter, not a surprise error at publish time.
- **GitHub facts** (checked, not guessed): files over 50 MiB warn, over 100 MiB
  are blocked; repos ideally < 1 GB and < 5 GB strongly recommended; Pages source
  repos recommended < 1 GB; published Pages sites may be no larger than 1 GB;
  bandwidth soft limit 100 GB/month; 10 builds/hour soft. The "2 GB repo" memory
  was close in spirit but not the actual hard limit.

### Why

The redirect queue and the media caps are the same design move: put a visible
ceiling on the thing that grows without bound, so the tool stays a small-site tool
and the class projects stay portable. Five redirects is enough for the rename a
student actually regrets; the sixth oldest URL can 404.

Custom fonts from the beginning changes the font model: a font is now an asset,
not just an ID. That has to be in the model and bundle before the editor starts,
otherwise it becomes a painful retrofit. The font manager is a core panel, not a
plugin.

The plugin seams are deliberately narrow. We are not building a plugin API before
the first real collection importer exists. We are making sure a collection item
can be an element kind, a CSV can be an importer, and a future publish target can
be a provider, without rewriting the page/geometry/export core.

### Docs updated

- `architecture.md` §5 (fonts/redirects/assets), §9 (bundle, policy, limits),
  §10 (redirects/fonts), §12 (extensibility), §16 (decisions).
- `design-system.md` font picker/manager and custom-font rules.
- `plan.md` S1 includes custom font assets/limits; S2 includes the font manager
  and redirect queue.
- `testing.md` custom fonts, media caps, redirect FIFO, theme parity.
- `diary.md` this entry.

### Next

S0 scaffold: Vite + Svelte 5 + TS, both themes, i18n, primitives, shell, theme
switch, slug/theme tests. Then S1 project foundation, then S2 canvas.

---

## 2026-10-22 — S0 is real: shell, two themes, Spanish first

### What changed

- Switched the implementation to **plain JavaScript (ESM)**. No TypeScript build
  step, no `tsc`. `jsconfig.json` exists only for editor support; `svelte-check`
  uses it. The model shapes in `architecture.md` are documentation; the code uses
  plain objects and JSDoc where a contract is worth naming.
- **Spanish is the default UI language** (`es`), with an ES/EN switch persisted
  per device. There is no browser-language detection.
- Canonical editor URL is **https://srsergiorodriguez.github.io/cajita/**.
- Adopted the **sentence-case rule** in both languages: headings and sentences
  capitalize only the first word (proper nouns excepted); never Title Case.
  Buttons, tabs, and micro-labels remain lowercase by design. A test guards the
  headings we have.
- Deleted the four `*_for_reference` folders after the decisions were recorded;
  their patterns live in the docs. Removed `.DS_Store`; added it and `.tmp/` to
  `.gitignore`.
- Scaffolded **Vite + Svelte 5 + JavaScript**, with `svelte-check`, Vitest,
  Prettier + Svelte plugin, and npm scripts. `bun` can run the scripts too, but
  npm is the tested default because the sandbox blocks Bun's cache.
- Built the S0 shell:
  - `TopBar` with theme-aware wordmark, views, disabled future actions, theme
    toggle, ES/EN switch, settings.
  - `LeftPanel` with sample pages, disabled add tools, media empty state.
  - `StagePlaceholder` with a sample 3:2 composition, selection overlay, and the
    "editor arrives next sprint" note.
  - `Inspector` with a static page section and an empty-selection state.
  - `PageStrip` with sample cards, active page, add button, status.
  - Responsive inspector slide-over, left drawer, and large-screen note.
- Built the UI primitives: Button, IconButton, Field, SegmentedControl, Panel,
  Section, Dialog, Toast/ToastHost, Tooltip, Icon. A dev kitchen sink lives at
  `?dev=1`, with a dialog auto-open at `?dev=1&dialog=1`.
- Built the first boundary proof: pure `slugs.js` + tests, `platform/types.js`
  with JSDoc contracts and an in-memory fake, and a theme-token parity test.
- Subset the fonts to woff2 with `pyftsubset`: Space Mono 400/700, Archivo Black,
  Fraunces regular/italic. The italic Fraunces is 156 KB; acceptable for now,
  could be subset further later.
- `npm run verify` is green: 0 svelte-check errors/warnings, 19 tests, build
  succeeds. Dev and production preview were screenshotted at 1440 × 900,
  1280 × 800, 1024, and 880.

### What I learned

- The stage scales content with `cqw` units, so at 1280 the sample body text is
  small; that is expected for a canvas and is why zoom controls matter. The
  exported site will render at its real width and be readable.
- Two themes really are just token sets if the components never reference the
  theme. The theme parity test is cheap and catches drift.
- `$props.id()` gives unique field ids without a module counter; it is the clean
  Svelte 5 answer.
- The topbar needs fewer labels as it narrows: hide page title, project name,
  then button labels, then saved status. The icon-only state still needs tooltips.
- Sentence case is a content rule, not a CSS transform. Forcing
  `text-transform: lowercase` on headings made the rule invisible; it was removed
  from headings. Buttons still use lowercase by design.
- The Fraunces italic subset is much heavier than the others; watch it if the
  initial font payload becomes a concern.

### Next

S1: the project foundation. Model + migrations, IndexedDB, `.cajita` bundle
round-trip, import validation and atomic commit, project library, autosave and
recovery, multi-tab guard, asset pipeline (WebP, GIF preservation, thumbnails,
limits), custom font assets, and redirect queue tests. No canvas until data can
be saved and reopened safely.

---

## 2026-10-22 — S1: the project can survive closing the tab

### What changed

- Added the real **Project model**: pages, stage, site theme, media policy,
  assets, custom fonts, redirects, start page, timestamps. Validation returns
  useful paths; unsupported future versions are rejected.
- Added the **redirect queue**: project-level FIFO, max 5, newest last. A live
  slug wins, a deleted target is pruned, and the exporter will write stubs from
  this queue.
- Added **IndexedDB persistence**:
  - `projects` (document + revision + savedAt),
  - `assets` and `thumbs` keyed by project + asset,
  - `backups` (last 3 valid project snapshots),
  - `settings`.
- Added **autosave**: 600 ms debounce, serialized saves so an older save cannot
  overwrite a newer one, flush on visibility change and before unload. A save
  points `updatedAt` at the current time.
- Added **multi-tab locking**: the second tab sees a read-only banner and cannot
  import media or delete the project. The lock is best-effort, with a heartbeat.
- Added **`.cajita` bundles**: ZIP with `bundle.json`, `project.json`, binary
  assets, thumbs, and README. Import validates the manifest, project, paths,
  sizes, and SHA-256 hashes before writing. Import creates a new project ID so it
  never silently overwrites an existing project.
- Added the **asset pipeline**:
  - MIME sniffing from magic bytes,
  - WebP q0.85 / 2560 px for non-GIF images (keeps the original if WebP would be
    larger),
  - GIFs preserved as GIFs,
  - EXIF orientation applied, metadata stripped,
  - 480 px WebP thumbnails, SHA-256 content hashes, dedupe,
  - video/audio metadata + video poster, no transcode,
  - limits: 50 MB/file, 3 videos / 100 MB video, 80 images, 20 audio, 2 fonts.
- Added the **project library**: storage footer, project cards with real stats,
  create dialog (name, site language, stage, site theme), open, delete with a
  confirm, `.cajita` import by picker and drag/drop.
- Added the **project menu**: download `.cajita`, close project, delete project
  with a second confirmation.
- The editor shell is now project-aware: dynamic pages, active page, project
  title, save status, media grid, asset inspector, project stats, and dynamic
  stage page count/status.
- Custom font storage and validation are in place, including FontFace checks;
  the font manager UI is deliberately S2.
- Extracted the design system into both themes; added the first **plurals**
  (`1 página` vs `2 páginas`, `1 proyecto` vs `2 proyectos`).

### Verification

- `npm run verify`: 0 svelte-check errors/warnings, **55 tests**, build passes.
- Manual: created a project, imported PNG + GIF, checked thumbs and sizes,
  downloaded a `.cajita`, unzipped it and inspected `bundle.json` / `project.json`
  / assets / thumbs, imported it through the library UI, reloaded the browser,
  reopened the project, saw the media persisted, and tested two tabs with the
  read-only lock.
- Screenshots: `design-mockups/shots/s1-library.png`,
  `design-mockups/shots/s1-editor.png`.

### What I learned

- A missing named export (`touchProject` imported from the wrong module) made the
  page blank. `svelte-check` did not catch it because `checkJs` is off; the Vite
  build and a browser reload did. **Always build and load the page after touching
  imports.**
- HMR can leave a stale module instance while a dynamic import sees the new one;
  a reload is the only trustworthy check after state-module edits.
- The project library is deceptively large for what it does: empty, loading,
  error, populated, importing, deleting, no-project, and read-only states all
  need handling.
- Pluralization is not optional in Spanish. `1 páginas` is immediately wrong.
- The test image was small enough that WebP was larger than the PNG, so the
  pipeline correctly kept the PNG. That is a useful policy, but it means “optimize
  to WebP” is not literal for tiny images.

### Next

S2: page CRUD and the free canvas, then typography and the custom font manager.
S1 stops before elements so there is no temptation to ship an editor that cannot
save.

---

## 2026-10-22 — design revision before S2

### What changed

- Added a global **interface size** control:
  - every UI type token is `calc(base × --ui-scale)`;
  - default `1.1`, range `0.9–1.3`, persisted in `localStorage`;
  - applied before first paint by the boot script and live from Ajustes with a
    tokenized `RangeField` primitive;
  - site content and stage typography are deliberately excluded.
- Raised the small end of the scale and removed hardcoded UI font sizes:
  tool labels, page-strip status, media names, stamps, and library copy now all
  follow the same scale.
- Renamed the library vocabulary from "cajitas" to **projects**: _Tus proyectos_,
  _nuevo proyecto_, _Nuevo proyecto_, _crear proyecto_. The app is still cajita;
  the `.cajita` file is still the bundle. Added the hierarchy to architecture and
  design-system: **cajita (app) → project → page → elements/media/links**.
- Changed tooltips to open **below** the trigger by default, including all top-bar
  buttons. Hidden tooltips now use `display: none`; `opacity: 0` kept them in the
  scrollable overflow and produced a phantom 6 px horizontal overflow at 1280.
- Updated the settings status copy from S0 to S1.

### Verification

- Slider changes `--ui-scale` live; 125% still fits the 1440 settings dialog and
  the editor shell.
- At 1280 with the default 1.1, topbar scrollWidth is now 1280 (was 1286).
- Tooltip measured below its button: button bottom 43, tooltip top 47.
- `npm run verify` after the revision.

### Default to confirm

**1.2** is the confirmed default (the user tested the slider and chose 120%).
`DEFAULT_UI_SCALE`, the CSS fallback, and the design-system note are the three
places that hold it.

---

## 2026-10-22 — S2: the page becomes a surface

### What changed

- Added the shared **geometry layer**: frame-to-percentage CSS, container-query
  text sizes, resize from eight handles, rotation with angle snapping, point-to-
  local conversion, and smart-guide snapping against stage edges/centres and
  other elements.
- Added **element factories** for text and images (and the valid model shape for
  video/audio), image aspect fitting, duplication, built-in/custom font stacks.
- Added **page commands**: append, duplicate, delete, set start, rename title,
  rename slug. Slug renames feed the bounded redirect queue; deleting a page
  clears page links that targeted it and always leaves a start page.
- Added a **command layer**: clone the project, mutate the clone, validate it,
  commit, and keep up to 40 snapshots. Pointer-driven updates coalesce within
  600 ms, so a drag/resize/rotate is one undo step.
- Added **undo/redo** in the top bar plus Cmd/Ctrl+Z, Shift+Cmd+Z, Cmd+Y, Delete,
  Backspace, and arrow-key nudging.
- Replaced the static stage with a real **free canvas**:
  - fixed stage aspect ratio fitted to the desk;
  - text rendered in `cqw` with the element font, size, line-height, tracking,
    alignment, colour, padding, and heading flag;
  - image blobs loaded through the asset repository with object URLs;
  - selection, multi-select, drag, eight-handle resize, rotate;
  - smart guides, snap toggle, locked/hidden states;
  - double-click inline text editing.
- Added the **element inspector**: frame, opacity, lock/hide, duplicate, delete,
  front/back, text typography, image alt/fit/pixelated.
- Added the **page inspector**: title, slug (commit on blur), transition,
  background, add/duplicate/delete/start, layers, font manager, project stats.
- Added the **layers list** with visibility/lock indicators and one-step order
  controls.
- Added the **custom font manager**: TTF/OTF/WOFF/WOFF2, FontFace validation,
  name/weight/style/license, usage-safe delete, two-font limit, previews, and
  live loading on the canvas.
- Excluded font assets from the media grid; they live in the typeface manager.
- Updated Settings status to S2.

### Verification

- `npm run verify`: 0 svelte-check errors/warnings, **81 tests**, build succeeds.
- Manual QA: created a project, added text, imported and inserted an image,
  dragged/resized/rotated, used smart guides, edited text inline, undid/redid,
  added/duplicated/deleted a page, changed a slug, added a WOFF2 custom font,
  applied it to text, and checked reload persistence.
- Browser console had no uncaught exceptions in the final clean run.

### What I learned

- A `$state` array containing snapshot objects cannot be fed straight back into
  `structuredClone`: the entries are proxies. `$state.snapshot(previous)` before
  restoring fixes undo.
- HMR can leave the app and a dynamic import on different module instances. For
  QA that touches the store, restart the dev server instead of trusting a stale
  page. This produced false "session is null" failures during the sprint.
- One command = one clone = one validation. It is slightly wasteful for pointer
  moves, but the 600 ms coalescing keeps history correct and the code honest.
- The same `elementToCss`/`pxToCqw` path is the only way to keep editor and
  future export from drifting.
- Fonts are assets, not media. Filtering them out of the media grid was necessary
  immediately after the first custom font import.

### Deferred deliberately

- links, map, fichas, page link counts;
- video/audio element inspectors (model accepted, tools disabled);
- grid editing, type preset, page reorder, drag/drop assets, asset replace/search;
- zoom/pan, stage grids, project rename;
- export, preview, publishing.

---

## 2026-10-22 — post-S2 QA: image stability and Ficha modes

### Image flash during transform

The user reported that images turned into a solid block/twinkled while moving or
resizing. The cause was not a deliberate placeholder: every pointer command
replaces the project object, `CanvasAsset`'s effect reran, and its cleanup
revoked the current `blob:` URL and made a new one. The image had to decode again
on every pointer move.

Fix: a module-level `asset-urls.svelte.js` cache keyed by `projectId:assetId`.
Components ask for a URL; the cache returns the same object URL until the project
is closed or the asset is deleted. Verified during drag that the `src` stays
identical across pointer moves. No debounce or solid-colour fallback is needed.

### Theme decision

The Riso app chrome was tiring in real use. The app now has **one chrome theme,
Ficha**, with **light and dark modes**. Riso remains a **project site palette**;
the editor does not change colour with the site. The stage paper stays light in
dark mode so project colours and site typography remain true.

- `data-theme="ficha"` + `data-mode="light|dark"`.
- `localStorage['cajita.mode']`; dark is the default (changed after real use);
  boot applies before paint.
- Sun/moon toggle in the top bar and library; mode control in Settings.
- `ficha-dark.css` with the same token contract; parity test updated.
- `riso.css` removed from app styles. The six site palettes, including Riso, are
  unchanged.

### Housekeeping

- Added `**/.DS_Store` to `.gitignore` (the root pattern already existed).
- Verification: 81 tests, 0 svelte-check warnings, production build.
- Manual: light/dark persistence, dark settings, image drag source stability,
  no uncaught console errors after a clean dev-server restart.

---

## 2026-10-22 — S3: the map makes the project navigable

### What changed

- Added element links: none / page / URL / ficha. Page links stay on page IDs;
  URL links validate `http(s)`, `mailto`, and `tel`; a ficha link requires at
  least one metadata field.
- Added seven fixed ficha fields (title, creator, date, medium, rights, source,
  description), an inspector editor, and a native `<details>` card preview
  (`FichaCard.svelte`).
- Added the derived link graph in `links.js`: edges from elements, inbound and
  outbound counts, external/card counts, orphans, and broken page targets. No
  separate edge table.
- Added page outbound-link counts to the left page list.
- Added the **map view**:
  - top-bar page/map switcher;
  - deterministic auto-layout, 232 × 126 cards, start/orphan/broken flags;
  - SVG wires attached to card edges, only for page-to-page links;
  - external/ficha badges and inbound counts;
  - click a card to open the page and return to the page view.
- Kept the layers list mounted below the inspector even while an element is
  selected. Previously layers disappeared when a selection existed, which made
  switching elements from the list impossible — found during map/ficha QA.
- Updated Settings/version copy to S3.

### Verification

- `npm run verify`: 0 svelte-check errors/warnings, **88 tests**, build succeeds.
- Tests: projection, orphans, inbound targets, broken links, URL/ficha counts,
  metadata-content validation, unsafe URL rejection.
- Manual: created Sobre and Contacto, linked the heading and body, added a ficha
  to the image, opened the map, followed a wire by clicking its card, inspected
  the page-link target, opened the native ficha card, and confirmed page link
  counts.

### What I learned

- A map is a projection, not a second document. Deriving every wire and count
  from elements keeps it honest and makes deletion/slug changes free.
- Wires from centre to centre disappear under opaque cards. Attaching them to
  card edges made the map legible without any routing library.
- The layer list has to be persistent. Hiding it on selection made the inspector
  a trap; the fix was structural, not a new button.
- Native `<details>` is the right primitive for a ficha: no focus trap, no
  custom disclosure state, keyboard support for free.

### Deferred

- export/preview/publishing;
- manual map positions, wire selection/labels, pan/zoom, auto-organise by depth;
- custom ficha fields;
- video/audio inspectors, grid, zoom/pan.

---

## 2026-10-22 — inspector: precision out of the way

- Moved geometry, opacity, and the optional layer name into a single native
  `<details>` section, **Ajustes precisos**, closed by default. The closed summary
  still shows the current frame (`x 70 · y 150 · 600×250 · 0°`), so precision is
  available without opening it.
- Renamed the `element.name` field to **nombre de capa** and explained it. It is
  the optional label used by Capas and the ficha fallback, not a page title.
- Kept lock/hide as a quick row at the top of the element inspector.
- Removed layers from the element inspector; **Capas** is page-level again and
  appears when no element is selected.
- Extended the reusable `Section` primitive with a native collapsible variant
  instead of a one-off disclosure.
- Choosing a different element remounts the inspector so precision starts closed.

Verification: 88 tests, 0 svelte-check warnings, build passes; manual collapsed
and expanded states plus page-only layers at 1440 × 900 in dark mode.

---

## 2026-10-22 — S4: the site leaves the editor

### What changed

- Added **direct media placement**. Selecting a tile shows a **colocar** action;
  double-clicking an image tile also places it. The image is inserted at the
  active page and selected. Video/audio placement is explicitly disabled until
  their inspectors exist.
- Split **text typography** into direct and precise:
  - direct: content, face, size, colour, alignment, heading;
  - **tipografía precisa** (collapsed): line height and tracking.
- Kept **Ajustes precisos** (geometry, opacity, layer name) collapsed; the
  inspector now has two small disclosures only where they belong.
- Added the static site renderer (`src/lib/export/site.js`):
  - start page at `index.html`, other pages at `slug/index.html`;
  - relative assets/CSS/JS from each page;
  - page links resolved from IDs; URL links sanitised;
  - native `<details>` fichas;
  - redirect stubs; 404; `.nojekyll`;
  - used assets and fonts only.
- Added the ZIP exporter with compressed text and uncompressed media. Built-in
  fonts are copied only for families in use; custom fonts only when text uses
  them.
- Added **preview** using the same HTML/CSS renderer with blob assets/fonts and a
  small `postMessage` navigate protocol. The parent swaps the iframe document;
  links work without a second layout implementation.
- Wired top-bar preview and export, with site ZIP name and success/error toast.
- Tested the exported folder over `http://127.0.0.1:8000/`, not only in the app.
- Updated settings/library version labels to S4.

### Verification

- `npm run verify`: 0 svelte-check warnings, **94 tests**, build succeeds.
- Exported ZIP contains index/sobre/contacto, CSS, JS, used image, built-in
  fonts, 404, `.nojekyll`; no custom font when unused.
- Preview: current page, page selector, internal navigation, images, fonts.
- Export folder served over HTTP and screenshotted.
- Tests: file tree, links/headings/images/fichas, redirects, used assets, cqw
  geometry.

### Philosophy written down

The app now explicitly has **two speeds**:

1. Immediate controls for the quick collage/zine gesture.
2. Precise controls in native, closed disclosures.

This is not a Canva/Figma replacement. The precision section is for correcting
the gesture, not for turning the inspector into a settings wall.

### Deferred

- GitHub Pages publishing (S5), custom domain/canonical URL, sitemap/robots;
- single-file export;
- export worker/progress/cancel;
- page transitions and custom audio controls in export;
- video/audio placement and inspectors.

---

## 2026-10-22 — S4 polish: lighter chrome, direct placement

- Text alignment became three icon buttons on the same row as size and colour.
  `SegmentedControl` now supports icon-only options with `aria-label`/`title`.
- Replaced the media **colocar** button and double-click hint with a two-step
  gesture: select the image tile, then click the canvas at the insertion point.
  The stage cursor becomes a crosshair while armed; Escape clears the asset.
- Removed the floating stage toolbar (`imán`, `seleccionar`, size box). Snap stays
  on; the status line keeps only page size and element count.
- Added desktop collapse/restore for left panel, inspector, and page strip. They
  become 28 px rails with direction chevrons. The layout uses CSS custom
  properties for the active column/row sizes, so restoring does not rebuild the
  editor.
- Export letterbox now uses each page's background colour; page and letterbox
  blend instead of sitting on the site theme colour.
- Page size remains fixed; a setter is explicitly deferred.
- Re-verified alignment icons, direct placement, all three collapses, preview,
  and an exported site served over HTTP.

Verification: 94 tests, 0 svelte-check warnings, build passes; screenshots
`s4-text.png`, `s4-text-precise.png`, `s4-collapsed.png`, `s4-preview.png`,
`s4-export.png`.

---

## 2026-10-22 — S5: publish to GitHub Pages

### What changed

- Added **Publish** dialog:
  - fine-grained PAT, session storage by default, optional remember;
  - “forget token”;
  - existing public `owner/repo`, fixed `gh-pages` branch;
  - plain public-site warning;
  - localized progress, success URL, open-site, unpublish, and ZIP fallback.
- Added `domain/publish/plan.js`:
  - `owner/repo` parsing (including GitHub URLs);
  - SHA-256 manifest;
  - upload/delete/unchanged diff against the last successful manifest;
  - Git tree entries with cached blob reuse and deletions.
- Added `domain/publish/github.js` pure request builders and API paths.
- Added the browser transport:
  - repo check;
  - first branch creation or non-force update;
  - blobs → tree → commit → ref;
  - Pages create/update;
  - build polling with timeout;
  - unpublish.
- Refactored site export into `buildSiteEntries()`, shared by ZIP and publishing.
- Publish cache lives in `localStorage` per project/repo; it stores hash + Git blob
  SHA + public URL. The token never enters IndexedDB, project JSON, bundles, or
  the exported site.
- Added the ZIP fallback button inside the publish error state.
- Updated S5 plan/architecture/design/testing/version labels.

### Verification

- `npm run verify`: 0 svelte-check warnings, **102 tests**, build succeeds.
- `publish.test.js` covers parsing, pages URL, manifest, diff, cached blob reuse,
  tree/commit payloads, Pages source.
- Mocked end-to-end publish in the browser:
  - first publish: 11 blobs, tree/commit/ref, Pages, build `built`;
  - second publish: 0 new blobs, 11 unchanged; ref update;
  - returned `https://owner.github.io/repo/`.
- Fake-token UI test: localized auth error, no raw JSON, ZIP fallback.
- Token storage verified: default session, remembered local; forget clears both.
- **Not verified:** a real publish with a real token/public repo. This is recorded
  as the one open checklist item, not hidden.

### Deferred

- repo creation from the app; device flow; custom domains; private repos;
  sitemap/robots; publish history UI.

---

## 2026-10-22 — layer, zoom, copy, and map polish

- Moved lock/hide and layer naming out of the element inspector:
  - **Capas** rows now have lock and eye controls;
  - double-clicking a row edits its optional name in place;
  - no input is shown until the double-click.
- Replaced the layer up/down arrows with HTML5 drag-to-reorder. A selection-
  colored line marks the insertion gap; undo restores the previous order.
- Added canvas zoom:
  - 25–400%, − / + in 10% steps;
  - **fit width** returns to 100%;
  - 24 px stage margin;
  - the desk scrolls when the stage is larger than the available area;
  - sidebars collapsing reflows the fit automatically.
- Renamed **Dirección** to **dirección web**; removed the always-on
  `minúsculas, números y guiones` hint. The label is the page URL slug.
- Fixed `Añadí` → `Añade` and changed English copy to American spelling
  (`color`, `center`, etc.). Fixed the English slug error, which was still in
  Spanish.
- Routed map wires through column gutters and row gaps:
  - a long same-column edge no longer passes behind intervening cards;
  - different-column edges enter the target through an adjacent row gap;
  - arrowheads still land on the target edge.
- Added pure tests for full layer ordering and map edge routing.
- Page size remains fixed; no size control was added.

Verification: 105 tests, 0 svelte-check warnings, build passes; screenshots
`s5-layers.png` and `s5-map-route.png`.

---

## 2026-10-22 — add-image, layer drop, text fit, duplicate media

- **Añadir imagen** now always opens the picker, imports into Medios, and places
  the image immediately. It no longer silently uses a previously selected
  medium. Re-importing the same file places the existing image instead of
  creating a duplicate Medios tile.
- `importMedia` returns `skippedAssets` so the add-image path can use an existing
  hash. Medios also defensively hides duplicate hashes.
- **Layer drag** now uses the whole list as the drop target. The insertion line is
  `pointer-events: none`; dropping on the line, a gap, or the end works.
- **Text auto-height**: text content is measured after text/content/font/width
  changes and the frame height is fitted without creating an undo entry.
  Selection handles therefore hug the text, including padding and rotated text.
- **Text editor contrast**: the textarea background is chosen from the text
  color's luminance (light paper for dark text, dark ink for light text), with a
  matching caret. It is no longer forced to the dark app panel.
- Verified with the real file chooser:
  - first add: element +1, Medios +1;
  - same file again: element +1, Medios unchanged;
  - layer drop on the insertion line works;
  - text selection and editor background verified at 1440 × 900.
- 105 tests, 0 svelte-check warnings, build passes.

---

## 2026-10-22 — S6: page size

- Added **tamaño de página** to the page inspector: shared width/height fields in
  the 320–4000 px range, with a short note that it applies to every page.
- Added pure `resizeStage()`:
  - width ratio scales x, width, height, font size, tracking, and padding;
  - height ratio scales y positions;
  - shapes are not stretched when the aspect ratio changes.
- Text auto-height re-fits after a resize, so handles and exported boxes remain
  aligned with the content.
- Export, preview, stage footer, and zoom all consume the new shared stage size.
- Tests: `stage.test.js` covers scaling, no-op, and bounds.
- Final layer-drop polish: the insertion line now renders after the last row too.

Verification: **108 tests**, 0 svelte-check warnings, build passes; screenshot
`s6-page-size.png`. S5 live GitHub publishing remains the only unverified step.

---

## 2026-10-22 — publish network diagnostics

- The publish dialog was mapping **every** non-HTTP failure to “No se pudo conectar
  con GitHub”. Split it:
  - `NETWORK` = fetch itself failed;
  - `PUBLISH_LOCAL` = build/manifest/preparation failed.
- Network/local errors now expose a small **detalles técnicos** disclosure with the
  browser error (never the token), plus a hint to open
  `https://api.github.com/rate_limit` in the same tab.
- Tokens are stripped of all whitespace/line breaks and a leading `Bearer` before
  storage/request. A wrapped token pasted from a password manager can otherwise
  produce an invalid Authorization header and look like a network failure.
- No functional publish path changed; 108 tests and build pass.

---

## 2026-10-22 — GitHub Pages creation needs administration

- A fine-grained token with **Contents: read/write** and **Pages: read/write**
  can upload the `gh-pages` branch but cannot necessarily **create** the Pages
  site; that is a repository-administration operation.
- Added `GET /pages` before creation. If Pages already exists, cajita skips
  `POST /pages` and proceeds to poll the build.
- If creation returns 403, the error is now `PUBLISH_PAGES_SETUP`, with:
  - a link to the repository's Pages settings;
  - a one-time manual setup path (`gh-pages`, `/` root);
  - the request method/path in technical details.
- Corrected the permission docs: Administration is optional for automatic Pages
  creation, not required for uploading files or updating an existing Pages site.
- Token errors now include the failed API request in the diagnostic disclosure.

---

## 2026-10-22 — repository 404 is often token visibility

- A GitHub 404 for `GET /repos/owner/repo` does not prove the repo is missing.
  Fine-grained PATs return 404 for repositories outside their **Repository
  access** list, and organization repos can also be hidden until SSO is
  authorized.
- Split `PUBLISH_REPO` (bad owner/repo format) from `PUBLISH_REPO_ACCESS`
  (GitHub 404). The latter now shows:
  - the exact failed API path in technical details;
  - a link to the token settings;
  - a link to the repository;
  - guidance for Repository access, All repositories, and Configure SSO.
- 108 tests and build pass; still no live publish with a real token.

---

## 2026-10-22 — repository input formats

- The message “Escribe un repositorio…” is the **format** error, not the new
  token-visibility 404. Added acceptance for:
  - `owner/repo`;
  - `github.com/owner/repo`;
  - `git@github.com:owner/repo.git`;
  - GitHub URLs with extra paths;
  - Pages URLs `https://owner.github.io/repo/`.
- Reworded the error to state the accepted forms instead of implying the repo
  might not exist.

---

## 2026-10-22 — fine-grained token 404

- Confirmed the repository check runs `GET /repos/<owner>/<repo>`.
- Fine-grained PATs can return 404 when the repository is outside the token's
  resource-owner/Repository access, when an organization has not approved the
  token, or when SSO is pending. A classic PAT with the `repo` scope is a useful
  isolation test; Publii may have been using a classic token or another account.
- Repo-access guidance now mentions the classic-token test.
- No code path writes anything before this check.

---

## 2026-10-22 — ref update endpoint bug

- Root cause of the publish 404: GitHub’s Git References API uses
  `GET /git/ref/{ref}` (singular) but `PATCH /git/refs/{ref}` (plural).
  Cajita incorrectly used the singular read endpoint for both.
- When the branch already existed, the upload succeeded through tree and commit,
  then the final ref update returned `404 Not Found`.
- Added `updateRefApi()` using `/git/refs/heads/<branch>` and switched the PATCH.
  Creating a missing branch still uses `POST /git/refs`.
- Added a path assertion for the update endpoint. 108 tests pass.

---

## 2026-10-22 — S7: canonical URLs and custom domains

- Added optional **dominio personalizado** to the publish dialog.
- Publish settings now persist in the project (never the token):
  provider, owner, repo, branch, custom domain, `lastPublishedAt`.
- Added canonical precedence:
  explicit `meta.canonicalUrl` → custom domain → GitHub Pages URL.
- Export now includes:
  - `CNAME` only for a custom domain;
  - `robots.txt`;
  - `sitemap.xml` when a canonical base exists;
  - `<link rel="canonical">` and Open Graph title/URL/description per page.
- Publishing passes `cname` when creating Pages and returns the custom-domain URL.
- Validation: custom-domain normalization, reject `*.github.io`, invalid hosts.
- Tests cover normalization, canonical precedence, CNAME/sitemap/robots, and
  canonical/OG tags.

Verification: **110 tests**, 0 svelte-check warnings, build passes; screenshot
`s7-publish-domain.png`. Real DNS/certificate provisioning remains a manual
custom-domain test.

---

## 2026-10-22 — S8: video and sound

- Enabled the `video` and `sonido` tools with matching file pickers.
- New video/sound files are imported into Medios and placed immediately; the
  select-media → click-canvas path now covers image, video, and sound.
- Added `mediaFrame`: video keeps the source aspect ratio; sound gets a compact
  76 px bar.
- Added editor players:
  - video with a custom play/pause overlay;
  - sound with play/pause, label, and a small waveform.
  - media starts paused, and the play controls stop pointer propagation so they
    do not start a drag.
- Added inspectors:
  - video: fit, controls, autoplay, loop, muted;
  - sound: label, controls, autoplay, loop.
- Export uses native `<video>` / `<audio>` with the same settings.
- Fixed the audio export markup (no nested `.el-audio` frame).
- Tests: media frame defaults and video/audio export.

Verification: **112 tests**, 0 svelte-check warnings, build passes; screenshot
`s8-video-audio.png`. Manual test used a 2 s MP4 and a WAV, then removed the test
assets/elements.

---

## 2026-10-22 — S9: page transitions and publish history

### Page transitions

- Exported pages now set `data-transition` and mode-specific CSS custom
  properties on the root.
- Shared CSS opts into native cross-document View Transitions and animates the
  old/new root snapshots at 240 ms:
  - fade via opacity;
  - slide via translateX;
  - cut via duration 0.
- No link interception. Unsupported browsers and reduced-motion users get an
  instant navigation.
- Preview animates the incoming iframe wrapper for fade/slide; outgoing preview
  documents cannot be animated because the parent swaps them.

### Publish history

- Added `project.publish.history`, capped at 5, no token.
- Successful publish records date, owner/repo, branch, URL, commit, and
  uploaded/deleted/unchanged counts.
- Unpublish records date, owner/repo, and branch.
- Publish dialog has a collapsed **historial** with site/commit links. No
  rollback and no failed attempts.
- History travels in the `.cajita` bundle.

Verification: **114 tests**, 0 svelte-check warnings, build passes. Unit tests
cover transition serialization/style and history cap/order; a real visual page
navigation remains a manual browser check.

---

## 2026-10-22 — preview start and ref conflict

- Preview now opens on the **active editor page**; closing resets the page, so it
  no longer reopens on the last previewed page.
- Fixed publish conflicts after a successful publish:
  - GitHub API requests now use `cache: 'no-store'`, preventing a stale cached
    ref read after branch creation/update.
  - If a ref update still returns 409/422, cajita re-parents the same tree on the
    current branch tip and retries the ref update once.
- Preview transition is incoming-only by design; the parent swaps the iframe
  document. Export uses cross-document View Transitions and remains the source of
  truth.

---

## 2026-10-22 — one-second transitions and blob-size errors

- Transition duration increased from 420 ms to 1000 ms in export and preview.
- Transition semantics remain outgoing-page based.
- GitHub 413/422 responses whose message mentions an oversized input are now
  `PUBLISH_FILE_TOO_LARGE`, not `PUBLISH_CONFLICT`.
- The blob upload wraps its error with the file path and size in MB. The dialog
  explains that the branch was not updated and offers the ZIP/manual-upload
  fallback.
- Browser REST blob upload base64-encodes the file, so large video/audio can hit
  GitHub's request limit even below the repository's 100 MB file limit. A local
  git push or a smaller file avoids the API limit.

---

## 2026-10-22 — S10: large media, embeds, and publish polish

- Video import cap is now **20 MB per file**; image/audio keep the existing caps.
- Added one `embed` element with providers YouTube and Observable:
  - validated URL parsing and canonical embed URLs;
  - no raw HTML, no imported bytes;
  - separate YouTube/Observable tools opening a shared URL/title/caption dialog;
  - editor placeholder only; no third-party request while editing;
  - preview/export sandboxed iframes, source link, title/caption;
  - hidden link/ficha controls because the iframe is already interactive.
- Medios is now a horizontal strip with 82 px tiles instead of a growing grid.
- Pages progress now waits for a build whose `commit` matches the new commit,
  instead of accepting a previous `built` state.
- Added a “usar esta pestaña” takeover to recover stale localStorage tab locks.
- Fixed `addElement` to forward embed provider/URL/title/caption fields.
- Tests cover embed URL parsing, validation, export, and the 20 MB video cap.

Verification: **120 tests**, 0 svelte-check warnings, build passes; screenshot
`s10-observable.png`.

---

## 2026-10-22 — Observable cell embeds, YouTube 153, modal drags

- Observable parser now:
  - accepts `old.observablehq.com`;
  - decodes `%40` to `@`;
  - preserves `?cells=…`, so users can embed selected cells rather than the whole
    notebook;
  - keeps the source host for archived notebooks.
- YouTube embeds now use `referrerpolicy="strict-origin-when-cross-origin"` instead
  of `no-referrer`, which was causing player configuration error 153. Observable
  still uses `no-referrer`.
- Dialog backdrop closing now requires the pointer press to start on the backdrop.
  Selecting text by dragging from an input and releasing outside no longer closes
  the dialog.

---

## 2026-10-22 — embed background and preview referrer

- Observable embed backgrounds are now white; YouTube remains black.
- Preview now loads through `public/preview.html`, a real same-origin shell, and
  receives page HTML via postMessage. This gives YouTube a usable HTTP referrer
  instead of a `blob:` document, fixing the preview-only error 153 path.
- Archived Observable URL and cells query are preserved through the shell.
- Preview page start remains the active editor page; outgoing transition wrapper
  is unchanged.

---

## 2026-10-22 — preview shell listener regression

- The real preview shell fixed YouTube's referrer but `document.open()` removed
  the shell's `message` listener after the first page, so later preview
  navigation changed the selector but left the old page visible.
- `preview.html` now removes and re-registers its render listener around
  `document.open/write/close`. Clicking an in-page link renders the destination,
  and subsequent selector changes keep working.

---

## 2026-10-22 — S11: circles, squares, triangles

- Added one `shape` element with three kinds: circle, square, triangle.
- Added one **Forma** tool; it opens a compact picker rather than three permanent
  toolbar buttons.
- Shapes use the theme accent as fill and theme ink as border, with border width
  0 by default.
- Added shape, fill, border color, and border width to the inspector.
- Canvas and export render inline SVG. Borders use non-scaling strokes; stroke is
  suppressed at width 0.
- Shapes use the normal element behavior: links, layers, lock/hide, duplicate,
  delete, opacity, and precise geometry.
- Fixed `addElement` forwarding for shape fields.
- Layered icon and inspector stamp now identify Forma rather than falling back to
  sound/type text.
- Tests cover shape creation, validation, and SVG export.

Verification: **122 tests**, 0 svelte-check warnings, build passes; screenshot
`s11-shapes.png`.

---

## 2026-10-22 — shape-fitting selection outline

- Shape selection now uses an SVG outline matching circle, square, or triangle
  instead of the rectangular selection border. Resize handles remain on the
  bounding box.
- Removed the rectangular `.element.selected` outline for shapes so only the
  shape contour is emphasized.

---

## 2026-10-22 — correction: rectangular bounding box

- The silhouette selection outline was a misunderstanding. Shape selection is
  back to the normal rectangular bounding box.
- The box is exactly the shape frame width/height (verified against the DOM
  rectangles) and handles stay on that box.
- Shape geometry now fills its frame (circle r50, square 100×100, triangle
  50/0–100/100–0/100) so the visible shape bounds and the selection box match.
- Removed the shape-only `.element.selected { outline: none }` exception.

---

## 2026-10-22 — shape frame/SVG resize mismatch

- The canvas ShapeArt SVG had no explicit width/height, so it could retain an
  intrinsic SVG size while the selection frame resized. The SVG now fills the
  frame (`display:block;width:100%;height:100%`).
- Verified after resizing the south handle: selection and SVG rectangles match
  exactly (same x, y, width, height).
- Free resize can distort a circle into an ellipse; Shift already preserves the
  aspect ratio through the generic resize path.

---

## 2026-10-22 — S12: schema-driven fichas

- Added `project.fichaSchema.fields` with stable ids, keys, labels, types
  (`text`, `longtext`, `url`), and required flags.
- Added `project.fichas` records with unique code, label, image asset, alt text,
  and values keyed by field id.
- Added `project.fichaSettings.movable` (default false) for S14.
- Added one **Fichas** tool opening a wide manager:
  - Esquema tab: add/rename/type/require/delete fields, explicit save;
  - Fichas tab: search, create, edit, delete, image select, field values, place.
- Added a `ficha` element storing only `fichaId`; same record can appear on
  several pages.
- Added canvas rendering with image and object-code badge.
- Added native `<details>` export card with code, label, schema fields, and
  http(s) URL links. The card is centred over the image so it is not clipped below
  the viewport.
- Ficha images are included in `usedAssets`; without this the exported/published
  site would omit the image.
- Deleting a ficha removes its placed elements in one command.
- Older projects gain empty ficha collections during migration.
- Legacy `link.kind = 'meta'` remains valid; the old ficha link option is hidden
  for elements that do not already use it.
- Fixed a Svelte state clone error in the manager by snapshotting proxies before
  `structuredClone`.

Verification: **128 tests**, 0 svelte-check warnings, build passes; screenshots
`s12-ficha-editor.png` and `s12-ficha-stage.png`.

---

## 2026-10-22 — S13: validated ficha CSV

- Added a quote-aware CSV reader with BOM/CRLF handling, quoted fields/newlines,
  and comma/semicolon/tab detection.
- Added schema-first CSV validation:
  - structural code/label/image headers;
  - schema keys or labels for metadata;
  - unknown/duplicate headers block import;
  - no automatic schema creation;
  - unique codes within the CSV and against existing records;
  - required values and http(s) URL validation;
  - image filename matching with non-blocking warnings.
- Added a preview panel in the Fichas manager:
  - row preview table;
  - error and warning counts/lists;
  - downloadable error report;
  - import disabled while errors exist.
- Added CSV template and export using `code,label,image` plus schema keys.
- Bulk imports are one undoable command; records are created but not auto-placed.
- Added tests for CSV quoting/delimiters/BOM, header errors, duplicate codes,
  URL/required errors, image matching, and round-trip export.

---

## 2026-10-22 — S14: movable fichas

- Added one project-level checkbox in Fichas → Esquema:
  `permitir mover las fichas en el sitio publicado`.
- Fixed is the default. Fixed mode exports no movement script and no body flag;
  the native `<details>` card works unchanged.
- Movable mode:
  - adds `data-ficha-movable="true"` to the body;
  - adds a progressive runtime to `cajita.js` and to preview's inline script;
  - attaches to each `details.el-ficha`;
  - uses a 6 px drag threshold so a normal click still opens the card;
  - suppresses the click after a drag;
  - clamps positions inside the stage;
  - writes percentage `--x`/`--y` values so resize keeps relative placement;
  - supports arrow keys (5 px, Shift 25 px) on the focused summary;
  - keeps positions session-only and resets on reload.
- Runtime now waits for DOM ready; preview executes inline scripts in the head,
  so without this guard the first preview had no ficha elements to enhance.
- Verified in preview: movable class applied, drag changed `--x`/`--y`, card stayed
  closed after dragging, and a plain click opened it.

---

## 2026-10-22 — S15: ficha table and contained cards

- Added a **Tabla** tab to the Fichas manager:
  - code, name, image thumbnail, and every schema field;
  - required markers in headers;
  - dash for empty values;
  - search;
  - sticky header and horizontal scroll;
  - click/Enter opens the record in the editor.
- The table is read-only; explicit editing stays in the validated Fichas form.
- Constrained the ficha card to its image frame:
  width `min(360px, calc(100% - 16px))`, height `calc(100% - 16px)`, centered,
  internal scroll. Verified card and ficha DOM rectangles; the card is fully
  inside even for a ficha near the stage bottom.
- Screenshots: `s15-ficha-table.png`, `s15-ficha-card-fit.png`.

---

## 2026-10-22 — S16: CSV updates and bulk placement

- Added explicit CSV modes:
  - create-only (existing codes error);
  - create-and-update (matching codes update in place).
- CSV reports carry per-row action and existing record id; preview shows
  create/update counts and an action column.
- Updates preserve record ids and therefore placed ficha elements.
- Blank or unmatched image cells keep the existing image on update; matched
  images replace it.
- Added optional grid placement for newly created records:
  - up to three columns;
  - image aspect fitting;
  - separate undoable command;
  - confirmation when the active page already has elements.
- Verified manually: import + place, update label while keeping the placed ficha,
  then import two records with grid placement.
- Live GitHub Pages smoke test with fichas/movable still requires the publishing
  token; export/runtime assets are covered by tests.

---

## 2026-10-22 — S17: inline ficha table editing

- Code, label, and schema fields are now editable directly in Tabla.
- One cell edits at a time; Enter commits, Escape cancels, blur commits.
- Validation happens before the command: unique code, required label/fields, and
  http(s) URLs. Invalid values stay visible with an inline error while the project
  remains unchanged.
- Valid cells commit through `updateFichaRecord` and refresh the selected form
  draft.
- Images and longtext stay in the full editor; table field values are single-line.
- Switching tabs cancels an unfinished cell edit; opening from a row action still
  opens the full editor.

---

## 2026-10-22 — S18: persistent ficha positions

- Movable ficha positions now persist in localStorage per project, page, and
  element: `cajita-fichas:<projectId>:<pageId>`.
- Runtime restores stored percentages on load, clamps to the stage, and writes on
  drag end and keyboard movement. Storage failures degrade to session-only.
- Added a localized `reiniciar fichas` / `reset fichas` button inside movable
  pages with fichas. It restores authored positions and removes the storage key.
- Verified: drag persisted, preview reopen restored, reset restored authored
  values, and the storage key was removed.
- Fixed mode still has no runtime, reset button, or storage.

---

## 2026-10-22 — S19: schema ordering and inline ficha images

- Added up/down controls to schema fields. Reordering is draft-only until save;
  the saved order drives card rows, table columns, and CSV template/export.
- Added an inline image select to Tabla image cells:
  - choose an existing image asset;
  - choose “sin imagen” to remove it;
  - update is immediate and preserves record id + placed elements;
  - switching tabs cancels the open picker.
- Manually verified field reordering, saving, image replacement, and image
  removal.

---

## 2026-10-22 — S20: collection ZIP import

- Added a ZIP import path in Fichas: `fichas.csv` + optional image files.
- ZIP reader:
  - prefers `fichas.csv` when multiple CSVs exist;
  - reduces image paths to basenames and rejects duplicate basenames;
  - ignores hidden and `__MACOSX` entries;
  - enforces image count and archive/CSV size guards.
- Import flow:
  - validates the CSV before importing media;
  - on confirm, turns ZIP images into Files and runs them through `importMedia`;
  - revalidates the CSV against the new assets;
  - imports records with the existing create/update and grid placement logic.
- CSV image matching now accepts `images/foo.jpg` as well as `foo.jpg`.
- Added collection ZIP reader tests.

---

## 2026-10-22 — S22/S24: small/full export and worker ZIP

- Exportar sitio now opens an options dialog with exact weights:
  - small: one portable HTML;
  - full: the complete ZIP.
- Small:
  - all pages extracted into `.sf-page` sections;
  - hash router based on page ids/slugs;
  - CSS, fonts, images, video, audio as data URLs;
  - no sitemap/robots;
  - fichas fixed and transitions omitted.
- Recommendation is full when small is over 20 MB or video/audio is present;
  users may still force small.
- Full ZIP keeps pages/assets/fonts/SEO and movable runtime.
- ZIP compression moved into a Vite module worker (`export-worker.js`), keeping
  the main thread responsive; the build emits a separate worker chunk.
- Added a single-file builder test; total 137 tests.
- Manual: downloaded the 81 KB single HTML, opened it from file://, and navigated
  Inicio → Sobre. Downloaded the 59 KB ZIP and checked its contents.

---

## 2026-10-23 — S23: ficha fixes, schema eyes, media manager

- Fixed preview ficha images: `buildPreview` now collects record image assets,
  not only element assets. Verified `naturalWidth` in preview.
- Schema fields gained `visible` (eye). Hidden fields remain editable in Tabla but
  are omitted from cards. `fichaSettings.showCode` hides code on cards and canvas.
- Added Medios → Ver todos:
  - search; all/images/fichas/unused filters;
  - detail panel with size/dimensions/usage;
  - safe deletion; assets used by fichas are now protected too.
- Added explicit schema derivation when the schema is empty and the CSV has extra
  columns. Type inference: URL/longtext/text. It is never silent.
- Increased CSV/ZIP action label size and explained grid placement.
- Export now recommends full when the project has fichas; copy states GitHub Pages
  always publishes the full site.
- Confirmed the apparent size difference: editor is zoomed to fit, preview/export
  show the stage at page scale; frames are unchanged.

---

## 2026-10-23 — S25: reset, media filters, clipboard, p5, language/favicon

- Fixed preview reset:
  - added a preview-toolbar “reiniciar fichas” button for movable pages;
  - runtime reset now uses document event delegation.
- Media manager filters now include video and audio; Medios import label shortened
  to “importar”.
- Added element/media clipboard:
  - Cmd/Ctrl+C/X/V for selected elements;
  - copied media assets paste as image/video/audio elements;
  - heading copies drop heading status if the page already has a heading;
  - fixed proxy cloning with `$state.snapshot`.
- Language is now a globe IconButton toggle, matching the light/dark control.
- Added p5 provider for `editor.p5js.org/.../full/<id>` URLs, toolbar button, and
  iframe export.
- Favicon is now a plain cream rectangle on the dark background.
- Verified reset in preview, copy/paste of text and media, p5 insertion, and the
  media manager filters.

---

## 2026-10-23 — S25 extras: masks, audio, page strip, paste/UI fixes

- Removed the duplicate left page list; page creation/selection lives only in the
  bottom Páginas strip.
- Added `PageMiniature`: real page thumbnails from element frames, including
  images, fichas, text, shapes, embeds, and masks.
- Added polygon lasso masks:
  - image element `mask` points;
  - inspector dialog, click to add points, undo/clear;
  - `clip-path` in canvas, thumbnails, and export;
  - validation and clip-path tests.
- Added custom exported audio player with play/progress/time and a noscript
  native fallback; player script included in export and preview.
- Fixed double paste by keeping the keydown handler only.
- Expanded p5 iframe/preview permissions and same-origin referrer policy.
- Styled audio, page thumbnails, and image masks manually checked.

---

## 2026-10-23 — S25 follow-up: p5, audio, layout, mask visibility, ficha front

- Found the p5 bug: `embedSrc` still only handled YouTube/Observable, so the p5
  iframe was never emitted. Added p5 resolution and an embedSrc assertion.
- Audio: removed the outer frame/padding and fixed the play button contrast;
  the player now uses one frame, a dark square play control, progress, and time.
- Layout: left panel is 200px, one column, add buttons only. Media moved into the
  right 44% of the bottom bar; pages keep the left 56%. Page thumbnails render
  real page content.
- The mask action had been inserted in the wrong place; it now sits under the
  image section as **silueta → recortar silueta**.
- Moving a ficha raises it to z-index 10000; reset restores the authored z-index.
- Verified p5 renders in preview, layout screenshots, and build/tests.

---

## 2026-10-23 — S26: inspector hierarchy, shell coherence, custom sizes

- Design-system assessment: category labels are strong uppercase; parameter
  labels are lowercase and muted. Added semantic label tokens and `.param-label`.
- Element inspector order is content → position/size → link → metadata → actions.
  Element actions use a 2-column grid and separate delete below a rule.
- Page actions moved out of page details into their own section.
- Added shared `AddTile`; page add and media import are now matching dotted plus
  boxes. Media import is no longer a text button.
- Left palette is one column at 168px; bottom bar is pages left/media right.
  Páginas and Medios labels both rotate vertically.
- Clicking the cajita wordmark saves/closes and returns to the project library.
- New project supports custom stage width/height.
- Mask dialog uses `object-fit: contain` so the entire image fits.
- Confirmed site theme affects export/preview; kept with a clearer hint.
- Screenshots and browser checks: s26-final-layout, s26-mask, s26-custom-size.

---

## 2026-10-23 — S27: live project cards, localized tags, non-scaling resize, mask editor

- Project cards now load the saved project and render its start page with the
  shared `PageMiniature`; cover aspect follows the stage. Fixed `PageMiniature`
  style objects (Svelte was not serializing them), which also fixed the bottom
  strip thumbnails.
- Inspector stamps now use localized element labels (`Imagen`, `Texto`, etc.),
  including p5. Asset metadata switched from readonly inputs to a static `<dl>`.
- `resizeStage` no longer scales/moves elements; only the page frame changes.
- Mask editing:
  - entire image with contain, and masked elements also render contain;
  - click to add, click-drag existing nodes, nearby nodes merge;
  - granular undo/redo for add/drag/clear;
  - clearing can be saved to remove the mask.
- Added `ProjectThumb` reuse and stage aspect fields in project summaries.
- Screenshots: s27-project-thumbs, s27-asset-info, s27-mask-nodes.

---

## 2026-10-23 — S28: user project validation and content-space masks

- Imported `mi-proyecto-2026-10-23.cajita` and inspected Inicio/editor/preview.
- Ficha/number overlap was a user-side move/reset sequence; reset restored the
  authored positions correctly.
- Mask mapping corrected:
  - mask points stay frame-normalized, but the dialog edits in the displayed
    image content box;
  - the dialog uses the image’s natural aspect, so the whole image fills the
    modal without letterbox;
  - conversion frame → content on open and content → frame on save;
  - masked images use contain in editor/export/thumbnails.
- About version no longer includes the sprint number; library header is “cajita”.
- Verified the imported project in browser and screenshots.

---

## 2026-10-23 — S29: tutorial modal and example walkthrough

- Added `TUTORIAL_STEPS`, `TutorialDialog`, and entry points in the library and
  editor topbar.
- Built a temporary example project with four pages, images, video, sound,
  p5/Observable embeds, links, three fichas, and schema fields.
- Captured ten tutorial screenshots from the live app: project library, media
  manager, canvas, previewed embeds, map, fichas, preview, export, publish
  (opened without submitting), and settings.
- Added a test that every tutorial step has a screenshot and ES/EN copy.
- Raw `forTutorial/` media is ignored; only `public/tutorial/` screenshots ship.
