import slidesCss from './slides.css?inline';
import runtime from './exportRuntime.js?raw';
import { classifyBackground, parse } from './parse';
import { deckClass, themeVars } from './theme';
import type { ResolvedSettings, Slide } from './types';

export type ExportMode = 'local' | 'external';
export interface ExportResult { html: string; filename: string; bytes: number; warnings: string[] }

export const SIZE_WARN = 10 * 1024 * 1024;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ea = (s: string) => esc(s).replace(/"/g, '&quot;');
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const cssUrl = (u: string) => `url("${u.replace(/["\\\n]/g, (c) => encodeURIComponent(c))}")`;

/** Google Fonts specs (CSS2 API) for the fonts the Theme Studio offers. */
const FONT_SPEC: Record<string, string> = {
  Inter: 'Inter:wght@400;600;700',
  Lora: 'Lora:ital,wght@0,400;0,600;0,700;1,400',
  Merriweather: 'Merriweather:ital,wght@0,400;0,700;1,400',
  'JetBrains Mono': 'JetBrains+Mono:wght@400;500',
};
const MONO = 'JetBrains Mono';

export const filenameFor = (title: string) => (title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Untitled') + '.html';

// ---------- fetch helpers ----------
async function fetchT(url: string, ms = 15000): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { signal: ac.signal }); } finally { clearTimeout(t); }
}
const blobToDataUri = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function b64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
const MIME: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };

async function imageToDataUri(url: string): Promise<string> {
  const abs = new URL(url, document.baseURI).href;
  const r = await fetchT(abs);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  let b = await r.blob();
  if (!b.type.startsWith('image/')) { // some servers answer octet-stream: fall back to the extension
    const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(abs)?.[1]?.toLowerCase() ?? '';
    b = new Blob([b], { type: MIME[ext] ?? 'image/png' });
  }
  return blobToDataUri(b);
}

// ---------- markup ----------
/** Same structure as SlideView.tsx. Notes are never part of Slide.html, so nothing to strip here. */
function slideSection(s: Slide, tr: string, html: string[], image?: string, bg?: string): string {
  const cols = html;
  return `<section class="slide layout-${s.layout} is-after${s.meta.class ? ' ' + ea(s.meta.class) : ''}" data-trs="${ea(tr)}" data-index="${s.index}">` +
    `<div class="slide-theme-bg"></div><div class="slide-bg" style="${ea(bg ?? '')}"></div>` +
    (image ? `<div class="slide-bg-img" style="background-image:${ea(cssUrl(image))}"></div>` : '') +
    `<div class="slide-content"><div class="slide-body${cols.length > 1 ? ' cols' : ''}">${cols.map((h) => `<div class="col">${h}</div>`).join('')}</div></div></section>`;
}

const IMG_SRC = /(<img\b[^>]*?\ssrc=")([^"]+)(")/g;

// ---------- fonts ----------
async function embedFonts(families: string[], chars: string, warnings: string[]): Promise<string> {
  const specs = families.map((f) => FONT_SPEC[f]).filter(Boolean);
  if (!specs.length) return '';
  const base = 'https://fonts.googleapis.com/css2?' + specs.map((x) => 'family=' + x).join('&') + '&display=swap';
  const text = encodeURIComponent(chars);
  let css: string;
  try {
    const subset = text.length <= 6500; // very long URLs are rejected → fall back to the Latin subset
    const r = await fetchT(subset ? `${base}&text=${text}` : base);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    css = await r.text();
    if (!subset) {
      const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].filter((m) => m[1] === 'latin').map((m) => m[2]);
      css = faces.join('\n');
      warnings.push('The deck uses many different characters, so fonts were embedded as the full Latin subset only (other scripts fall back to system fonts).');
    }
    const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
    const data = new Map<string, string>();
    await Promise.all(urls.map(async (u) => {
      const fr = await fetchT(u);
      if (!fr.ok) throw new Error(`HTTP ${fr.status}`);
      data.set(u, `data:font/woff2;base64,${b64(await fr.arrayBuffer())}`);
    }));
    return css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_m, u: string) => `url(${data.get(u)})`);
  } catch (e) {
    warnings.push(`Fonts could not be embedded (${(e as Error).message}). The file falls back to system fonts. Check your connection and export again.`);
    return '';
  }
}

