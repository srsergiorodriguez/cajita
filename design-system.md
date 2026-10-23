# cajita — design system

Status: **v0.33 — S28 content-space masks, no About sprint** · 2026-10-23.

cajita has **one chrome theme: Ficha**, in **light and dark modes**. Ficha is
cream stock, slate ink, ruled lines, and catalogue labels; dark mode is the same
archive at night, with a light paper stage so the student's work keeps its own
colours. There is no second app skin. A mode is a token set, not a second app.

The mode of the **editor** is independent of the theme of the **exported site**.
A student can edit in light or dark Ficha and publish a site using any project
palette, including the Riso site palette. Riso is a **site theme**, not an app
theme.

This document is the visual contract. Components use tokens from
`src/styles/tokens.css`, `src/styles/themes/ficha.css`, and
`src/styles/themes/ficha-dark.css`; raw hex values, arbitrary spacing, and
one-off shadows are bugs. The goal is an app that feels handmade and specific
without making students hunt for the button.

---

## 1. The idea

**Hierarchy:** cajita (the app) → **project** (one site, saved as a `.cajita`
bundle) → **page** (a stage) → **elements, media, and links**. The app name is the
brand, not the name of the thing the student is making. Call it a project in
English and Spanish.

A cajita is a shoe box of cut-outs: photographs, ticket stubs, a postcard, a
pressed flower, a label written in marker, a strip of masking tape. You open it
on a table and arrange things until they say something.

The interface should feel like that table, not like a SaaS dashboard:

- **Printed, not glass.** Ink lines, flat colour, soft paper shadows. No blur,
  no translucency, no floating glass panels.
- **Evidence of making.** Ruled catalogue lines, stamp dates, slight rotations
  on stamps and page cards, typewriter labels. The imperfection is deliberate
  and contained; it never touches body text or inputs.
- **One loud thing at a time.** The stage is the loudest thing; chrome recedes.
- **Two speeds: direct and precise.** Immediate controls stay visible. Parameters
  that duplicate the handles or require numbers live in native collapsibles,
  closed by default. cajita is a quick collage/zine tool, not Figma or Canva; do
  not build a wall of settings.
- **Readable first.** The aesthetic is a frame for the work. If a texture,
  rotation, or colour hurts legibility, it goes.
- **Useful constraints.** A curated pack of 22 OFL built-in fonts, six site
  palettes, six stage presets, and a focused element set. The limit is the
  invitation.

### Directions considered

| Direction              | Feel                                                                                      | Status                                |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| **A. Riso print shop** | Fluorescent pink/teal, mustard, halftone, registration marks, warm stock, loud but usable | **site palette only**                 |
| **B. Ficha / archive** | Cream, slate blue, ruled lines, catalogue numbers, stamp dates, quieter DH feel           | **selected · the only chrome theme**  |
| C. Fotocopia           | High-contrast black/white, xerox grain, one red stamp, mono type, punk energy             | not chosen; mockup kept for reference |
| D. Caja de zapatos     | Kraft paper, warm ink, vermilion, tape, index cards                                       | rejected 2026-10-21                   |

Ficha ships in both light and dark. Riso survives as a **project site theme**
because a student may want a loud site; the editor chrome no longer changes
colour with it. Fotocopia is not shipped.

### Anti-patterns (hard no)

- glassmorphism, backdrop blur, translucent cards;
- purple/blue gradients, "AI" sparkles, generic SaaS illustration;
- 16 px rounded cards with soft shadows everywhere;
- pill-shaped primary buttons, floating action buttons;
- icon-only controls without a label/tooltip;
- textures or low-contrast patterns behind text;
- more than one accent colour competing on a screen;
- more than one app chrome theme; mode changes surface, not structure;
- "playful" rotation on inputs, menus, or text;
- emoji used as UI icons (emoji are welcome as _content_/stickers);
- motion on every hover;
- hiding essential actions in overflow menus on a 1280 px screen;
- duplicating a component because a mode needs a different border width. That is
  what tokens are for.

## 2. Colour and modes

### One semantic contract

Ficha light and Ficha dark implement exactly the same token names. Components
never reference a mode by name (`[data-mode="dark"] .toolbar` is a bug outside
the theme file). Theme files may set tokens and a few `--motif-*` values; they do
not restyle components.

| Token                                             | Role                                           |
| ------------------------------------------------- | ---------------------------------------------- |
| `--bg`                                            | app background                                 |
| `--panel`                                         | side panels, top bar, strip                    |
| `--panel-2`                                       | raised panel, inputs, cards                    |
| `--panel-3`                                       | sunken areas, hover rows                       |
| `--ink`                                           | primary text, borders, icons                   |
| `--ink-2`                                         | secondary text, pressed states                 |
| `--muted`                                         | helper text, metadata, disabled labels         |
| `--line`                                          | borders and dividers                           |
| `--line-soft`                                     | dotted/secondary dividers                      |
| `--desk`                                          | workspace surface around the stage             |
| `--stage`                                         | the page paper (light in both modes)           |
| `--accent`                                        | primary action fill, selection handles, stamps |
| `--accent-ink`                                    | text/icon on `--accent`                        |
| `--accent-2`                                      | secondary ink (red stamp)                      |
| `--accent-3`                                      | highlight/badge fill (manila)                  |
| `--guide`                                         | smart-guide line                               |
| `--selection`                                     | selected element outline, link badges          |
| `--selection-ink`                                 | text/icon on `--selection`                     |
| `--active-wash`                                   | selected row/page wash                         |
| `--focus`                                         | focus ring                                     |
| `--success`, `--danger`, `--warning`              | status text                                    |
| `--saved`                                         | autosave dot                                   |
| `--overlay`                                       | modal backdrop                                 |
| `--shadow-color`                                  | shadow base                                    |
| `--border-control`                                | button/input border width                      |
| `--border-strong`                                 | dialog/selection border width                  |
| `--shadow-btn`, `--shadow-card`, `--shadow-stage` | elevation                                      |
| `--font-wordmark`                                 | theme wordmark                                 |
| `--radius`                                        | base radius                                    |
| `--motif-desk`                                    | CSS background for the desk surface            |

### Ficha light

