const F = '```';

// The demo doubles as documentation: every syntax feature appears once.
export const DEMO = `---
title: Aether Slides
layout: center
background: linear-gradient(135deg, #1c2a4a 0%, #14171a 65%)
---

# Aether Slides {.accent}

Markdown in. A calm presentation out.

<!-- notes: Welcome everyone. This comment is a presenter note; it never appears on the slide. -->

---

## Plain Markdown

Write **bold**, *italic*, ~~strikethrough~~ and \`inline code\`.

- A slide is whatever sits between two \`---\` lines
- Lists, links and emoji work :tada:
- Ordered lists too:
  1. First
  2. Second

---

## Task lists and quotes

- [x] Parse Markdown into slides
- [x] Navigate with the keyboard
- [ ] Style it in the Theme Studio

> A good slide has one idea.

---

## Tables

| Key | Action |
| --- | --- |
| → / Space / PageDown | Next slide |
| ← / PageUp | Previous slide |
| Home / End | First / last slide |

---

## Code

Inline \`const x = 1\`, and a highlighted block:

${F}ts
type Slide = { index: number; notes: string };
const next = (s: Slide): number => s.index + 1;
${F}

A \`---\` inside a fence never splits the slide:

${F}md
# Slide A
---
# Slide B
${F}

---

## Images

Size and style with trailing attributes:

![Aurora](demo-aurora.svg){width=640 .rounded .shadow}

\`![alt](url){width=640 .rounded}\`

---

## Links and footnotes

Aether Slides is a sibling of [Aether](https://wrthsiy.github.io/Aether/), the Markdown editor.[^1]

Links open in a new tab.

[^1]: Same design language, same stack, no server.

---
layout: split
---

## Two columns

- Left column
- Separated by \`+++\`
- Stacks on narrow screens

+++

${F}css
.slide {
  display: grid;
}
${F}

---
layout: full
---

![](demo-aurora.svg)

## Full bleed

The first image becomes the background.

---
layout: top
background: #1d2b24
class: small
---

## Per-slide frontmatter

This slide starts with:

${F}yaml
---
layout: top
background: #1d2b24
class: small
---
${F}

Keys: \`layout\`, \`background\` (color, gradient or image URL), \`class\`, \`transition\`.

---
transition: zoom
---

## Presenter notes

Notes live in an HTML comment and never show on the slide:

${F}md
<!-- notes: Say this out loud. -->
${F}

<!-- notes: This slide also sets transition: zoom, so it zooms in. Press P to open the presenter view: these notes show there, with a timer and the next slide. -->

---

# Thank you {.accent}

← → Space PageUp PageDown Home End

**F** fullscreen · **O** overview · **P** presenter
`;
