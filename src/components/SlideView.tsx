import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { Slide } from '../types';
import { classifyBackground } from '../parse';
import { cssUrl } from '../theme';

export type SlideState = 'before' | 'active' | 'after';

interface Props {
  slide: Slide;
  state: SlideState;
  transition: string;
  /** Active slide only: reports whether the content is clipped. */
  onOverflow?: (over: boolean) => void;
}

function bgStyle(raw?: string): CSSProperties | undefined {
  const bg = raw ? classifyBackground(raw) : null;
  if (!bg) return undefined;
  if (bg.kind === 'image') return { backgroundImage: cssUrl(bg.value), backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: bg.value };
}

export default function SlideView({ slide, state, transition, onOverflow }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const measure = () => {
    const c = contentRef.current, b = bodyRef.current;
    if (!c || !b || !onOverflow) return;
    const padB = parseFloat(getComputedStyle(c).paddingBottom) || 0;
    let over = b.offsetTop + b.offsetHeight > c.clientHeight - padB + 1 || b.scrollWidth > b.clientWidth + 1;
    if (!over) for (const pre of Array.from(c.querySelectorAll('pre'))) if (pre.scrollWidth > pre.clientWidth + 1) { over = true; break; }
    onOverflow(over);
  };

  useLayoutEffect(() => { if (state === 'active') measure(); });
  useEffect(() => {
    if (state !== 'active') return;
    const f = () => measure();
    void document.fonts?.ready.then(f);
    const el = contentRef.current;
    el?.addEventListener('load', f, true); // images
    return () => el?.removeEventListener('load', f, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // in-page links (footnotes) must not touch location.hash (reserved for #/N in Commit 5)
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (a && a.getAttribute('href')?.startsWith('#')) e.preventDefault();
  };

  const cols = slide.columns ?? [slide.html];
  return (
    <section
      className={`slide layout-${slide.layout} is-${state}${slide.meta.class ? ' ' + slide.meta.class : ''}`}
      data-tr={transition}
      data-index={slide.index}
      aria-hidden={state !== 'active'}
      onClick={onClick}
    >
      <div className="slide-theme-bg" />
      <div className="slide-bg" style={bgStyle(slide.meta.background)} />
      {slide.image && <div className="slide-bg-img" style={{ backgroundImage: cssUrl(slide.image) }} />}
      <div className="slide-content" ref={contentRef}>
        <div className={`slide-body${cols.length > 1 ? ' cols' : ''}`} ref={bodyRef}>
          {cols.map((html, k) => <div className="col" key={k} dangerouslySetInnerHTML={{ __html: html }} />)}
        </div>
      </div>
    </section>
  );
}
