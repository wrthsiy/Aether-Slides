# Notes: Commits 2–6

## Verification status (read first)
The sandbox has no network: no `npm install`, no `vite build`, no browser. What I did run:
- every `.ts` / `.tsx` through the TypeScript transpiler (0 syntax errors);
- a type check with the third-party packages stubbed as `any` (only noise from the stubs, no errors in the new logic that I could attribute to my code);
- `parse()` + `moveSlide()` under Node against the demo deck (12 slides, 0 warnings, moves keep frontmatter, round trip is lossless);
- `node --check` on `exportRuntime.js`; CSS brace balance.

Everything else is untested: the whole UI, the export (fonts, images, the generated file), the presenter window, the service worker. Send me the compile or runtime errors and I'll fix them.

## Marked `[to reconcile]`
- **Theme Studio primitives** (`Section`, `Group`, `Row`, `Color`, `Range`, `Select`, `Check`) are my own. Aether's `ThemeStudio.tsx` was not in your message (the "version I'll send below" did not arrive), so no pixel parity. Same for `preview.css`. Styles are in the "Theme Studio sections" block of `index.css`.
- **Preset values** (`presets.ts`) are my choice of palettes, fonts, effects and transitions, not Aether's.
- **`swPlugin()`** in `vite.config.ts` is written from scratch (precaches all of `dist/`, cache name `aether-slides-<hash>`, fonts cache `aether-slides-fonts`, `activate` deletes only other `aether-slides-*` caches). Aether's was not available.
- **`deploy.yml`** is the standard Vite → Pages workflow, not a copy of Aether's. It runs `npm ci`, so commit a `package-lock.json`.
- **Icons** are placeholders: the favicon artwork rendered to PNG (192, 512, maskable 512, apple-touch 180).
- **Effect interpretations** (no Aether reference): *breathing* = slow scale/opacity pulse of the slide content; *hue shift* = the background layers rotate through hue (text stays put); *ambient* = drifting accent glow in the frame around the slide; *frosted edge* = blurred glass ring of N px inside the slide edge; *glass card* = blurred translucent card behind the text of every non-`full` slide (its padding can trigger the clipped-content warning); *CRT* = scanlines, vignette, text glow, slight flicker.

