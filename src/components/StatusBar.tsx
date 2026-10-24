import { useState } from 'react';
import type { Slide, Warning } from '../types';
import { useStore } from '../store';

export default function StatusBar({ slides, warnings }: { slides: Slide[]; warnings: Warning[] }) {
  const current = useStore((s) => s.current);
  const overflow = useStore((s) => s.overflow);
  const dirty = useStore((s) => s.dirty);
  const [open, setOpen] = useState(false);
  const n = slides.length;
  const cur = Math.min(current, n - 1);
  const count = warnings.length + (overflow ? 1 : 0);

  return (
    <footer className="bar-bottom glass relative flex shrink-0 items-center gap-3 px-3 text-xs">
      <span>Slide {cur + 1} / {n}</span>
      <span style={{ color: 'var(--muted)' }}>{slides[cur]?.layout}</span>
      <div className="flex-1" />
      {count > 0 && (
        <button className="btn" style={{ minHeight: 0, padding: '.1rem .5rem' }} aria-expanded={open} onClick={() => setOpen(!open)}>
          ⚠ {count} {count === 1 ? 'warning' : 'warnings'}
        </button>
      )}
      <span aria-live="polite" style={{ color: 'var(--muted)' }}>{dirty ? 'Unsaved' : 'Saved'}</span>
      {open && count > 0 && (
        <div className="warn-pop glass fade-in" role="status">
          {overflow && <div>Slide {cur + 1}: content is clipped (too much for one slide).</div>}
          {warnings.slice(0, 50).map((w, i) => <div key={i}>Line {w.line}: {w.message}</div>)}
        </div>
      )}
    </footer>
  );
}
