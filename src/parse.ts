import { LAYOUTS, PRESET_NAMES, TRANSITIONS } from './types';
import type { DeckMeta, Layout, ParseResult, PresetName, Slide, SlideMeta, Transition, Warning } from './types';
import { renderFullMd, renderSlideMd } from './md';

// Line-based state machine. Synchronous and DOM-free (md.ts renders strings), so the export can call it as is.

const KV = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/;
const SEP = /^---\s*$/;
const COL = /^\+\+\+\s*$/;
const NOTES_RE = /<!--\s*notes:\s*([\s\S]*?)-->/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const CLASS_RE = /^[A-Za-z_][\w-]*$/;

interface Chunk { start: number; end: number } // [start, end) line indexes

export interface Bg { kind: 'color' | 'gradient' | 'image'; value: string }

/** Classifies a `background:` value. Returns null for anything we refuse to put into a style attribute. */
export function classifyBackground(raw: string): Bg | null {
  const v = raw.trim();
  if (!v || /[;{}<>\n]/.test(v)) return null;
  if (/^(repeating-)?(linear|radial|conic)-gradient\(.*\)$/i.test(v)) return /url\(|expression/i.test(v) ? null : { kind: 'gradient', value: v };
  if (/^(https?:\/\/|data:image\/|\.{0,2}\/)/i.test(v) || /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(v)) return { kind: 'image', value: v };
  if (/^(#[0-9a-f]{3,8}|(rgb|hsl|hwb|lab|lch|oklab|oklch)a?\([^()]*\)|[a-z]+)$/i.test(v)) return { kind: 'color', value: v };
  return null;
}

/** Marks lines that belong to a fenced code block (``` or ~~~, closed by the same char and at least the same length). */
function fenceMask(lines: string[]): boolean[] {
  const mask: boolean[] = new Array(lines.length).fill(false);
  let ch = '', len = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!ch) {
      const m = /^\s*(`{3,}|~{3,})(.*)$/.exec(l);
      if (m && !(m[1][0] === '`' && m[2].includes('`'))) { ch = m[1][0]; len = m[1].length; mask[i] = true; }
    } else {
      mask[i] = true;
      const m = /^\s*(`{3,}|~{3,})\s*$/.exec(l);
      if (m && m[1][0] === ch && m[1].length >= len) ch = '';
    }
  }
  return mask;
}

const unquote = (v: string) => { const m = /^(["'])(.*)\1$/.exec(v); return m ? m[2] : v; };

/** `defaultLayout` comes from the theme: it decides `+++` splitting and `full` image extraction for slides without `layout:`. */
export function parse(src: string, defaultLayout: Layout = 'center'): ParseResult {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const mask = fenceMask(lines);
  const warnings: Warning[] = [];
  const warn = (line: number, message: string) => warnings.push({ line: line + 1, message });

  // 1. split into chunks on lone `---` (never inside a fence)
  const chunks: Chunk[] = [];
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!mask[i] && SEP.test(lines[i])) { chunks.push({ start, end: i }); start = i + 1; }
  }
  chunks.push({ start, end: lines.length });

  const blank = (c: Chunk) => { for (let i = c.start; i < c.end; i++) if (lines[i].trim()) return false; return true; };
  const kvOnly = (c: Chunk) => {
    let n = 0;
    for (let i = c.start; i < c.end; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      const m = KV.exec(l);
      if (!m || m[2].startsWith('//')) return false; // `http://...` alone is text, not a key
      n++;
    }
    return n > 0;
  };

  if (chunks.length > 1 && blank(chunks[0])) chunks.shift();                  // leading `---`
  while (chunks.length > 1 && blank(chunks[chunks.length - 1])) chunks.pop(); // trailing `---`

  // 2. frontmatter
  const deck: Partial<DeckMeta> = {};
  const readFm = (c: Chunk, first: boolean): SlideMeta => {
    const meta: SlideMeta = {};
    for (let i = c.start; i < c.end; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      const m = KV.exec(l);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = unquote(m[2].trim());
      switch (key) {
        case 'layout':
          if ((LAYOUTS as readonly string[]).includes(val)) meta.layout = val as Layout;
          else warn(i, `Unknown layout "${val}" (use ${LAYOUTS.join(' / ')})`);
          break;
        case 'background':
          if (classifyBackground(val)) meta.background = val;
          else warn(i, `Can't read background "${val}"`);
          break;
        case 'class': {
          const all = val.split(/\s+/).filter(Boolean);
          const ok = all.filter((t) => CLASS_RE.test(t));
          if (ok.length) meta.class = ok.join(' ');
          if (ok.length !== all.length) warn(i, 'Some class names were ignored (letters, digits, - and _ only)');
          break;
        }
        case 'transition':
          if (!(TRANSITIONS as readonly string[]).includes(val)) warn(i, `Unknown transition "${val}"`);
          else if (first) deck.transition = val as Transition; // first block: deck-wide default
          else meta.transition = val as Transition;
          break;
        case 'title':
          if (first) deck.title = val; else warn(i, '"title" only works in the first slide\'s frontmatter (ignored)');
          break;
        case 'preset': {
          const p = PRESET_NAMES.find((n) => n.toLowerCase() === val.toLowerCase());
          if (!first) warn(i, '"preset" only works in the first slide\'s frontmatter (ignored)');
          else if (p) deck.preset = p as PresetName;
          else warn(i, `Unknown preset "${val}" (use ${PRESET_NAMES.join(' / ')})`);
          break;
        }
        default:
          warn(i, `Unknown key "${m[1]}" (ignored)`);
      }
    }
    return meta;
  };

  // 3. body: fence-aware notes, other comments and `+++` columns
  const readBody = (c: Chunk, split: boolean) => {
    const notes: string[] = [];
    const cols: string[][] = [[]];
    let buf: string[] = [];
    const flush = () => {
      if (!buf.length) return;
      const text = buf.join('\n')
        .replace(NOTES_RE, (_m, n: string) => { notes.push(n.trim()); return ''; })
        .replace(COMMENT_RE, ''); // html:false would show other comments as text
      cols[cols.length - 1].push(text);
      buf = [];
    };
    for (let i = c.start; i < c.end; i++) {
      if (mask[i]) { flush(); cols[cols.length - 1].push(lines[i]); }
      else if (split && COL.test(lines[i])) { flush(); cols.push([]); }
      else buf.push(lines[i]);
    }
    flush();
    return {
      columns: cols.map((p) => p.join('\n').replace(/^(\s*\n)+/, '').replace(/\s+$/, '')),
      notes: notes.join('\n\n'),
    };
  };

  // 4. slides: a chunk made only of `key: value` lines is the frontmatter of the next chunk
  const slides: Slide[] = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    let fm: Chunk | undefined;
    let c = chunks[ci];
    if (ci + 1 < chunks.length && kvOnly(c)) { fm = c; c = chunks[++ci]; }
    const index = slides.length;
    const meta = fm ? readFm(fm, index === 0) : {};
    const layout = meta.layout ?? defaultLayout;
    const { columns, notes } = readBody(c, layout === 'split');

    let html: string, cols: string[] | undefined, image: string | undefined;
    if (layout === 'full') {
      const r = renderFullMd(columns[0] ?? '', `s${index}`);
      html = r.html; image = r.image ?? undefined;
    } else if (columns.length > 1) {
      cols = columns.map((m, k) => renderSlideMd(m, `s${index}c${k}`));
      html = cols.join('');
    } else {
      html = renderSlideMd(columns[0] ?? '', `s${index}`);
    }
    slides.push({ index, startLine: (fm ?? c).start, endLine: Math.max(c.start, c.end - 1), layout, html, columns: cols, image, meta, notes });
  }

  // 5. deck title: frontmatter, else the first top-level heading outside fences
  if (!deck.title) {
    for (let i = 0; i < lines.length; i++) {
      if (mask[i]) continue;
      const m = /^#\s+(.+?)\s*(\{[^{}]*\})?\s*$/.exec(lines[i]);
      if (m) { deck.title = m[1].replace(/[*_`~]/g, ''); break; }
    }
  }
  return { deck: { title: deck.title || 'Untitled', preset: deck.preset, transition: deck.transition }, slides, warnings };
}
