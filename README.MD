# Aether Slides: usage tips

## The basics

- A slide is whatever sits between two lines that contain only `---`. A `---` inside a code fence never splits a slide.
- Write plain Markdown: headings, lists, tables, task lists, quotes, code blocks, footnotes, emoji (`:tada:`).
- Raw HTML is off, so no `<iframe>` or YouTube embeds. Link to the video instead; links open in a new tab.
- Your text is saved in the browser (IndexedDB) automatically every 2 seconds. The status bar shows Saved or Unsaved.

## Per-slide settings (frontmatter)

Put `key: value` lines between two `---` lines right before a slide:

```
---
layout: split
background: linear-gradient(135deg, #1c2a4a, #14171a)
class: small
transition: zoom
---

## My slide
```

| Key | Values |
| --- | --- |
| `layout` | `center`, `top`, `split`, `full` |
| `background` | a color, a `linear-gradient(...)`, or an image URL |
| `class` | `small`, `big`, or your own class names |
| `transition` | `none`, `fade`, `slide-left`, `slide-right`, `slide-up`, `zoom`, `flip` |

The first block of the deck also accepts deck-wide keys: `title`, `preset` (Minimal, Bold, Retro, Paper, Neon) and `transition` (default for all slides).

Precedence for transitions: slide, then deck, then the Theme Studio setting.

## Layouts

- **center**: centered text (default).
- **top**: left aligned, starts at the top.
- **split**: two columns, separated by a line containing only `+++`. They stack on narrow screens.
- **full**: the first image on the slide becomes the full background, the rest of the text sits at the bottom.

## Images and styling

```
![Aurora](demo-aurora.svg){width=640 .rounded .shadow}
# Title {.accent}
```

Useful classes: `.accent`, `.muted`, `.rounded`, `.circle`, `.shadow`, `.left`, `.center`, `.right`.

## Presenter notes

```
<!-- notes: Say this out loud.
It can span several lines. -->
```

Notes never show on the slide and are removed from exported files. They appear in the presenter view (P).

## Keys

| Key | Action |
| --- | --- |
| Right / Space / PageDown | next slide |
| Left / Shift+Space / PageUp | previous slide |
| Home / End | first / last slide |
| F | fullscreen |
| O | overview |
| P | presenter view (new window) |

Keys only work while the focus is not in the editor. Click the deck first if they seem dead.

On touch screens: swipe, or tap the left or right half of the slide.

## Overview (O)

- Arrow keys move, Enter or click opens a slide, Esc closes.
- Drag a thumbnail, or press Shift+Left / Shift+Right, to reorder. This rewrites your Markdown.
- Slide 1 is fixed because it holds the deck keys.

## Presenter view (P)

- Shows the current slide, a live preview of the next one, and your notes as Markdown.
- A- / A+ change the notes size.
- Timer: Start, Pause, Reset, and an optional target in minutes (turns red when over).
- Navigating in either window moves both. Theme and text edits in the main window show up in the presenter too.
- If nothing opens, allow pop-ups for the site.

## Theme Studio

- Presets replace the whole theme. Changing any single setting afterwards clears the preset label.
- Sections: Slide (colors, typography, layout, background), Effects, Transitions, Code theme.
- Picking a code theme also sets a matching code background; you can still change it afterwards.
- Heavy effects (CRT, glass card, frosted edge, hue shift) can be slow on older phones.

## Exporting

**Export** gives one `.html` file named after the deck title.

- **Local**: fonts and images are embedded, so it works offline from `file://`. You need a connection while exporting. Images from servers that block cross-origin downloads stay as links and are listed as warnings.
- **External**: smaller; fonts come from Google Fonts and images stay as links, so it needs internet.
- Both contain navigation, progress bar, fullscreen (F), overview (O) and `#/N` links. They do not contain the presenter view or notes.
- Over 10 MB you get a warning: use fewer or smaller images, or the External export.

## Sharing a specific slide

The address follows the slide: `...#/5` opens slide 5. Works in the app and in exported files.

## Quick troubleshooting

- Slide looks cut off: the status bar shows a clipped-content warning. Shorten the text, use class `small`, or use `layout: split`.
- A key or value is ignored: open the warnings list in the status bar; it names the line.
- Slide separator not working: the line must contain only `---` (no text before it). Underlining a heading with `---` does not make a heading; use `##`.
- Fullscreen does nothing on iPhone Safari; that is a browser limit.
