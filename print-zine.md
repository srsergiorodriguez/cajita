# Print zine export — design notes

Status: **planned, experimental, not implemented** (2026-11-17).

cajita's normal output is a responsive website. This document describes a
separate print export for fixed-page zines using Paged.js, while keeping the
web export available for every project.

## Core model

- One cajita page = one printed page.
- The page canvas represents the **printable content area**, not the full sheet.
- The aspect ratio of the canvas is derived from the page size minus margins.
- Mirrored inner/outer margins are supported.
- The print output is generated from the same project; the website output remains
  available.
- Text and elements are not reflowed between pages in the first version.

## Geometry

```text
content width  = paper width  - inner margin - outer margin
content height = paper height - top margin   - bottom margin
canvas ratio   = content width / content height
```

Example: Half Letter, portrait, 12 mm top/bottom, 16 mm inner, 10 mm outer.

```text
paper:   5.5 × 8.5 in
content: 4.5 × 7.5 in (approximately)
ratio:   0.6
```

The canvas fills the content box exactly. The white paper margin remains outside
the canvas.

## Proposed project fields

```js
print: {
  enabled: true,
  paper: {
    preset: 'half-letter' | 'a5' | 'a4' | 'letter' | 'custom',
    width: 5.5,
    height: 8.5,
    unit: 'in'
  },
  orientation: 'portrait' | 'landscape',
  margins: {
    top: 12,
    bottom: 12,
    inner: 16,
    outer: 10,
    unit: 'mm'
  },
  marginContentInset: 5, // distance from trim for folios/running heads
  folio: {
    show: true,
    position: 'bottom-outer' | 'bottom-center' | 'bottom-inner'
      | 'top-outer' | 'top-center' | 'top-inner' | 'none',
    hideOnFirst: true
  },
  runningHead: {
    show: true,
    content: 'none' | 'project-title' | 'page-title',
    position: 'top-outer' | 'top-center' | 'top-inner'
  },
  color: 'color' | 'grayscale',
  bleed: null // reserved; adds trim/bleed boxes later
}
```

Paper dimensions and margins should be stored in real units, not screen pixels.
The editor can show both real units and the corresponding canvas pixel size.

## Project creation

The New Project flow gets a print option:

```text
Tipo de proyecto
  ● Sitio web
  ○ Zine imprimible
```

Print projects ask for paper, orientation, margins, and optional folio/running
head settings up front, because the stage ratio depends on them. Existing web
projects may enable print later, with a warning that changing the stage ratio
can alter the composition.

The canvas dimensions should be normalized to a comfortable editor size while
preserving the content-area ratio, for example 1200 px wide with a derived height.
Asset resolution is independent of the editor canvas.

## Paged.js output

- Load Paged.js only in the print export, never in the normal website export.
- One `<section class="zine-page">` per cajita page.
- Each section contains a fixed `.stage` whose ratio equals the content area.
- Use CSS page breaks between sections.
- Use `@page` size and margins for the physical sheet.
- Use margin boxes for folios and running heads.
- Use named pages for a cover without numbering, and later for full-bleed pages.
- Provide a preview and browser print / Save as PDF.

Example CSS outline:

```css
@page {
  size: 5.5in 8.5in;
  margin: 12mm 10mm 12mm 16mm;

  @bottom-right {
    content: counter(page);
    padding-bottom: var(--folio-inset);
  }

  @top-right {
    content: string(running-title);
    padding-top: var(--folio-inset);
  }
}

@page :left {
  margin-left: 10mm;
  margin-right: 16mm;
}

@page :right {
  margin-left: 16mm;
  margin-right: 10mm;
}
```

## Margins and safe area

The page margin holds the folio and running head, but text must not touch the
trim. The margin-content inset is separate from the content margin.

Validation rules:

- `inset + folio line height < margin` on the relevant side;
- no folio or running head in the same margin box;
- warn when the requested margin is below a printer-safe minimum;
- default margins should allow a stitch/binding edge.

Suggested defaults:

```text
top/bottom: 12 mm
inner:      16 mm
outer:      10 mm
inset:       5 mm
```

## Print rendering profile

The print renderer reuses the normal element renderer with print behavior:

- buttons: idle state only;
- animations: first frame only;
- ficha collections: static archive, no search/filter controls;
- fichas: print-safe card content;
- video/audio: placeholder or omit;
- HTML/embeds: poster/placeholder or omit;
- page backgrounds: optional;
- images: optional grayscale/high-contrast treatment;
- links: optional URL annotations.

These choices belong to the print export, not the project data, unless they need
to persist. Start with export-time options and promote settings to the project
only when necessary.

## Bleed (reserved)

`print.bleed` stays in the model but is intentionally unused in the first
version. Later it should add:

- bleed area around the trim;
- crop marks;
- full-bleed page backgrounds;
- a safe-area preview.

This must not change the content-area ratio used by the editor.

## Imposition (separate feature)

Imposition is out of scope for the first print export. It can be added later:

- booklet page ordering;
- saddle-stitch signatures;
- blank page insertion;
- print-shop spreads.

The one-page-per-page model and known page count make imposition possible without
changing the composition format.

## Implementation phases

1. Print project creation and print geometry in the model.
2. Print export dialog with paper, margins, and folio/header settings.
3. Paged.js print HTML/CSS with fixed pages and margin boxes.
4. Print-safe element profile.
5. Print preview and Save as PDF.
6. Bleed/crop marks.
7. Booklet imposition.

## Open decisions

- default paper preset and margin preset;
- whether print settings are editable after project creation;
- page-number format (`1`, `01`, `1 / N`);
- running-head source and first-page behavior;
- whether print projects expose a separate web-preset or reuse the normal site
  export unchanged.