| Token              | Value                            | Use                           |
| ------------------ | -------------------------------- | ----------------------------- |
| `--bg`             | `#E9E2D4`                        | cream background              |
| `--panel`          | `#F7F1E5`                        | chrome panels                 |
| `--panel-2`        | `#FFFDF7`                        | cards, inputs                 |
| `--panel-3`        | `#EFE7D8`                        | sunken/hover                  |
| `--ink`            | `#24303F`                        | slate text and rules          |
| `--ink-2`          | `#35445A`                        | secondary text                |
| `--muted`          | `#736653`                        | helper text (AA)              |
| `--line`           | `#24303F`                        | 1 px catalogue rules          |
| `--line-soft`      | `rgba(36,48,63,.17)`             | dotted dividers               |
| `--desk`           | `#D9D0BF`                        | desk                          |
| `--stage`          | `#FFFDF7`                        | page paper                    |
| `--accent`         | `#2E5A88`                        | primary buttons, links        |
| `--accent-ink`     | `#FFFFFF`                        | text on blue (7.2:1)          |
| `--accent-2`       | `#A33A2B`                        | red stamp, destructive accent |
| `--accent-3`       | `#D9C9A8`                        | manila tab/badge              |
| `--selection`      | `#2E5A88`                        | selection outline, link badge |
| `--selection-ink`  | `#FFFFFF`                        | text/icon on selection        |
| `--active-wash`    | `rgba(46,90,136,.10)`            | active page row               |
| `--focus`          | `#2E5A88`                        | focus ring                    |
| `--success`        | `#3F6B4F`                        | saved/success                 |
| `--danger`         | `#A33A2B`                        | destructive                   |
| `--warning`        | `#8A5A00`                        | warnings                      |
| `--saved`          | `#3F6B4F`                        | autosave dot                  |
| `--overlay`        | `rgba(36,48,63,.50)`             | modal backdrop                |
| `--shadow-color`   | `#24303F`                        | soft shadow base              |
| `--border-control` | `1px`                            | buttons/inputs                |
| `--border-strong`  | `2px`                            | stage/dialog                  |
| `--shadow-btn`     | `0 2px 0 rgba(36,48,63,.22)`     | buttons                       |
| `--shadow-card`    | `0 2px 0 rgba(36,48,63,.18)`     | cards                         |
| `--shadow-stage`   | `0 18px 42px rgba(36,48,63,.18)` | stage                         |
| `--font-wordmark`  | `'Fraunces'`                     | wordmark                      |
| `--radius`         | `0` (2 px on inputs/tags)        | archival                      |
| `--motif-desk`     | ruled horizontal + vertical grid | desk                          |

Ficha light contrast, measured:

| Pair             | Ratio  | Verdict |
| ---------------- | ------ | ------- |
| ink / panel      | 11.9:1 | AAA     |
| ink / stage      | 13.2:1 | AAA     |
| muted / panel    | 5.0:1  | AA      |
| accent / panel   | 6.4:1  | AA      |
| white / accent   | 7.2:1  | AAA     |
| accent-2 / panel | 5.8:1  | AA      |
| white / accent-2 | 6.6:1  | AA      |
| ink / desk       | 8.7:1  | AAA     |

### Ficha dark

The dark mode is the same archive at night. The stage stays paper so project
colours and site typography remain true; chrome becomes deep slate.

| Token            | Value                         | Use                           |
| ---------------- | ----------------------------- | ----------------------------- |
| `--bg`           | `#12161B`                     | near-black app background     |
| `--panel`        | `#1B2129`                     | chrome panels                 |
| `--panel-2`      | `#232B35`                     | cards, inputs                 |
| `--panel-3`      | `#2B3541`                     | sunken/hover                  |
| `--ink`          | `#F2EADC`                     | warm paper text               |
| `--ink-2`        | `#D7CDBC`                     | secondary text                |
| `--muted`        | `#A99C87`                     | helper text                   |
| `--line`         | `#F2EADC`                     | borders                       |
| `--line-soft`    | `rgba(242,234,220,.18)`       | dividers                      |
| `--desk`         | `#0D1116`                     | desk                          |
| `--stage`        | `#FFFDF7`                     | page paper (always light)     |
| `--accent`       | `#9BC7F5`                     | primary buttons, selection    |
| `--accent-ink`   | `#111820`                     | text on light blue            |
| `--accent-2`     | `#E58A78`                     | red stamp, destructive accent |
| `--accent-3`     | `#343C33`                     | manila tab/badge              |
| `--selection`    | `#9BC7F5`                     | selection outline             |
| `--active-wash`  | `rgba(155,199,245,.16)`       | active page row               |
| `--focus`        | `#9BC7F5`                     | focus ring                    |
| `--danger`       | `#FF9A8B`                     | destructive                   |
| `--overlay`      | `rgba(0,0,0,.64)`             | modal backdrop                |
| `--shadow-stage` | `0 18px 42px rgba(0,0,0,.55)` | stage                         |
| `--motif-desk`   | ruled grid on near-black      | desk                          |

Ficha dark contrast, measured:

| Pair           | Ratio  | Verdict |
| -------------- | ------ | ------- |
| ink / panel    | 13.6:1 | AAA     |
| muted / panel  | 6.0:1  | AA      |
| ink / accent   | 10.1:1 | AAA     |
| accent / panel | 9.2:1  | AAA     |
| danger / panel | 7.9:1  | AAA     |

### Rules for both modes

- `--accent` is a fill, not small text on paper. In light mode the blue is
  legible enough for links; in dark mode the light blue is a fill and highlight.
- Filled primary buttons use `--accent` with `--accent-ink`; verify contrast in
  both modes before changing either value.
- Focus is always `--focus` with a 2 px ring and 2 px offset. It must be visible
  on panel, stage, and active rows in both modes.
- Colour is never the only signal; pair with text, icon, or shape.
- The stage stays light in dark mode. Do not tint the project paper with the app
  mode; site colours belong to the project.
- User-chosen site colours are checked by the exporter; warn below 4.5:1 for
  text, 3:1 for large text and graphics.

### What may differ between light and dark

| Dimension   | Ficha light      | Ficha dark        |
| ----------- | ---------------- | ----------------- |
| Panel       | cream            | deep slate        |
| Rules       | slate ink        | warm paper        |
| Accent      | archival blue    | pale blue         |
| Stamp       | red              | salmon red        |
| Desk        | warm ruled paper | dark ruled grid   |
| Stage       | paper            | paper (unchanged) |
| Density     | same             | same              |
| Spacing     | same             | same              |
| Type scale  | same             | same              |
| Hit targets | same             | same              |

The shared column is not negotiable. Mode changes surface, not the tool.

### Mode switching

- `data-theme="ficha"` and `data-mode="light"` or `"dark"` on `<html>`.
- An inline boot script reads `localStorage['cajita.mode']` and sets the
  attribute before the first paint, so there is no flash.
- Default: **dark** (confirmed after real use). The top bar has a mode button
  (sun/moon) with a tooltip;
  the same choice is in _Ajustes → Apariencia_. Do not hide it only in settings;
  students should discover it.