// ---------- the export ----------
export async function buildExport(content: string, s: ResolvedSettings, mode: ExportMode): Promise<ExportResult> {
  const local = mode === 'local';
  const warnings: string[] = [];
  const { deck, slides } = parse(content, s.defaultLayout);

  // 1. images → data URIs (local) ----------------------------------------------------------
  const imgMap = new Map<string, string>();
  if (local) {
    const urls = new Set<string>();
    const add = (u?: string | null) => { if (u && !u.startsWith('data:')) urls.add(u); };
    for (const sl of slides) {
      for (const h of sl.columns ?? [sl.html]) for (const m of h.matchAll(IMG_SRC)) add(unesc(m[2]));
      add(sl.image);
      const bg = sl.meta.background ? classifyBackground(sl.meta.background) : null;
      if (bg?.kind === 'image') add(bg.value);
    }
    add(s.bgImage);
    await Promise.all([...urls].map(async (u) => {
      try { imgMap.set(u, await imageToDataUri(u)); }
      catch (e) { warnings.push(`Could not embed image ${u.length > 70 ? u.slice(0, 70) + '…' : u} (${(e as Error).message}). It stays a link and will not load offline. (The server may block cross-origin downloads.)`); }
    }));
  }
  const img = (u: string) => imgMap.get(u) ?? u;

  // 2. slides ------------------------------------------------------------------------------
  let allText = '', hasCode = false;
  const sections = slides.map((sl) => {
    const parts = (sl.columns ?? [sl.html]).map((h) => {
      allText += ' ' + h; if (/<(pre|code|kbd)\b/.test(h)) hasCode = true;
      return h.replace(IMG_SRC, (_m, a: string, u: string, b: string) => a + ea(img(unesc(u))) + b);
    });
    const bgRaw = sl.meta.background ? classifyBackground(sl.meta.background) : null;
    // built directly (not through bgAttr): a data URI contains `;`, which classifyBackground refuses
    const bg = !bgRaw ? '' : bgRaw.kind === 'image' ? `background-image:${cssUrl(img(bgRaw.value))};background-size:cover;background-position:center` : `background:${bgRaw.value}`;
    const tr = sl.meta.transition ?? deck.transition ?? s.transition;
    return slideSection(sl, tr, parts, sl.image ? img(sl.image) : undefined, bg);
  }).join('\n');

  // 3. fonts -------------------------------------------------------------------------------
  const families = [...new Set([s.headingFont, s.bodyFont, ...(hasCode ? [MONO] : [])])].filter((f) => FONT_SPEC[f]);
  let fontHead = '';
  if (local) {
    const plain = new DOMParser().parseFromString(allText, 'text/html').body.textContent ?? '';
    const chars = [...new Set((plain + ' 0123456789.,:;!?-–—\'"“”‘’()[]/…•→←↩︎').split(''))].sort().join('');
    fontHead = `<style>${await embedFonts(families, chars, warnings)}</style>`;
  } else {
    const all = [...new Set([...families, MONO])];
    fontHead = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      `<link rel="stylesheet" href="${ea('https://fonts.googleapis.com/css2?' + all.map((f) => 'family=' + FONT_SPEC[f]).join('&') + '&display=swap')}">`;
  }

  // 4. assemble ----------------------------------------------------------------------------
  const vars = themeVars(s, { image: s.bgImage ? (local ? img(s.bgImage) : s.bgImage) : null });
  const rootCss = `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')};color-scheme:${s.dark ? 'dark' : 'light'}}`;
  const pageCss = 'html,body{margin:0;height:100%;overflow:hidden;background:var(--deck-bg)}.deck{position:fixed;inset:0;width:auto;height:auto}';
  const title = deck.title;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="generator" content="Aether Slides">
<meta name="theme-color" content="${ea(s.deckBg)}">
<title>${esc(title)}</title>
${fontHead}
<style>${slidesCss}
${rootCss}
${pageCss}</style>
</head>
<body>
<div id="deck" class="deck ${deckClass(s)}" tabindex="-1" role="region" aria-roledescription="presentation" aria-label="${ea(title)}">
<div class="deck-stage"><div class="deck-canvas">
${sections}
</div></div>
<div class="deck-progress" aria-hidden="true"><i></i></div>
<div id="live" class="sr-only" aria-live="polite"></div>
</div>
<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
  const bytes = new Blob([html]).size;
  if (bytes > SIZE_WARN) warnings.unshift(`The file is ${(bytes / 1048576).toFixed(1)} MB (over 10 MB). Smaller or fewer images help, or use the External export (images stay links).`);
  return { html, filename: filenameFor(title), bytes, warnings };
}

export function download(r: ExportResult) {
  const url = URL.createObjectURL(new Blob([r.html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = r.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
