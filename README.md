# cajita

An editor for small hypermedia sites: pages made of images, text, video, and
sound; links between them; a static folder at the end.

Status: **1.6.0 — shared viewport and responsive limits (complete)**.

The project library, IndexedDB persistence, `.cajita` bundles, media pipeline,
autosave, free canvas, page CRUD, page sizing, typography, custom fonts, links,
map, fichas, video/sound, embeds, shapes, compositions, drawings, preview,
single-file and full-site export, and GitHub Pages publishing are in place.
This release adds a project design system with shared color tokens, text styles,
radius presets, a palette generator, and a live preview. Page editor and preview
now share a viewport-width model: viewport changes simulate layout and iframe
reflow, while zoom only magnifies the rendered page. `100%` is true CSS size;
fit modes show their real percentage. Responsive minimum and maximum widths are
editable, and new pages default their maximum to the design width. Exported
pages remain fluid.

Canonical URL: <https://srsergiorodriguez.github.io/cajita/>

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run verify     # svelte-check + vitest + build
npm run build      # static output in dist/
```

Bun works too (`bun install`, `bun run dev`), but npm is the tested default.

## Deploy

The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/` to
GitHub Pages on every push to `main`. In the repository settings, set
**Pages → Source** to **GitHub Actions** if it is not already enabled. The
canonical URL is <https://srsergiorodriguez.github.io/cajita/>.

## Stack

- Svelte 5 + Vite, plain JavaScript (ESM), no TypeScript build step.
- Ficha is the only editor chrome, with dark as the default mode, a light mode, and 120% type by default.
- Spanish by default, with an ES/EN switch.
- Local-first: IndexedDB working copy, `.cajita` ZIP backups, no accounts, no
  server, no tracking.
- Media is optimized to WebP on import (GIFs stay GIFs); project limits keep the
  bundle and the later site small.
- Custom font files are validated, loaded with FontFace, and managed from the
  project font manager.

## Tutorial

Open **cómo funciona** from the project library or the help button in the editor.
The tutorial modal walks through projects, media, composition, embeds, pages/map,
fichas, preview, export, publishing, and settings with screenshots from the
example project.

## Docs

- [architecture.md](architecture.md) — boundaries, model, persistence, export.
- [design-system.md](design-system.md) — tokens, Ficha light/dark, components.
- [testing.md](testing.md) — what is tested, what is not, manual QA.
- [print-zine.md](print-zine.md) — planned Paged.js zine export (experimental).
- [plan.md](plan.md) — the active sprint only.
- [diary.md](diary.md) — what changed and why.

## License

PolyForm Noncommercial 1.0.0 for the cajita editor. The pages and sites you make with it are yours and may be used commercially under [OUTPUT-LICENSE.md](OUTPUT-LICENSE.md).
