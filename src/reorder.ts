import type { Slide } from './types';

/** Moves slide `from` to position `to` by rewriting the Markdown source. Returns null when nothing can change.
 *  Slide 1 is fixed: it carries the deck keys (title / preset / transition), which only work in the first block. */
export function moveSlide(src: string, slides: Slide[], from: number, to: number): string | null {
  const n = slides.length;
  if (from === to || from < 1 || to < 1 || from >= n || to >= n) return null;
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks = slides.map((s, k) => lines.slice(s.startLine, k < n - 1 ? slides[k + 1].startLine - 1 : s.endLine + 1));
  const pre = lines.slice(0, slides[0].startLine);
  const post = lines.slice(slides[n - 1].endLine + 1);
  const [b] = blocks.splice(from, 1);
  blocks.splice(to, 0, b);
  const out = [...pre];
  blocks.forEach((blk, k) => {
    if (k > 0) {
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push('---');
      if (blk.length && blk[0].trim()) out.push('');
    }
    out.push(...blk);
  });
  out.push(...post);
  return out.join('\n');
}
