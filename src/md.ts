import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import tasks from 'markdown-it-task-lists';
import { full as emoji } from 'markdown-it-emoji';
import hljs from 'highlight.js/lib/common';

// From Aether's md.ts: html:false, footnote, task lists, emoji, highlight.js. Differences for slides:
// no markdown-it-anchor (heading ids would collide across slides), no Copy button (the deck is not an editor).
// Added: per-slide footnote ids (env.docId), links open in a new tab, trailing `{.class width=400}` attributes.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const md: MarkdownIt = new MarkdownIt({
  html: false, linkify: true, typographer: true,
  highlight(code, lang) {
    const body = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : esc(code);
    return `<pre class="hljs"><code>${body}</code></pre>`;
  },
})
  .use(footnote)
  .use(tasks, { enabled: true })
  .use(emoji);

type Tok = ReturnType<typeof md.parse>[number];
type Rule = NonNullable<typeof md.renderer.rules.link_open>;

// links: new tab for real URLs; in-page (#...) links are left alone
const defLink: Rule = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const href = tokens[idx].attrGet('href') || '';
  if (!href.startsWith('#')) { tokens[idx].attrSet('target', '_blank'); tokens[idx].attrSet('rel', 'noopener noreferrer'); }
  return defLink(tokens, idx, opts, env, self);
};

// trailing attributes: `![alt](url){width=400 .rounded}` and `# Title {.accent}`
const CLASS_RE = /^[A-Za-z_][\w-]*$/;
const LEN_RE = /^\d+(\.\d+)?(px|%|em|rem|vw|vh)?$/;

function applyAttrs(tok: Tok, spec: string) {
  const styles: string[] = [];
  for (const part of spec.trim().split(/\s+/)) {
    if (!part) continue;
    if (part[0] === '.') {
      const c = part.slice(1);
      if (CLASS_RE.test(c)) tok.attrJoin('class', c);
    } else {
      const eq = part.indexOf('=');
      if (eq > 0) {
        const k = part.slice(0, eq).toLowerCase(), v = part.slice(eq + 1);
        if ((k === 'width' || k === 'height') && LEN_RE.test(v)) styles.push(`${k}:${/^\d+(\.\d+)?$/.test(v) ? v + 'px' : v}`);
      }
    }
  }
  if (styles.length) tok.attrSet('style', (tok.attrGet('style') || '') + styles.join(';') + ';');
}

md.core.ruler.after('inline', 'slide_attrs', (state) => {
  const toks = state.tokens;
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    if (tok.type !== 'inline' || !tok.children) continue;
    const ch = tok.children;
    for (let j = 0; j < ch.length - 1; j++) {
      if (ch[j].type === 'image' && ch[j + 1].type === 'text') {
        const m = /^\{([^{}]*)\}/.exec(ch[j + 1].content);
        if (m) { applyAttrs(ch[j], m[1]); ch[j + 1].content = ch[j + 1].content.slice(m[0].length); }
      }
    }
    if (i > 0 && toks[i - 1].type === 'heading_open') {
      const last = ch[ch.length - 1];
      if (last && last.type === 'text') {
        const m = /\s*\{([^{}]*)\}\s*$/.exec(last.content);
        if (m) { applyAttrs(toks[i - 1], m[1]); last.content = last.content.slice(0, m.index); }
      }
    }
  }
  return true;
});

const cache = new Map<string, string>();

/** Renders one column of one slide. `docId` keeps footnote ids unique per slide; the export (Commit 3) must pass the same ids. */
export function renderSlideMd(src: string, docId: string): string {
  const k = docId + '\u0000' + src;
  let h = cache.get(k);
  if (h === undefined) {
    h = md.render(src, { docId });
    if (cache.size > 400) cache.clear();
    cache.set(k, h);
  }
  return h;
}

/** `layout: full`: pulls the first image out of the slide (it becomes the background) and renders the rest. */
export function renderFullMd(src: string, docId: string): { html: string; image: string | null } {
  const env = { docId };
  const tokens = md.parse(src, env);
  let image: string | null = null;
  for (let i = 0; i < tokens.length && image === null; i++) {
    const t = tokens[i];
    if (t.type !== 'inline' || !t.children) continue;
    const k = t.children.findIndex((c) => c.type === 'image');
    if (k < 0) continue;
    image = t.children[k].attrGet('src');
    t.children.splice(k, 1);
    const empty = t.children.every((c) => (c.type === 'text' && !c.content.trim()) || c.type === 'softbreak' || c.type === 'hardbreak');
    if (empty && tokens[i - 1]?.type === 'paragraph_open' && tokens[i + 1]?.type === 'paragraph_close') tokens.splice(i - 1, 3);
  }
  return { html: md.renderer.render(tokens, md.options, env), image };
}