## Decisions (defaults I took)
- **Presets**: applying = `DEFAULTS` + preset values + `preset: name` (previous customisation is discarded). `patch()` clears `preset`.
- **`preset:` in frontmatter** applies when the value *changes* (typing it, editing it), not on every page load, so a customised theme survives a reload. A deck opened fresh with `preset: Retro` therefore keeps your saved theme until you touch that line. Easy to change if you want it applied on load.
- **Code theme** picks also set `codeBg` (otherwise `github-light` on a dark code background is unreadable). You can still override the color afterwards.
- **Backgrounds**: gradient and `bgImage` (URL) stack in one `--bg-layer`; blur / darken / saturate / mode act on it. The same layer also fills the deck frame, blurred (+28 px) and darkened. A per-slide `background:` paints over the theme layer.
- **Transitions**: the *target* slide's `transition:` (else deck, else theme) drives both the entering and the leaving slide, so they always agree. Jumps of more than one slide (Home / End, follow-cursor, overview) cut instantly because only i-1 / i / i+1 are mounted. `flip` is a Y-axis flip of both slides at once, not a two-sided card.
- **Overview**: slide 1 is fixed (it carries the deck keys), so it can't be dragged and nothing can be dropped before it. Drag-and-drop is HTML5 DnD (mouse); on touch use tap-to-jump, or Shift+←/→ with a keyboard. Reordering rewrites the source, so the editor's undo history is not involved (Ctrl+Z in the editor will undo it only as one big replace).
- **`#/N`**: read once on load (wins over "slide 1"), mirrored with `replaceState` (no history spam), `hashchange` navigates.
- **Presenter**: same bundle at `?presenter`. Opened by P / the Present menu; the main window answers `hello` with content + theme + slide, then pushes `nav` immediately and `doc` (debounced 120 ms). Navigation in the presenter sends `go`. Timer state lives in the presenter window(s); the main window only relays the last one to a newly opened presenter. If nobody answers within 0.7 s (opened by itself), it loads the saved deck from IndexedDB.
- **Export click zones**: touch/pen = left/right half; mouse = outer 20 % edges only, so text stays selectable. (The app's own deck keeps "mouse never navigates by click".)
- **Export fonts (local)**: one Google Fonts CSS2 request with `&text=` (all characters of all slides, plus basic punctuation), weights 400/600/700 (Inter), Lora 400/600/700 + italic 400, Merriweather 400/700 + italic 400, JetBrains Mono 400/500 only if the deck has code/kbd. If the character set makes the URL too long (CJK-heavy decks) it falls back to the Latin subset and warns. If the fetch fails the file falls back to system fonts and warns.
- **Export images (local)**: `fetch()` at export time, so the image host must allow CORS. Failures stay as links and are listed as warnings. Relative URLs (like the demo's `demo-aurora.svg`) resolve against the app.
- **Export structure**: one `<style>` with `slides.css` then a `:root{…}` block with the theme variables, effect classes on `.deck`. The exported file has no presenter view and no reordering.
- **Dark interface** checkbox (`dark`) only drives `color-scheme` and the `.dark` class, as in Commit 1.
- `html: false` stays: no iframes, so no YouTube embeds (README says so).

## Known rough edges
- Overview thumbnails render real slides, effects included (CRT, hue shift, glass card): with many slides and heavy effects it can be slow. Thumbnails mount lazily and stay mounted once seen.
- `backdrop-filter` (frosted edge, glass card) and the animated `hue-rotate` are GPU-heavy on low-end phones.
- Fullscreen does nothing on iPhone Safari (no Fullscreen API for non-video elements). Pop-up blockers can block P; the Present menu click is a user gesture and works.
- The phone sheet: snaps are 112 px peek / 50 % / 92 % of the visual viewport; flicks are projected 160 ms ahead; dragging well below peek closes it. Double-tap on the handle toggles half/full.
- Export of very large decks mounts every slide in the DOM (no lazy mounting in the exported file).
- Presenter timer's "target" is stored only in the timer state (not persisted across closing both windows).
- The studio's *Reset* uses `confirm()`.

## What to test
1. `npm install && npm run dev`, `npm run build` (watch `tsc --noEmit` first: any type error is mine).
2. Theme Studio: each preset; change one value → preset chip clears; each section on desktop and on a phone (snap peek/half/full, close by dragging down, content scrolls to the bottom in every snap).
3. Backgrounds: gradient, an image URL, blur / darken / saturate, cover / contain / tile; the frame around the slide follows.
4. Transitions: all seven, forward and back; per-slide `transition:` (demo slide 11 = zoom); deck default in the first block; reduced-motion (OS setting) = instant.
5. Effects: toggle each; Paper presets look right in light mode; CRT intensity; frost size.
6. Export local: open the file with Wi-Fi off from `file://` (fonts, demo image, all keys, swipe on a phone, O, F, `#/5`); size toast; try a deck with a CORS-blocked image URL; try > 10 MB.
7. Export external: opens online, fonts load from Google, images are links; notes absent in both (search the file for the notes text).
8. P: window opens, notes render as Markdown, A− / A+, timer (start / pause / reset / target, turns red when over), navigate in either window, change theme or text in the main window and watch the presenter follow.
9. O: lazy thumbnails, arrows / Enter / click, drag a slide, Shift+←/→, source rewritten, editor updated, slide 1 refuses.
10. `#/N` on load, while navigating, and after editing slides.
11. PWA: after `npm run build && npm run preview` the app installs, works offline; DevTools → Application: caches are `aether-slides-<hash>` and `aether-slides-fonts`.

## Aether-side service-worker fix (apply in Aether's SW template after Commit 6)
```js
// before
ks.filter((k) => k !== CACHE)
// after
ks.filter((k) => k.startsWith('aether-') && !k.startsWith('aether-slides-') && k !== CACHE)
```
Slides' own SW only deletes `aether-slides-*` caches, so the two apps no longer evict each other.
