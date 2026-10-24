import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import type { DeckMeta, Slide } from '../types';
import { useSettings, useStore } from '../store';
import { deckClass } from '../theme';
import { parse } from '../parse';
import { moveSlide } from '../reorder';
import { openPresenter, toggleFullscreen } from '../present';
import SlideView from './SlideView';
import Overview from './Overview';

const W = 1920, H = 1080;
const IGNORE = 'input, textarea, select, [contenteditable="true"], .cm-editor';

interface Props { slides: Slide[]; deck: DeckMeta; defaultTransition: string }

export default function Deck({ slides, deck, defaultTransition }: Props) {
  const current = useStore((s) => s.current);
  const setCurrent = useStore((s) => s.setCurrent);
  const setOverflow = useStore((s) => s.setOverflow);
  const overview = useStore((s) => s.overview);
  const settings = useSettings();
  const ovRef = useRef(overview);
  ovRef.current = overview;
  const n = slides.length;
  const cur = Math.min(Math.max(current, 0), n - 1);
  const nRef = useRef(n);
  nRef.current = n;

  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // slides were deleted: pull the index back into range
  useEffect(() => { if (current !== cur) setCurrent(cur); }, [current, cur, setCurrent]);

  // scale-to-fit with letterboxing
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (d: number) => {
    const st = useStore.getState();
    st.setCurrent(Math.min(Math.max(st.current + d, 0), nRef.current - 1));
  };

  // keys: ←/→, Space (Shift+Space back), PageUp/PageDown, Home/End. Ignored while typing and while the deck is hidden.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = wrap.current;
      if (!el || el.offsetParent === null) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(IGNORE)) return;
      const st = useStore.getState();
      const last = nRef.current - 1;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); return; }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openPresenter(); return; }
      if (ovRef.current) return; // the overview handles its own keys (O / Esc included)
      if (e.key === 'o' || e.key === 'O') { e.preventDefault(); st.toggle('overview'); return; }
      let to: number;
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': to = st.current + 1; break;
        case 'ArrowLeft': case 'PageUp': to = st.current - 1; break;
        case ' ':
          if (t?.closest?.('button, a, summary')) return;
          to = st.current + (e.shiftKey ? -1 : 1); break;
        case 'Home': to = 0; break;
        case 'End': to = last; break;
        default: return;
      }
      e.preventDefault();
      st.setCurrent(Math.min(Math.max(to, 0), last));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // touch / pen: swipe, or tap on the left/right half (touch-only click zones; the mouse never navigates by click)
  const g = useRef<{ x: number; y: number; t: number } | null>(null);
  const onUp = (e: RPointerEvent) => {
    const s = g.current; g.current = null;
    if (!s || e.pointerType === 'mouse') return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 800) { go(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) < 10 && dt < 500 && !(e.target as HTMLElement).closest('a, button, input')) {
      const r = wrap.current!.getBoundingClientRect();
      go(e.clientX - r.left < r.width / 2 ? -1 : 1);
    }
  };

  const scale = box.w && box.h ? Math.min(box.w / W, box.h / H) : 0;
  const visible = [cur - 1, cur, cur + 1].filter((i) => i >= 0 && i < n);
  // precedence: slide > deck (first block) > theme. The TARGET slide's transition drives both the entering and the leaving slide.
  const tr = slides[cur]?.meta.transition ?? deck.transition ?? defaultTransition;

  const closeOv = () => useStore.setState({ overview: false });
  const pick = (i: number) => { setCurrent(i); closeOv(); wrap.current?.focus({ preventScroll: true }); };
  const move = (from: number, to: number) => {
    // re-parse the live source: the parent's slides can be up to 150 ms stale
    const st = useStore.getState();
    const fresh = parse(st.content, settings.defaultLayout);
    const next = moveSlide(st.content, fresh.slides, from, to);
    if (next !== null) { st.setContent(next); st.setCurrent(to); }
  };

  return (
    <div
      ref={wrap}
      className={`deck ${deckClass(settings)}`}
      tabIndex={-1}
      role="region"
      aria-roledescription="presentation"
      aria-label={deck.title}
      onPointerDown={(e) => { g.current = { x: e.clientX, y: e.clientY, t: Date.now() }; wrap.current?.focus({ preventScroll: true }); }}
      onPointerUp={onUp}
      onPointerCancel={() => { g.current = null; }}
    >
      {scale > 0 && (
        <div className="deck-stage" style={{ width: W * scale, height: H * scale }}>
          <div className="deck-canvas" style={{ transform: `scale(${scale})` }} {...(box.w < 700 ? { 'data-narrow': '' } : {})}>
            {visible.map((i) => (
              <SlideView
                key={i}
                slide={slides[i]}
                state={i < cur ? 'before' : i === cur ? 'active' : 'after'}
                transition={tr}
                onOverflow={i === cur ? setOverflow : undefined}
              />
            ))}
          </div>
        </div>
      )}
      {overview && <Overview slides={slides} current={cur} onClose={closeOv} onPick={pick} onMove={move} />}
      <div className="deck-progress" aria-hidden="true"><i style={{ width: `${((cur + 1) / n) * 100}%` }} /></div>
      <div className="sr-only" aria-live="polite">Slide {cur + 1} of {n}</div>
    </div>
  );
}
