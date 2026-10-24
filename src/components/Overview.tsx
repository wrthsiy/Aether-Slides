import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import type { Slide } from '../types';
import SlideView from './SlideView';

interface Props {
  slides: Slide[];
  current: number;
  onClose: () => void;
  onPick: (i: number) => void;
  onMove: (from: number, to: number) => void;
}

const PAD = 24, GAP = 16;

/** O: grid of scaled live thumbnails. Thumbnails mount lazily (IntersectionObserver) and stay mounted once seen.
 *  Arrows move, Enter / click jumps, Shift+←/→ or drag reorders (rewrites the Markdown source), Esc / O closes. */
export default function Overview({ slides, current, onClose, onPick, onMove }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(current);
  const [over, setOver] = useState<number | null>(null);
  const n = slides.length;

  useEffect(() => {
    const el = root.current!;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el); setW(el.clientWidth);
    el.focus({ preventScroll: true });
    return () => ro.disconnect();
  }, []);

  const avail = Math.max(200, w - PAD * 2);
  const cols = Math.max(1, Math.min(n, avail > 1500 ? 5 : avail > 1100 ? 4 : avail > 700 ? 3 : avail > 440 ? 2 : 1));
  const thumbW = Math.floor((avail - GAP * (cols - 1)) / cols);

  const st = useRef({ sel, cols, n });
  st.current = { sel, cols, n };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { sel: s, cols: c, n: count } = st.current;
      let to = s;
      switch (e.key) {
        case 'ArrowRight': to = s + 1; break;
        case 'ArrowLeft': to = s - 1; break;
        case 'ArrowDown': to = s + c; break;
        case 'ArrowUp': to = s - c; break;
        case 'Home': to = 0; break;
        case 'End': to = count - 1; break;
        case 'Enter': case ' ': e.preventDefault(); onPick(s); return;
        case 'Escape': case 'o': case 'O': e.preventDefault(); onClose(); return;
        default: return;
      }
      e.preventDefault();
      to = Math.min(Math.max(to, 0), count - 1);
      if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { // keyboard reorder
        if (to !== s) { onMove(s, to); setSel(to); }
        return;
      }
      setSel(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPick, onMove]);

  // the overview sits on top of the deck: its taps must not reach the deck's swipe / tap zones
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const vars = { '--ov-w': thumbW, '--ov-s': thumbW / 1920, '--ov-cols': cols } as CSSProperties;

  return (
    <div ref={root} className="ov" tabIndex={-1} role="dialog" aria-label="Slide overview" style={vars}
      onPointerDown={stop} onPointerUp={stop} onClick={(e) => { if (e.target === root.current) onClose(); }}>
      <p className="ov-hint">Arrows move · Enter opens · drag or Shift+←/→ reorders · Esc closes</p>
      <div className="ov-grid">
        {slides.map((s, i) => (
          <Thumb key={i} slide={s} index={i} selected={i === sel} over={over === i}
            onPick={() => onPick(i)}
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { if (i > 0) { e.preventDefault(); setOver(i); } }}
            onDrop={(e) => { e.preventDefault(); setOver(null); const f = Number(e.dataTransfer.getData('text/plain')); if (Number.isFinite(f)) { onMove(f, i); setSel(i); } }}
            onDragEnd={() => setOver(null)}
          />
        ))}
      </div>
    </div>
  );
}

interface ThumbProps {
  slide: Slide; index: number; selected: boolean; over: boolean; onPick: () => void;
  onDragStart: (e: DragEvent) => void; onDragOver: (e: DragEvent) => void; onDrop: (e: DragEvent) => void; onDragEnd: () => void;
}
function Thumb({ slide, index, selected, over, onPick, onDragStart, onDragOver, onDrop, onDragEnd }: ThumbProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current!;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ block: 'nearest' }); }, [selected]);

  return (
    <button ref={ref} type="button" className={`ov-thumb${selected ? ' sel' : ''}${over ? ' over' : ''}`} onClick={onPick}
      draggable={index > 0} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      aria-label={`Slide ${index + 1}`} aria-current={selected ? 'true' : undefined}>
      <div className="ov-view">
        {seen && <div className="ov-canvas"><SlideView slide={slide} state="active" transition="none" /></div>}
      </div>
      <span className="ov-num">{index + 1}</span>
    </button>
  );
}