- The preference is per device, not per project. The app does **not** follow
  `prefers-color-scheme` automatically yet; the explicit choice wins.
- The exported site never reads `cajita.mode`. It uses `project.theme` (site
  theme) and the user's content colours.

### Texture

Texture is applied with CSS, never a large bitmap:

```css
/* Ficha light: ruled paper */
--motif-desk:
  repeating-linear-gradient(0deg, transparent 0 23px, rgba(36, 48, 63, 0.055) 23px 24px),
  repeating-linear-gradient(90deg, transparent 0 31px, rgba(36, 48, 63, 0.045) 31px 32px),
  var(--desk);

/* Ficha dark: the same ruled paper, paper ink on near-black */
--motif-desk:
  repeating-linear-gradient(
    0deg,
    transparent 0 23px,
    rgba(242, 234, 220, 0.05) 23px 24px
  ),
  repeating-linear-gradient(
    90deg,
    transparent 0 31px,
    rgba(242, 234, 220, 0.04) 31px 32px
  ),
  var(--desk);
```

Allowed places: desk, empty states, page cards, stamps, and the stage edge. Not
behind panel text, inputs, or the stage content. The exported site only uses the
site theme's background.

## 3. Typography

### Families

| Role                          | Family                                                               | Weights          | Notes                                               |
| ----------------------------- | -------------------------------------------------------------------- | ---------------- | --------------------------------------------------- |
| UI / labels / body in chrome  | **Space Mono**                                                       | 400, 700         | shared by both modes; typewriter-adjacent, readable |
| Wordmark / editorial headings | **Fraunces**                                                         | 400, 600, italic | warm serif; Ficha wordmark and site display         |
| Stamps / short display        | **Archivo Black**                                                    | 400              | heavy, poster-like; short strings only              |
| Export font pack              | 22 built-in OFL families (Anton through Zilla Slab; see `LICENSES.md`) | 400/500      | curated, subset; only used fonts are exported       |

Do not add a fourth UI family. The chrome is mono + one display face; the content
is the user's choice. The chrome uses Fraunces for the wordmark and Space Mono
for controls, labels, and inputs in both modes.

### UI scale

Every UI text size is a token multiplied by **`--ui-scale`**. The default is
**1.2** (confirmed with the user on 2026-10-22), adjustable in _Ajustes → Apariencia_
from **0.9 to 1.3** with a slider. The table below shows the base px at scale 1.0;
the rendered size is `base × --ui-scale`. Site content and stage typography do
**not** use this scale; they belong to the project.

| Token        | base px | Use                             |
| ------------ | ------- | ------------------------------- |
| `--text-3xs` | 8       | stamps, tiny badges, dot labels |
| `--text-2xs` | 10      | metadata, annotations, helper   |
| `--text-xs`  | 11      | buttons, tabs, dense rows       |
| `--text-sm`  | 12      | default UI body                 |
| `--text-md`  | 13      | panel body                      |
| `--text-lg`  | 15      | panel headings                  |
| `--text-xl`  | 20      | dialog titles                   |
| `--text-2xl` | 28      | empty-state headlines           |
| `--text-3xl` | 40      | library/onboarding headings     |

Line heights: 1.2 for display, 1.35 for UI, 1.55 for reading. Letter-spacing:
`0.08em` for uppercase labels, `0` elsewhere. Never justify UI text. No UI
component may hardcode a px font size; use a token so the slider works everywhere.

### Rules

- Buttons and micro-labels are **lowercase** in Spanish and English (`añadir
página`, `add page`). Headings, titles, and sentences use **sentence case**
  (first word capitalized, rest lowercase except proper nouns). Section labels
  may be uppercase mono with tracking. Never Title Case.
- Body copy in panels is at least 12 px; never 10 px for a sentence.
- Display type is for the wordmark, page titles, stamps, and empty states only.
  Never for form labels or long instructions.
- The wordmark `cajita` is Fraunces 700 with a short red/salmon underline in both
  modes. It is not a per-mode component fork.
  It is text, not an image, so it stays crisp. The rest of the chrome uses Space
  Mono in both modes.
- User text elements can use any of the six built-in export fonts or the project's
  two custom fonts, plus size, line-height, letter-spacing, alignment, colour,
  background, and padding. No rich text runs.
- Built-in fonts are subset to Latin + Spanish (`áéíóúüñ¿¡`), punctuation,
  currency, and arrows; woff2 only. Every built-in font ships with its OFL
  license in `src/assets/fonts/LICENSES.md`.
- Custom fonts are uploaded TTF/OTF/WOFF/WOFF2, max two per project, 5 MB each.
  The UI records the user's license attestation; cajita cannot verify copyright.
  The export embeds the original file(s) with `@font-face` and `font-display:
swap`, and the site falls back to the theme pairing if a custom font fails.

### Export pairings

| Name      | Heading       | Body/mono     | Feel                      |
| --------- | ------------- | ------------- | ------------------------- |
| Editorial | Fraunces      | Space Mono    | personal essay, portfolio |
| Poster    | Archivo Black | IBM Plex Mono | loud, comic, zine         |
| Technical | Syne          | Space Mono    | catalogue, DH collection  |
| Slab      | Zilla Slab    | IBM Plex Mono | archive, library          |

The user picks one pairing per site; individual elements can override the family
from the same built-in OFL pack. This is a constraint, not a limitation to apologise
for.

---

## 4. Space, shape, depth

### Spacing (4 px base)

`2, 4, 8, 12, 16, 24, 32, 48, 64, 96`

| Token       | px  | Use                            |
| ----------- | --- | ------------------------------ |
| `--space-1` | 2   | hairline nudges, badge offsets |
| `--space-2` | 4   | icon/text gap, tight rows      |
| `--space-3` | 8   | control padding, list gaps     |
| `--space-4` | 12  | panel padding, field gaps      |
| `--space-5` | 16  | section padding                |
| `--space-6` | 24  | panel groups                   |
| `--space-7` | 32  | dialog padding                 |
| `--space-8` | 48  | empty-state breathing          |
| `--space-9` | 64  | onboarding                     |

### Shape

- Radius `0` is the default. `2px` for inputs and small tags. `999px` only for a
  circular badge or the record-like "start" dot. No 8/12/16 px rounded cards.
- Borders use mode tokens: `--border-control` 1 px and `--border-strong` 2 px in
  both modes, plus a 1 px divider. Components never hardcode "2 px ink".
- Elevation uses `--shadow-btn`, `--shadow-card`, and `--shadow-stage`. Light mode
  uses soft 0–2 px paper shadows; dark mode deepens them. A button never gets a
  blurred glow in either mode.
- A soft shadow is allowed for the stage on the desk in both modes; dark mode
  deepens it so the paper separates from the near-black desk.
