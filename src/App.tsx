import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { loadDoc, markLoaded, saveNow, useSettings, useStore } from './store';
import { applyTheme } from './theme';
import { useMainSync } from './sync';
import { useIsPhone, useVisualViewport } from './mobile';
import { parse } from './parse';
import { DEMO } from './demo';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Deck from './components/Deck';
import ThemeStudio from './components/ThemeStudio';
import StatusBar from './components/StatusBar';

/** Pushes the theme into CSS variables (src/theme.ts) → deck and chrome restyle instantly. Effects are classes on .deck (Deck.tsx). */
function useApplyTheme() {
  const s = useSettings();
  useEffect(() => { applyTheme(s); }, [s]);
  return s;
}

/** `#/N` (1-based) ⇄ current slide. The hash is read once on load (it wins over slide 1), then mirrored with replaceState. */
function useHashSync() {
  const current = useStore((st) => st.current);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      const m = /^#\/(\d+)$/.exec(location.hash);
      if (m) useStore.getState().setCurrent(Math.max(0, Number(m[1]) - 1)); // Deck clamps it to the last slide
      return; // do not overwrite the incoming hash with #/1
    }
    const h = `#/${current + 1}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }, [current]);
  useEffect(() => {
    const f = () => {
      const m = /^#\/(\d+)$/.exec(location.hash);
      if (m) useStore.getState().setCurrent(Math.max(0, Number(m[1]) - 1));
    };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
}

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function Workspace() {
  const s = useSettings();
  const phone = useIsPhone();
  const mode = useStore((st) => st.mode);
  const content = useStore((st) => st.content);
  const [split, setSplit] = useState(45);
  const box = useRef<HTMLDivElement>(null);

  // debounced parse (150 ms). Lives here, not in Editor.tsx, because Deck, StatusBar and Editor share the result
  // and a change of the theme's default layout must re-parse too.
  const dc = useDebounced(content, 150);
  const parsed = useMemo(() => parse(dc, s.defaultLayout), [dc, s.defaultLayout]);
  const startLines = useMemo(() => parsed.slides.map((x) => x.startLine), [parsed]);
  useHashSync();

  // `preset:` in the first frontmatter block applies that preset when the value CHANGES (not on every load,
  // so a customised theme survives a reload). Typing a new preset name in the source re-applies it.
  const fmPreset = useRef(parsed.deck.preset);
  useEffect(() => {
    if (parsed.deck.preset && parsed.deck.preset !== fmPreset.current) useStore.getState().applyPreset(parsed.deck.preset);
    fmPreset.current = parsed.deck.preset;
  }, [parsed.deck.preset]);

  // Draggable divider (desktop only; phones switch tabs). Same approach as Aether.
  const drag = (e: RPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => {
      const r = box.current!.getBoundingClientRect();
      setSplit(Math.min(80, Math.max(20, ((ev.clientX - r.left) / r.width) * 100)));
    };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  };

  const showEd = !phone || mode === 'edit', showDeck = !phone || mode === 'deck';
  return (
    <>
      <Toolbar />
      <main ref={box} className="flex min-h-0 flex-1 flex-row">
        <section className="min-h-0 min-w-0" style={{ display: showEd ? undefined : 'none', flex: phone ? '1 1 0' : `0 0 ${split}%` }}>
          <Editor startLines={startLines} />
        </section>
        {!phone && (
          <div onPointerDown={drag} role="separator" aria-orientation="vertical" aria-label="Resize editor and deck"
            className="z-10 w-1.5 shrink-0 cursor-col-resize touch-none"
            style={{ background: 'color-mix(in srgb, var(--accent) 35%, transparent)' }} />
        )}
        <section className="relative min-h-0 min-w-0 flex-1" style={{ display: showDeck ? undefined : 'none' }}>
          <div className="absolute inset-0">
            <Deck slides={parsed.slides} deck={parsed.deck} defaultTransition={s.transition} />
          </div>
        </section>
      </main>
      <StatusBar slides={parsed.slides} warnings={parsed.warnings} />
      <ThemeStudio />
    </>
  );
}

export default function App() {
  useApplyTheme();
  useVisualViewport();
  useMainSync();
  const phone = useIsPhone();
  const setContent = useStore((st) => st.setContent);
  const [ready, setReady] = useState(false);

  // Initial load: IndexedDB → demo deck. The URL hash (#/N) is applied by useHashSync once the deck is on screen.
  useEffect(() => {
    (async () => {
      const c = (await loadDoc()) ?? DEMO;
      setContent(c); markLoaded(c); setReady(true);
    })();
  }, [setContent]);

  // Autosave every 2 s (saveNow skips when nothing changed) and when the page is hidden
  useEffect(() => {
    const t = setInterval(() => void saveNow(), 2000);
    const hide = () => void saveNow();
    addEventListener('pagehide', hide);
    return () => { clearInterval(t); removeEventListener('pagehide', hide); };
  }, []);

  if (!ready) return null;
  // On phones the root is pinned to the visual viewport so the keyboard never covers the status bar
  const phoneRoot = phone ? { position: 'fixed' as const, top: 0, left: 0, right: 0, height: 'var(--vvh, 100%)', transform: 'translateY(var(--vvtop, 0px))' } : {};
  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-editor)', ...phoneRoot }}>
      <Workspace />
    </div>
  );
}
