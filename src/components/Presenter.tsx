import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS, loadDoc, useStore } from '../store';
import { applyTheme, deckClass } from '../theme';
import { parse } from '../parse';
import { md } from '../md';
import { DEMO } from '../demo';
import { CHANNEL } from '../sync';
import type { Msg, TimerState } from '../sync';
import type { Slide, ThemeSettings } from '../types';
import SlideView from './SlideView';

/** Presenter window (opened with P; the URL has ?presenter). Never writes the document; navigation and timer go over BroadcastChannel. */

const NOTE_KEY = 'aether-slides-notes-size';
const fmt = (ms: number) => {
  const s = Math.floor(Math.abs(ms) / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
};

/** A live, scaled render of one slide (the real SlideView, not an image). */
function Scaled({ slide, fx, label }: { slide: Slide | undefined; fx: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  const k = w / 1920;
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</div>
      <div ref={ref} className={`deck ${fx}`} style={{ height: 'auto', aspectRatio: '16 / 9', borderRadius: 8 }}>
        {slide && w > 0 ? (
          <div className="deck-stage" style={{ width: 1920 * k, height: 1080 * k }}>
            <div className="deck-canvas" style={{ transform: `scale(${k})` }}>
              <SlideView slide={slide} state="active" transition="none" />
            </div>
          </div>
        ) : !slide ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>End of deck</div>
        ) : null}
      </div>
    </div>
  );
}