- Mode motifs: Ficha uses ruled tabs, catalogue numbers, and a red/salmon date
  stamp. Light and dark share the same structure; only paper and ink invert.
  Motifs live on the desk, page cards, and stamps, never behind body text.
- Stamp: `--border-strong` border, uppercase 10 px, rotated −2°, used for "inicio",
  "borrador", "publicado". The stamp is red in light mode and salmon in dark
  mode. Never the only indicator of state.

### Icons

- 16 px and 20 px, stroke 1.75, square caps, `currentColor`.
- Custom set: add image, add text, add video, add sound, page, map, link, eye,
  eye-off, lock, unlock, trash, duplicate, undo, redo, play, pause, download,
  upload, github, globe, chevron, close, plus, minus, fit, grid, magnet, zoom.
- No icon font, no emoji as chrome. Every icon-only button has a tooltip and
  `aria-label`.

---

## 5. Shell anatomy

Target: usable at **1280 × 800**, comfortable at 1440 × 900.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP BAR 56px                                                           │
│ cajita · proyecto ▾        página · enlace · mapa        ↶ ↷  ▶  ⋯     │
├─────────────┬──────────────────────────────────────────┬───────────────┤
│ LEFT 272px  │ DESK / STAGE                             │ INSPECTOR 304 │
│             │                                          │               │
│ Páginas     │   ┌──────────────────────────────────┐   │ Elemento      │
│  ▪ inicio   │   │                                  │   │  posición     │
│  ▪ sobre    │   │        stage (paper)             │   │  tipografía   │
│  ▪ contacto │   │                                  │   │  enlace       │
│             │   └──────────────────────────────────┘   │  ficha        │
│ Añadir      │                                          │               │
│  imagen     │   zoom · ajustar · rejilla · imán        │ Capas         │
│  texto      │                                          │               │
│  video      │                                          │               │
│  sonido     │                                          │               │
│             │                                          │               │
│ Medios      │                                          │               │
├─────────────┴──────────────────────────────────────────┴───────────────┤
│ PAGE STRIP 96px   [inicio] [sobre] [contacto] [+]        guardado 12:04 │
└────────────────────────────────────────────────────────────────────────┘
```

### Top bar

- Left: wordmark (Fraunces 700 with a red/salmon underline), project name (click
  to open project menu), save status.
- Center: view switcher **página / mapa**, page title.
- Right: undo/redo, preview (play), export, publish, locale toggle `ES / EN`,
  mode toggle (sun/moon, tooltip "cambiar modo"), overflow menu (project,
  settings, about).
- Height 56 px, `--border-control` bottom border, `--panel` background. No shadow.

### Left panel

- **Páginas**: ordered list with thumbnail, title, slug, start badge, link count.
  Drag to reorder. `+` adds a page. Context menu: rename, duplicate, set start,
  delete (with confirmation and link warning).
- **Añadir**: eight compact tools: imagen, texto, video, sonido, YouTube,
  Observable, Forma, Fichas. Fichas opens the collection manager and can place a
  saved record on the active page. The file tools import and place immediately. The embed tools
  open a URL dialog; no media bytes are imported. Forma opens a three-choice
  picker (círculo, cuadrado, triángulo). Drag onto the stage or click to add at
  the centre. Also drop files anywhere.
- **Medios**: the left panel is only a narrow one-column add palette. The bottom
  bar is split between the real Páginas thumbnails and a compact Medios strip
  (view all, import plus-tile, count, horizontal tiles). Both bottom labels are
  rotated like the Páginas label. `AddTile` is the shared dotted add control. **Ver todos** opens a manager with search, filters
  (todos/imágenes/video/audio/fichas/sin usar), detail, usage counts, and safe
  delete. The import action is shortened to “importar”. Clicking an image arms placement; the next click on the empty
  stage places it at that point and selects it. No placement button or helper
  row. Medios deduplicates tiles by asset hash. A "tipografías" tab in the same panel opens the project font manager.
- Panels collapse to a 28 px rail on desktop; the header chevron hides the panel
  and the rail chevron restores it. The bottom strip collapses to a 28 px
  `^ páginas` rail.

### Inspector

Contextual, no tabs at the top level; sections collapse:

- **Página**: title, web address, **tamaño de página** (shared width/height,
  320–4000 px, applies to every page), fit, alignment, min/max width, background,
  transition, delete/duplicate. Changing the size scales frames and type without
  stretching their shape; text height re-fits.
- **Elemento**: type-specific controls, link, ficha, then **Ajustes precisos** —
  a native `<details>` section, closed by default, containing x, y, width,
  height, rotation, and opacity. Its closed summary shows
  `x 70 · y 150 · 600×250 · 0°`. Duplicate/front/back/delete follow. Lock, hide,
  and layer rename live only in **Capas**; layers are page-level and are not
  shown while editing an element.
- **Tipografía** (text): font (built-in + custom), size, colour, alignment icon
  group, and a "título de página" toggle (one per page) are direct. Size, colour,
  and alignment share one row. Line height and tracking live in **tipografía
  precisa**, closed by default. A "gestionar tipografías" link opens the project
  font manager.
- **Imagen**: asset, fit, pixelated toggle, alt text, replace.
- **Video**: asset, fit, native controls, autoplay, loop, muted, replace.
- **Sonido**: asset, label, native controls, autoplay, loop, replace.
- **Fichas**: schema fields have eye controls for card visibility; the code eye
  controls card/canvas code. Schema-backed records with code, name, image, alt, text/longtext/
  URL fields. The manager has Fichas and Esquema tabs. CSV import/export and
  template live in the record list; import shows a validation preview, error and
  warning counts, an action per row (create/update), and an error report.
  Create-only is the default; create-and-update preserves existing placements.
  New records can optionally be placed in a simple grid. A collection ZIP with
  `fichas.csv` + images can be imported in one step; its images pass through
  Medios and its CSV through the same validation preview. A placed ficha renders the image; clicking
  opens a native `<details>` card contained inside the image frame. A read-only
  Tabla tab shows code, name, image, and all schema values. Code, name, and
  schema fields edit inline with per-cell validation; image cells open an inline
  asset select; longtext uses the full form. Schema field order is editable with
  up/down controls and drives cards, table, and CSV order.
  A single Esquema checkbox makes all fichas movable by visitors; positions are
  stored locally per project/page, restored on return, and reset by a small
  localized `reiniciar fichas` button, also available in the preview toolbar.
- **Forma**: shape (circle/square/triangle), fill, border color, border width.
  Defaults: accent fill, ink border, width 0. Shapes can carry links and the
  usual layer/geometry controls. The selection border is always the rectangular
  bounding box, exactly the shape frame; resize handles stay on that box. Free
  resize can distort the shape; Shift preserves its aspect ratio.
- **Embed**: provider (YouTube/Observable), title, caption, read-only source URL,
  live-source warning. No link/ficha controls. Observable `?cells=` and archived
  `old.observablehq.com` URLs are preserved. Editor shows a placeholder;
  preview uses a real same-origin shell (`preview.html`) so YouTube gets a
  referrer; export uses the sandboxed iframe. Observable backgrounds are white,
  YouTube black.
- Editor media uses custom play/pause controls, paused by default. Video keeps
  its source aspect; sound is a compact label/waveform/play row. Export uses
  native `<video>/<audio>` controls.
- **Enlace**: none / page / URL / ficha. Page select shows only existing pages
  and warns about self-links. URL is validated.
- **Ficha**: metadata fields (title, creator, date, medium, rights, source,
  description, custom fields), peek label, preview card.
- **Capas**: ordered list of elements on the page. Drag a row to reorder it
  between rows; a selection-colored insertion line marks the gap. The whole list
  is a drop target, so dropping on the line or in a gap works. Double-click a
  row to edit its optional layer name in place (no input by default). Each row
  has lock and eye controls; active lock/hide is accented. No up/down buttons.
  The insertion line appears before the hovered row and after the last row.

Empty inspector: a small "nada seleccionado" card with keyboard hints, not a wall
of disabled fields.

### Stage desk

- Desk surface uses `--motif-desk` (Ficha ruled grid, light or dark); stage paper
  uses `--stage` with `--border-strong` and `--shadow-stage`. The stage stays
  light in dark mode.
- No floating stage toolbar. Snap stays on by default; the toolbar's magnets,
  selection label, and canvas-size box were removed as visual noise.
- Stage margin guides (dashed) and a subtle grid overlay when enabled.
- Status line bottom-left: page size, element count, zoom controls, page index.
  Zoom is 25–400% in 10% steps; at 100% the stage fits the available width with
  a 24 px margin. `−` / `+` / **fit width**; zooming in scrolls the desk. Page
  size is not editable yet.
- When the stage is larger than the viewport, fit-to-screen; the editor does not
  scroll the stage itself. Pan with space+drag or middle-drag.

### S2 implementation notes

- The stage fits the available desk. Zoom/pan, grids, and link badges are
  parked. Snap is always on in this version.
- Selected elements use a constant-size overlay with eight resize handles and a
  rotate handle; locked elements hide their handles. Smart guides use the
  `--guide` token and only appear while dragging.
- The inspector is contextual: page (details, transition, background, layers,
  typefaces), element (frame, opacity, lock/hide, type-specific fields), or asset.
- Typography: content, typeface, size, color, alignment, and the page-heading
  toggle are direct. Line height and tracking live in **tipografía precisa**, a
  native collapsible closed by default. Text boxes fit their rendered content
  height (padding included), so the selection handles hug the text. The inline
  editor chooses a light or dark background from the text color luminance and
  uses a matching caret.
- The canvas uses the shared `elementToCss`/`pxToCqw` geometry, never a second
  layout algorithm.

### Page strip

- 96 px tall; horizontal scroll; cards 120 × 72 with a wireframe thumbnail.
- Current page: `--selection` outline + `--active-wash`; start page: `--accent-3`
  stamp "inicio".
- Drag to reorder; `+` at the end. Hover reveals duplicate/delete.
- Thumbnails are pure SVG wireframes (blocks, image placeholders, text lines),
  not screenshots. They are deterministic and cheap.

### Project library

- Full-screen shell with the same top bar brand, mode toggle, ES/EN switch, and
  settings. The library is the first screen when no project is open.
- Hero: `CAJITA / S2` label, **Tus proyectos** (sentence case), one short lede,
  and two actions: **nuevo proyecto** (accent) and **abrir .cajita** (secondary).
- Project cards: a 150 px cover using the project's site theme colours, the
  project title, page/media counts, bytes, and saved date. Delete is a small
  bare trash button in the cover corner, with a confirm dialog.
- Empty state: a small box illustration, one sentence, one accent action.
  No mascots, no fake sample projects.
- Drop a `.cajita` anywhere on the library: the whole surface shows a dashed
  accent border and "Suelta el archivo .cajita".
- Footer: browser storage used, project count, and a backup reminder. The footer
  is not a control; the actions live in the hero and cards.
- Create dialog: name, site language, stage preset, site theme. It creates the
  project and opens it immediately.

### Map view

- Replaces the stage area; same desk background.
- Page cards (232 × 126) with title, slug, element/link counts, inbound count,
  external/card badges, and start/ orphan/broken flags.
- Deterministic auto-layout, three columns maximum, scrolls when it exceeds the
  desk. No pan/zoom yet.
- Wires: 1.5 px `--muted`, arrowheads. Orthogonal routes use column gutters for
  vertical movement and row gaps for horizontal movement, so a long same-column
  edge never runs behind intervening cards. Only page-to-page links draw a wire;
  URL/ficha links are card badges.
- Start page has a red/salmon stamp; orphan pages get a dashed outline and a
  warning badge; broken links get a danger badge.
- Click a card to open that page and return to the page view.
- Manual card positions (`page.map`), wire labels, wire selection, pan/zoom, and
  auto-organise-by-depth are parked.
- No node library. SVG + pointer events.

### Responsive behaviour

| Width    | Behaviour                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| ≥ 1200   | full shell                                                                                                               |
| 900–1199 | inspector becomes a 320 px slide-over; left panel 240 px                                                                 |
| 720–899  | left panel becomes a drawer; stage full width; page strip remains                                                        |
| < 720    | editing is not supported in v1; show a friendly "usa una pantalla más grande" screen with preview/export still available |

The app is not a mobile editor. It can preview and export on a phone, but direct
manipulation with this density needs a pointer and space. Be honest about it.

---

## 6. Components

All components use tokens, have a visible focus state, and support `disabled`.
Interactive heights: 32 px compact, 40 px default, 44 px touch targets where the
layout allows.

### Button

| Variant   | Default                                       | Hover                          | Active               | Disabled               |
| --------- | --------------------------------------------- | ------------------------------ | -------------------- | ---------------------- |
| primary   | `--ink` fill, `--panel` text                  | translate 1 px, `--shadow-btn` | `--ink-2` fill       | 40% ink, dotted border |
| secondary | `--panel-2` fill, `--border-control` border   | `--panel-3` fill               | ink fill, panel text | dotted border, muted   |
| ghost     | transparent, no border                        | `--panel-3` wash               | `--panel-3`          | muted                  |
| accent    | `--accent` fill, `--accent-ink` text          | darken 6%                      | ink fill             | muted                  |
| danger    | transparent, `--border-control` danger border | danger fill, panel text        | dark danger          | muted                  |

- Height 32 (compact) / 40 (default); padding 0 12/16; gap 8; font 12 px mono,
  weight 400 (700 for emphasis), lowercase.
- No rounded corners. Shadow only on primary/secondary, not ghost.
- Loading state: label stays, a 12 px stamp spinner replaces the leading icon;
  width does not jump.
- A button that navigates is still a button in the editor; exported navigation
  is a link.

### IconButton

32 × 32 (compact 28), `--border-control` optional, icon 16 px, tooltip +
`aria-label`. Never the only way to do a destructive action; pair with a label in
menus.

### Field

- Label: 11 px uppercase mono, `--muted`, 0.08em tracking, margin-bottom 4.
- Input: `--panel-2`, `--border-control` border, 36 px height, 8 px padding,
  13 px text.
- Focus: 2 px `--focus` border + 2 px offset ring; no glow.
- Error: `--danger` border + 11 px message with an icon; `aria-describedby`.
- Help: 11 px `--muted`, max 60ch.
- Number inputs: monospace, right-aligned, step buttons only where useful.
- Sliders: 2 px `--line` track, 16 px square thumb (`--panel-2`,
  `--border-control`); adjacent number field; value updates live, commit on release.

### FontPicker / font manager

- The font picker is a native `<select>` grouped into **paquete cajita** and
  **mis tipografías**; each option is rendered in its own face at 16 px where the
  platform allows (fallback to the name in mono).
- A small "Aa" preview next to the select shows the current face at 28 px, with
  the Spanish alphabet and `123`.
- **Font manager** (dialog, opened from the picker or Medios → tipografías):
  - two slots max; each row shows name, weight/style, file size, used count,
    preview, delete.
  - upload by button or drop; accepted TTF/OTF/WOFF/WOFF2, max 5 MB each, no SVG
    fonts.
  - after parsing, ask for display name (unique), weight, style, and a license
    note/attestation. The font is stored only after FontFace loads it.
  - deleting a font that is still used is blocked with a list of pages/elements
    and a "replace with a built-in" action.
  - a failed upload shows the parser error, not a generic "invalid file".
- No raw `@font-face` or CSS text fields. The manager is the only path.

### RangeField

- Label + current value on one line (`110%`), native `<input type="range">` below,
  optional hint underneath.
- `accent-color: var(--accent)` for the track/thumb; no custom JS drag logic.
- Used for interface size in Settings; value is persisted per device and applied
  through `--ui-scale` before first paint.
- Keyboard: arrows step by 0.05; Home/End jump to the min/max.

### Segmented control

2–4 options, `--border-control` border, no radius; active option ink fill/panel
text; height 32; keyboard arrow navigation. Options may show an icon instead of
text; then `aria-label` and `title` carry the word. Used for layout mode, fit,
and text alignment.

### Panel / Section

- Normal sections are static blocks.
- `Section` also has a collapsible variant using native `<details>`: the summary
  keeps the label and a compact value line, closed by default, with a `＋`
  chevron that rotates open. Used for **Ajustes precisos**; do not invent
  per-section toggle state.

1 px bottom divider, 12 px vertical padding, section label uppercase 11 px.
Collapsible with a chevron; state persisted in UI preferences. No nested cards
inside cards.

### Tabs

Underline 2 px `--accent` for active, 12 px mono lowercase, 32 px height.
Used only in dialogs (export/publish), not in the main shell.

### Dialog

- Native `<dialog>`, width 480 (confirm) / 640 (export/publish) / 800 (settings).
- `--border-strong` border, `--panel-2`, `--shadow-card`, overlay `--overlay`
  (no blur).
- Header: 20 px `--font-wordmark` for the title, 1 px bottom border. Close button
  top-right, 32 px, icon + `aria-label`.
- Footer: right-aligned actions, primary last; destructive action left.
- Escape closes; focus returns to the trigger; scroll lock on the body.

### Toast

- Bottom-left, 320 px max, `--panel-2` card, `--border-control`, `--shadow-card`,
  12 px text.
- Types: info (ink), success (`--success` left bar), error (`--danger` left bar,
  persists until dismissed), progress (thin bar, no spinner).
- Max 3 visible; stack upward; `aria-live="polite"` for success, assertive for
  errors.

### Tooltip

- Appears on hover/focus, `--ink` background, `--panel` text, 11 px, max 240 px,
  0 radius. Position **below** the trigger by default, including every top-bar
  button; use above only when below would be clipped by the viewport or a panel
  edge.
- Hidden with `display: none`, not `opacity: 0`; a transparent tooltip still
  contributes to horizontal scroll and can create phantom overflow.
- Never the only label for an icon button; it repeats the `aria-label`.

### PageCard

- 120 × 72 (strip) / 160 × 100 (map); `--panel-2`, `--border-control`,
  `--shadow-card`.
- Thumbnail wireframe; title 12 px; slug 10 px muted; start stamp; link count.
- Selected: `--selection` outline + `--active-wash`; dragging: 2° rotation +
  `--shadow-card`.

### Element selection overlay

- Bounding box: 2 px `--selection` (1 px at zoom < 50%); dashed when locked.
- 8 handles: 8 × 8 px squares, `--panel-2` fill, `--border-control` border;
  corners 10 px.
- Rotate handle: 24 px circle above the top edge, connected by a 1 px line;
  cursor `grab`/`grabbing`.
- Dimension label: 10 px mono, `--ink` on `--accent-3`, above the box, shows
  `W × H` and angle while transforming. Hidden when idle.
- Multi-select: each box 1 px `--selection`; group bounding box 1 px dashed; one
  set of handles for the group.
- Hover (not selected): 1 px dotted ink at 40%, no handles.
- Link badge: 20 × 20 px `--selection` tab with `--selection-ink` arrow, top-right,
  only when "mostrar enlaces" is on or the element is hovered/selected.
- Metadata badge: small index-card icon, same rules.

### Audio element

- In the editor: a "speaker sticker" with a play/pause button, waveform-ish
  12-bar progress, label, duration. Muted by default while editing.
- In export: the same visual button; `<audio>` hidden until JS connects, with a
  `<noscript>` native player. Keyboard: Space toggles when focused; ARIA label
  includes the label and state.

### Publish dialog

- Default dialog width. Top: one plain public-site warning, not a help link.
- Token field (`password`), fine-grained-token link, “recordar” checkbox, forget
  token action. Repo field (`usuario/nombre`) with create-repository link. Optional
  **dominio personalizado** field; cajita writes `CNAME` and uses it for canonical
  URLs, but DNS/certificates must be configured in Pages. Branch is fixed to
  `gh-pages` and stated in one micro-label.
- Publish is disabled until token and repo are present. Progress is a one-line
  status with a pulsing square, not a modal spinner.
- If Pages creation is forbidden, the files are already uploaded: show the
  repository's Pages settings link and the one-time manual setup path. Do not
  claim Contents failed.
- A 404 for the repository is not “repo missing”: fine-grained tokens return 404
  for repositories they cannot see. Show token repository-access/SSO guidance.
- Success shows the public URL and **abrir sitio**; unpublish asks once inline and
  explains the repository/history are untouched.
- A collapsed **historial** lists the last five successful publishes/unpublishes:
  date, repo, uploaded/deleted counts, site link, and short commit link. No
  rollback and no failed attempts.
- Errors are localized code messages plus a ZIP fallback button. Never raw GitHub
  JSON. Token is not shown in the result, logs, or DOM after closing.

### Preview dialog

- Wide native dialog: page selector, status, and an iframe with the exported
  renderer. Internal page links post `cajita:preview:navigate`; the parent swaps
  the iframe document. Close returns focus to the trigger.
- The preview is not a separate renderer. If it looks right, the export is right.

### Metadata card

- Index-card look: `--panel-2`, `--border-strong`, `--shadow-card`, 320–420 px
  wide, 24 px padding, slight −1° rotation on the paper but text stays level.
- Title in Fraunces 20 px; creator/date in mono 11 px; description 13 px;
  fields as a two-column definition list; rights at the bottom with a hairline.
- Open via native `<details>` in the inspector. Seven fixed fields: title,
  creator, date, medium, rights, source, description.
- The card only counts as a card when at least one field has content; validation
  enforces this for `link.kind: 'meta'`.
- The inspector shows the card preview and the editable fields separately.
- No hover-only content. Peek label (`title`/`title-date`) appears on hover/focus
  as a small tag, but the full card is always click/tap accessible.

### Empty states

- A small hand-drawn box SVG, a short line, one action. No mascots, no jokes that
  obscure the next step.
- Examples: "todavía no hay proyectos" → "crear el primero"; "sin selección" →
  keyboard hints; "sin medios" → "importar una imagen".

---

## 7. Canvas interaction rules

| Action                | Result                                                            |
| --------------------- | ----------------------------------------------------------------- |
| Click element         | select                                                            |
| Shift+click           | add/remove from selection                                         |
| Drag empty stage      | marquee select                                                    |
| Drag element          | move; snap in grid (modular or type preset); smart guides in free |
| Alt+drag              | duplicate and move                                                |
| Arrow keys            | nudge 1 px; Shift = 10 px; in grid = one cell                     |
| Corner drag           | resize; Shift keeps aspect; Alt from centre                       |
| Top handle drag       | rotate; Shift snaps 15°; in the type preset snaps 90°             |
| Double-click text     | edit in place                                                     |
| Escape                | leave text edit / deselect                                        |
| Delete/Backspace      | delete selection (with undo toast)                                |
| ⌘/Ctrl+D              | duplicate                                                         |
| ⌘/Ctrl+Z / Shift+Z    | undo/redo                                                         |
| ⌘/Ctrl+[ / ]          | send backward/forward                                             |
| ⌘/Ctrl+Shift+[ / ]    | send to back/front                                                |
| Space+drag            | pan                                                               |
| ⌘/Ctrl+scroll / pinch | zoom                                                              |
| 0                     | fit stage                                                         |
| 1                     | 100%                                                              |
| G                     | toggle grid                                                       |
| L                     | toggle link badges                                                |
| P                     | preview                                                           |
| ?                     | keyboard shortcuts dialog                                         |

- Dragging an element updates its frame live; history coalesces to one step on
  pointer up.
- Snapping threshold: 6 screen px (converted to stage units by zoom). Hold `⌘`
  to disable temporarily.
- Guides: element edges/centres, stage centre, stage margins; accent dashed 1 px.
- Grid overlay: 1 px blue at 8% opacity; major lines every 4 cells at 14%;
  stage margin dashed.
- Locked elements can be selected (to unlock/inspect) but not transformed.
- Hidden elements are not hit-testable; show them in the Layers list at 50%
  opacity.
- Rotation is normalized to (−180, 180]; display one decimal only while
  transforming.
- Minimum element size: 8 × 8 px; text minimum font size 6 px (warn below 10).
- Elements may extend beyond the stage; the stage clips them visually (export
  uses `overflow: hidden` on the stage). A warning appears in the inspector:
  "fuera del escenario".

---

## 8. Motion

| Token           | Value                      | Use                        |
| --------------- | -------------------------- | -------------------------- |
| `--motion-fast` | 120 ms                     | hover, press, focus        |
| `--motion-base` | 180 ms                     | panels, dialogs, selection |
| `--motion-slow` | 240 ms                     | page transitions, map      |
| `--ease-out`    | `cubic-bezier(.2,.8,.2,1)` | enter                      |
| `--ease-in`     | `cubic-bezier(.4,0,1,1)`   | exit                       |

- No bounce, no spring, no confetti. A small 2° rotation on a dragged page card
  is enough personality.
- Hover moves shadows by 1 px, not elements by 8 px.
- Dialogs fade/scale from 98% to 100% in 180 ms; no blur.
- Page transitions: cut (default), fade, slide. 1000 ms; the setting belongs to
  the page being left. Disabled under `prefers-reduced-motion`. Export uses native
  cross-document View Transitions plus a tiny pageswap/pagereveal runtime for
  types. Preview animates the outgoing wrapper only.
- Progress is a stamped bar, not a spinning circle, except for a short
  indeterminate job (< 1 s).
- Sound: none in the editor. The app is silent; user media is the only sound.

---

## 9. Copy and i18n

Voice: warm, direct, no exclamation marks, no cuteness that hides the action.
Spanish and English are written as equals, not translated word-for-word.

**Casing rule (hard):** never use Title Case. Headings, titles, and sentences use
**sentence case** in both languages: capitalize the first word, lowercase the
rest, except proper nouns and acronyms (`GitHub`, `S0`). Spanish `Ajustes`, not
`Ajustes Generales`; English `Settings`, not `Settings And Preferences`. Buttons,
tabs, and micro-labels may be lowercase by design; section labels may be uppercase
mono. Never capitalize every word of a title.

| Context             | ES                                                        | EN                                                              |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| add page (button)   | añadir página                                             | add page                                                        |
| add image (button)  | añadir imagen                                             | add image                                                       |
| publish (button)    | publicar                                                  | publish                                                         |
| export (button)     | descargar sitio                                           | download site                                                   |
| saved (status)      | guardado                                                  | saved                                                           |
| saving (status)     | guardando…                                                | saving…                                                         |
| no selection        | Nada seleccionado                                         | Nothing selected                                                |
| start page          | Inicio                                                    | Start                                                           |
| link to page        | Enlazar a página                                          | Link to page                                                    |
| open metadata       | Ver ficha                                                 | View details                                                    |
| empty library       | Todavía no hay proyectos                                  | No projects yet                                                 |
| undo (button)       | deshacer                                                  | undo                                                            |
| delete page confirm | Se borrará la página y sus enlaces. No se puede deshacer. | This page and its links will be deleted. This cannot be undone. |

Rules:

- Buttons are verbs; labels are nouns; confirmations state consequences.
- Errors: what happened + what to do + a way out. No "¡Ups!".
- Every string is a key; no concatenated sentences that assume English word
  order. Use full sentences per plural/case where needed.
- Translate `aria-label`, `title`, empty states, toasts, and export labels.
- User content is never translated or spell-checked by default.

---

## 10. Accessibility rules

- Focus ring: 2 px `--focus`, 2 px offset, always visible; never `outline: none`
  without a replacement.
- Hit targets: 32 px minimum for pointer, 44 px for touch; adjacent targets have
  4 px separation.
- Contrast: AA for all text; AAA for body where possible. Check every theme.
- Keyboard: every action available without a pointer except freeform dragging
  (position fields and the Layers list are the alternative).
- The stage has an accessible name and a text alternative: the Layers list.
- `aria-live` for save/publish status; `role="alert"` for errors.
- No colour-only states; icons + text.
- `prefers-reduced-motion` respected; `prefers-contrast` increases borders.
- Dialogs use native semantics, labelled by their title.
- Drag-and-drop file import also works via a button and a file input.
- The exported site: skip link, headings, alt text, `<details>` metadata, native
  controls, visible focus, no hover-only info.

---

## 11. Shipped site themes

Site themes are **separate from the app themes**. They style the exported site:
background, ink, accent, muted, paper, and a font pairing. The editor chrome
keeps the Ficha chrome (light or dark); the site can use any of these
independently.

| Theme     | Background | Ink       | Accent                | Pairing   | Use                     |
| --------- | ---------- | --------- | --------------------- | --------- | ----------------------- |
| Papel     | `#F6F0E4`  | `#1C1917` | `#A82A1E`             | Editorial | default, warm portfolio |
| Riso      | `#FFF6EC`  | `#1B1B1B` | `#E94F37` + `#2A9D8F` | Poster    | zine, comic, loud       |
| Ficha     | `#F7F1E5`  | `#24303F` | `#2E5A88`             | Slab      | archive, collection     |
| Newsprint | `#F2F0EA`  | `#141414` | `#C1121F`             | Slab      | newspaper, editorial    |
| Terminal  | `#101410`  | `#D8F3DC` | `#95D5B2`             | Technical | net art, experimental   |
| Blueprint | `#0E2A47`  | `#EAF4FF` | `#7FD1E8`             | Technical | technical, collection   |

