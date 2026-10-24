# Commits 2–6 (one pass)

Built on top of Commit 1 (`aether-slides-commit-1.zip`). No new dependencies, `package.json` is unchanged.

## New files
| File | Summary |
| --- | --- |
| `src/presets.ts` | The five presets (Minimal, Bold, Retro, Paper, Neon) and `CODE_BG` (matching code background per code theme). |
| `src/theme.ts` | `themeVars()` (all CSS variables: colors, type, layout, background layer, effects, code palette), `deckClass()` (effect classes for `.deck`), `applyTheme()`. Shared by the app, the presenter and the export. |
| `src/reorder.ts` | `moveSlide()`: rewrites the Markdown source to move one slide (used by the overview). |
| `src/present.ts` | `toggleFullscreen()` and `openPresenter()`. |
| `src/sync.ts` | BroadcastChannel protocol (hello / go / nav / doc / timer) and `useMainSync()` for the main window. |
| `src/export.ts` | `buildExport(content, settings, 'local' \| 'external')`, `download()`, `fmtSize()`. |
| `src/exportRuntime.js` | Plain-JS runtime inlined into exported files (keys, swipe, click zones, progress, `#/N`, fullscreen, overview). Imported with `?raw`. |
| `src/components/Overview.tsx` | Grid of lazy, scaled live thumbnails; keyboard, click, drag reorder. |
| `src/components/Presenter.tsx` | The `?presenter` window: current + next preview, Markdown notes, timer. |
| `public/manifest.webmanifest`, `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | PWA manifest and placeholder icons (the favicon artwork rendered to PNG). |
| `.github/workflows/deploy.yml` | Vite build, then GitHub Pages. |

## Changed files
| File | Summary |
| --- | --- |
| `src/components/ThemeStudio.tsx` | Full studio: Presets, Slide (Colors, Typography, Layout, Background), Effects, Transitions, Code theme. Primitives Section / Group / Row / Color / Range / Select / Check. Phone sheet with peek / half / full snaps, handle at the top edge, content padded below it. |
| `src/store.ts` | `patch` clears `preset`; new `applyPreset`; `overview` session flag. |
| `src/slides.css` | Theme background layer (slide canvas + deck frame), seven transitions, nine effects, overview styles, `.sr-only`, `.no-tr`. |
| `src/index.css` | Studio section/primitive styles, presenter notes styles, toast. |
| `src/components/SlideView.tsx` | Adds the `.slide-theme-bg` layer; `cssUrl` moved to `theme.ts`. |
| `src/components/Deck.tsx` | One transition value for all mounted slides (target slide's), effect classes, F / O / P keys, overview mount, reorder handler. |
| `src/components/Toolbar.tsx` | Export menu wired (local / external), Present menu (phones: one More menu), toast with size and warnings. |
| `src/App.tsx` | Uses `applyTheme`, `#/N` sync, `preset:` frontmatter, `useMainSync`. |
| `src/main.tsx` | `?presenter` renders the presenter; registers the service worker in production. |
| `src/demo.ts` | Notes and last slide mention the new features. |
| `vite.config.ts` | `swPlugin()` (prefix `aether-slides-`, emits `dist/sw.js`). |
| `index.html` | Manifest and apple-touch-icon links. |
| `README.md` | Keys, Theme Studio, Export section, YouTube limitation, presenter, deploy. |