export default function Presenter() {
  const [content, setContent] = useState<string | null>(null);
  const [settings, setSettings] = useState<ThemeSettings>(() => useStore.getState().settings);
  const [cur, setCur] = useState(0);
  const [timer, setTimer] = useState<TimerState>({ running: false, acc: 0, t0: 0, target: null });
  const [now, setNow] = useState(Date.now());
  const [size, setSize] = useState(() => Number(localStorage.getItem(NOTE_KEY)) || 24);
  const ch = useRef<BroadcastChannel | null>(null);

  const rs = useMemo(() => ({ ...DEFAULTS, ...settings }), [settings]);
  const parsed = useMemo(() => parse(content ?? '', rs.defaultLayout), [content, rs.defaultLayout]);
  const n = parsed.slides.length;
  const i = Math.min(cur, Math.max(0, n - 1));
  const slide = parsed.slides[i];

  useEffect(() => { applyTheme(rs); }, [rs]);
  useEffect(() => { document.title = `Presenter · ${parsed.deck.title}`; }, [parsed.deck.title]);

  // initial document: ask the main window; if nobody answers, read the saved deck (works when opened by itself)
  useEffect(() => {
    let got = false;
    const c = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
    ch.current = c;
    if (c) {
      c.onmessage = (e: MessageEvent<Msg>) => {
        const m = e.data;
        if (m.type === 'doc') { got = true; setContent(m.content); setSettings(m.settings); setCur(m.current); }
        else if (m.type === 'nav') setCur(m.current);
        else if (m.type === 'timer') setTimer(m.timer);
      };
      c.postMessage({ type: 'hello' } satisfies Msg);
    }
    const fb = setTimeout(async () => { if (!got) setContent((await loadDoc()) ?? DEMO); }, 700);
    return () => { clearTimeout(fb); c?.close(); ch.current = null; };
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);

  const go = useCallback((to: number) => {
    const t = Math.min(Math.max(to, 0), Math.max(0, n - 1));
    setCur(t);
    ch.current?.postMessage({ type: 'go', current: t } satisfies Msg);
  }, [n]);

  const setT = (next: TimerState) => { setTimer(next); ch.current?.postMessage({ type: 'timer', timer: next } satisfies Msg); };
  const elapsed = timer.acc + (timer.running ? now - timer.t0 : 0);
  const start = () => setT({ ...timer, running: true, t0: Date.now() });
  const pause = () => setT({ ...timer, running: false, acc: elapsed });
  const resetT = () => setT({ ...timer, running: false, acc: 0, t0: 0 });
  const targetMs = timer.target ? timer.target * 60000 : null;
  const over = targetMs !== null && elapsed > targetMs;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': go(i + 1); break;
        case 'ArrowLeft': case 'PageUp': go(i - 1); break;
        case ' ': if ((e.target as HTMLElement | null)?.closest?.('button')) return; go(i + (e.shiftKey ? -1 : 1)); break;
        case 'Home': go(0); break;
        case 'End': go(n - 1); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, i, n]);

  const bump = (d: number) => { const v = Math.min(48, Math.max(14, size + d)); setSize(v); localStorage.setItem(NOTE_KEY, String(v)); };
  const fx = deckClass(rs);
  const notesHtml = useMemo(() => (slide?.notes ? md.render(slide.notes, { docId: `n${i}` }) : ''), [slide?.notes, i]);

  if (content === null) return <div className="p-6" style={{ color: 'var(--muted)' }}>Loading…</div>;
  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-editor)', color: 'var(--text)' }}>
      <header className="glass flex shrink-0 flex-wrap items-center gap-3 px-4 py-2">
        <strong className="truncate">{parsed.deck.title}</strong>
        <span style={{ color: 'var(--muted)' }}>Slide {i + 1} / {n}</span>
        <div className="flex-1" />
        <div className={`timer-big ${over ? 'timer-over' : ''}`} aria-label="Elapsed time">{fmt(elapsed)}</div>
        {targetMs !== null && <span className={over ? 'timer-over' : ''} style={over ? undefined : { color: 'var(--muted)' }}>{over ? `+${fmt(elapsed - targetMs)} over` : `${fmt(targetMs - elapsed)} left`}</span>}
        <button className="btn" onClick={timer.running ? pause : start}>{timer.running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}</button>
        <button className="btn" onClick={resetT}>Reset</button>
        <label className="flex items-center gap-1 text-sm">Target
          <input type="number" min={0} max={600} placeholder="min" value={timer.target ?? ''} aria-label="Target minutes"
            className="w-16 rounded px-1 py-0.5" style={{ background: 'color-mix(in srgb, var(--text) 8%, transparent)', color: 'var(--text)', border: '1px solid color-mix(in srgb, var(--text) 18%, transparent)' }}
            onChange={(e) => setT({ ...timer, target: e.target.value ? Math.max(0, Number(e.target.value)) || null : null })} />
          <span style={{ color: 'var(--muted)' }}>min</span>
        </label>
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Scaled slide={slide} fx={fx} label="Current" />
          <div style={{ width: '62%' }}><Scaled slide={parsed.slides[i + 1]} fx={fx} label="Next" /></div>
        </div>
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg p-4" style={{ background: 'color-mix(in srgb, var(--text) 5%, transparent)' }} aria-label="Speaker notes">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Notes</span>
            <div className="flex-1" />
            <button className="btn" onClick={() => bump(-2)} aria-label="Smaller text">A−</button>
            <span className="text-sm tabular-nums" style={{ color: 'var(--muted)' }}>{size}px</span>
            <button className="btn" onClick={() => bump(2)} aria-label="Larger text">A+</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {notesHtml
              ? <div className="notes-md" style={{ fontSize: size }} dangerouslySetInnerHTML={{ __html: notesHtml }} />
              : <p style={{ color: 'var(--muted)', fontSize: size }}>No notes for this slide.</p>}
          </div>
        </section>
      </main>

      <footer className="glass flex shrink-0 items-center justify-center gap-2 px-4 py-2">
        <button className="btn" onClick={() => go(0)} disabled={i === 0} aria-label="First slide">⏮</button>
        <button className="btn" onClick={() => go(i - 1)} disabled={i === 0}>← Prev</button>
        <button className="btn on" onClick={() => go(i + 1)} disabled={i >= n - 1}>Next →</button>
        <button className="btn" onClick={() => go(n - 1)} disabled={i >= n - 1} aria-label="Last slide">⏭</button>
      </footer>
    </div>
  );
}