Rules:

- One site theme per site; one accent used sparingly.
- Background textures are optional and subtle (paper grain, halftone, grid).
- User can override background/ink/accent with the colour picker; contrast is
  checked and warned, not blocked.
- The editor chrome does **not** adopt the site theme. Editing stays in Ficha
  light or dark, so the tool remains recognisable and the student's content is
  judged against a stable surface.
- The exported page letterbox uses the page's own background colour, so the
  stage blends into the window instead of sitting on a contrasting mat. Each
  page can have its own background.

---

## 12. Implementation rules

1. **Tokens only.** `src/styles/tokens.css` (shared scales and shape) and
   `src/styles/themes/ficha.css` / `ficha-dark.css` (mode values) are the only
   files with raw hex, spacing, radii, shadows, and motion values. Components use
   `var(--…)`.
2. **No inline styles in UI chrome.** The only allowed inline style is the
   geometry/font/colour of a user element, generated by domain functions and
   emitted as CSS custom properties. The app may set the single `--ui-scale`
   token on `<html>` from preferences; that is a token, not a component patch.
   No string concatenation of arbitrary CSS.
3. **No component library.** Build the primitives in `components/ui/`; they are
   small and shared. Do not import Shoelace, Melt UI, or Tailwind.
4. **Scoped styles.** Svelte scoped `<style>` per component; global CSS only for
   reset, tokens, themes, fonts, and a handful of utilities (`.sr-only`, `.stack`).
