# cajita

An editor for small hypermedia sites: pages made of images, text, video, and
sound; links between them; a static folder at the end.

Status: **S28 — content-space masks and copy cleanup (complete)**. The project library,
IndexedDB persistence, `.cajita` bundles, media pipeline, autosave, free canvas,
page CRUD, page size, typography, custom fonts, links, map, fichas, video/sound,
YouTube/Observable embeds, circle/square/triangle shapes, schema-driven ficha
records with fixed cards, schema-first CSV import with create/update modes and optional grid placement, an
inline-editable ficha table with per-cell validation, visitor-movable fichas
with local position persistence and reset, schema ordering, inline table image
editing, one-step collection ZIP import, small/full export options with a portable
single-file HTML and worker-compressed ZIP, a media manager, schema visibility, element/media clipboard, p5 sketches, polygon image masks, a styled audio
player, real page thumbnails, a one-column add palette with a split pages/media bottom
bar, and a live-verified GitHub Pages publish flow are in place. Videos are capped at 20 MB, and Medios scrolls
horizontally.

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
- [plan.md](plan.md) — the active sprint only.
- [diary.md](diary.md) — what changed and why.

## License

PolyForm Noncommercial 1.0.0 for the cajita editor. The pages and sites you make with it are yours and may be used commercially under [OUTPUT-LICENSE.md](OUTPUT-LICENSE.md).
