# Aether Slides

Markdown in, presentation out. Sibling of [Aether](https://github.com/wrthsiy/Aether), built from scratch with a few proven pieces copied over.

```
npm install
npm run dev      # http://localhost:5173/Aether-Slides/
npm run build    # tsc --noEmit && vite build (also writes dist/sw.js)
```

## Writing slides

Slides are separated by a line containing only `---` (never inside a code fence). The demo deck that loads on first launch documents the full syntax.

- **Frontmatter** per slide (a block of `key: value` lines before the slide): `layout` (`center` / `top` / `split` / `full`), `background` (color, gradient or image URL), `class`, `transition`. The first block also takes deck keys: `title`, `preset`, `transition`.
- **Columns**: `+++` inside a `layout: split` slide.
- **Presenter notes**: `<!-- notes: ... -->` (multi-line). Never shown on the slide, never exported.
- **Images**: `![alt](url){width=640 .rounded .shadow}`.
- Raw HTML in Markdown is disabled (`html: false`, same as Aether). Other HTML comments are removed.

## Keys

| Key | Action |
| --- | --- |
| → / Space / PageDown | Next slide |
| ← / Shift+Space / PageUp | Previous slide |
| Home / End | First / last slide |
| F | Fullscreen |
| O | Overview (arrows move, Enter opens, drag or Shift+←/→ reorders, Esc closes) |
| P | Presenter view in a new window |

The URL hash follows the slide: `#/3` opens slide 3. Touch: swipe, or tap the left / right half.

## Theme Studio

Presets (Minimal, Bold, Retro, Paper, Neon) replace the whole theme; any manual change clears the preset. Sections: Slide (colors, typography, layout, background), Effects, Transitions, Code theme. `preset: Retro` in the first frontmatter block applies a preset when the value changes.

Transitions: none, fade, slide-left, slide-right, slide-up, zoom, flip. Direction-aware (going back reverses them). A slide's `transition:` overrides the deck default (first block), which overrides the Theme Studio. `prefers-reduced-motion` cuts instantly.

## Export

**Export ▾** writes one `.html` file named after the deck title. Presenter notes are stripped from both variants. Both include keyboard, swipe and click-zone navigation, a progress bar, `#/N`, **F** fullscreen and **O** overview (no presenter view and no reordering in the exported file). The file size is shown after the export, with a warning above 10 MB.

| | Local · self-contained | External · needs internet |
| --- | --- | --- |
| Fonts | Embedded as base64 WOFF2, subset to the characters the deck uses (fetched from Google Fonts at export time) | Google Fonts `<link>` |
| Images | Embedded as data URIs | Original URLs |
| `slides.css` | Inlined | Inlined |
| Works from `file://` offline | Yes | Slides yes, fonts and images need a connection |

Local export needs a connection while exporting (fonts) and image hosts that allow cross-origin downloads. Anything that cannot be embedded stays a link and is listed as a warning.

### Limitation: YouTube and other embeds

Raw HTML is off (`html: false`), so `<iframe>` embeds such as YouTube do not work. Link to the video instead (links open in a new tab).

## Presenter view

**P** opens a second window: current slide, a live scaled preview of the next one, the notes of the current slide (Markdown, adjustable text size) and a timer (elapsed, start / pause / reset, optional target in minutes). Slide, timer and theme stay in sync with the main window over `BroadcastChannel`; navigating in either window moves both. Allow pop-ups for the site if your browser blocks it.

## Offline / install

The build writes `dist/sw.js` (precaches the app) and a web app manifest, so Aether Slides can be installed and opened offline. Caches are named `aether-slides-*`, and the service worker only ever deletes caches with that prefix, because Aether shares the origin.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml` (build, then GitHub Pages). Commit the `package-lock.json` created by your first `npm install`, since the workflow uses `npm ci`. In the repository settings set Pages → Source to "GitHub Actions".