5. **Class naming.** Component-scoped classes use short semantic names
   (`.toolbar`, `.page-card`); global classes are prefixed `c-` to avoid leaks.
6. **Icons are components.** One `Icon.svelte` with a name union; no raw SVG
   duplicated across files. 16/20 px, `currentColor`.
7. **No magic numbers.** If a value is not a token, it must be computed from the
   model (element geometry, zoom, stage size) and named.
8. **Dev kitchen sink.** `src/dev/KitchenSink.svelte` renders every primitive and
   state at `/?dev` in development. It is not linked in production and is not
   tested visually.
9. **No visual regression tests.** See `testing.md`. Visual bugs are fixed by eye
   and covered by a pure geometry test when possible.
10. **Mode files do not restyle components.** They set tokens and `--motif-*`
    values only. A selector such as `[data-theme="ficha"] .toolbar { ... }` is a
    review failure; promote the difference to a token instead.
11. **Theme parity.** Every token declared in `tokens.css` must have a value in
    both theme files. A test parses both files and fails on a missing or extra
    token.
12. **Review checklist.** Every UI change: tokens only, keyboard reachable, focus
    visible, both locales, **both modes**, 1280 × 800, no layout shift, no
    console errors.

---

## 13. Do / don't, quickly

| Do                                         | Don't                                             |
| ------------------------------------------ | ------------------------------------------------- |
| flat printed stock, ink rules, one accent  | glass cards, purple gradients                     |
| two themes, one component tree             | a second component tree per theme                 |
| lowercase mono labels                      | Title Case Every Title                            |
| theme-appropriate elevation (hard or soft) | blurred glows on controls                         |
| generous desk around the stage             | edge-to-edge canvas with no breathing room        |
| stamps for start/draft/published           | colour-only status dots                           |
| 6 fonts, 6 palettes, 6 stage presets       | infinite font/colour/size pickers                 |
| native `<details>` metadata                | hover-only tooltip with the only copy of the data |
| page cards with wireframe thumbnails       | loading screenshots for every page                |
| one drag = one undo                        | undo history flooded by pointermove               |
| "descargar sitio" as the escape hatch      | publish as the only way out                       |
