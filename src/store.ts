import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStore, get, set } from 'idb-keyval';
import type { CodeTheme, Mode, PresetName, ResolvedSettings, ThemeSettings } from './types';
import { PRESETS } from './presets';

/** Same query the CSS uses (copied from Aether). */
export const PHONE_Q = '(max-width: 768px), (pointer: coarse) and (max-height: 500px)';
export const isPhone = () => typeof matchMedia !== 'undefined' && matchMedia(PHONE_Q).matches;

// Own IndexedDB database + persist key: nothing is shared with Aether (same origin on GitHub Pages).
const docs = createStore('aether-slides', 'docs');
const DOC_KEY = 'deck';

/** Code palettes → --hl-* CSS variables (applied by useApplyTheme; the export writes the same variables). */
export const CODE_PALETTES: Record<CodeTheme, Record<string, string>> = {
  'one-dark':     { fg: '#abb2bf', comment: '#5c6370', keyword: '#c678dd', string: '#98c379', number: '#d19a66', title: '#61afef', built: '#e5c07b', var: '#e06c75', meta: '#56b6c2' },
  'github-light': { fg: '#24292e', comment: '#6a737d', keyword: '#d73a49', string: '#032f62', number: '#005cc5', title: '#6f42c1', built: '#e36209', var: '#22863a', meta: '#005cc5' },
  'dracula':      { fg: '#f8f8f2', comment: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', title: '#50fa7b', built: '#8be9fd', var: '#ffb86c', meta: '#8be9fd' },
  'solarized':    { fg: '#839496', comment: '#586e75', keyword: '#859900', string: '#2aa198', number: '#d33682', title: '#268bd2', built: '#b58900', var: '#cb4b16', meta: '#6c71c4' },
  'nord':         { fg: '#d8dee9', comment: '#616e88', keyword: '#81a1c1', string: '#a3be8c', number: '#b48ead', title: '#88c0d0', built: '#8fbcbb', var: '#bf616a', meta: '#d08770' },
};

/** Same dark colors as Aether, so the sibling feel holds. */
export const DEFAULTS: ResolvedSettings = {
  dark: true,
  slideBg: '#1b1e2b', deckBg: '#14161f', text: '#e6e8f0', accent: '#8b7cff', codeBg: '#0e1018',
  headingFont: 'Inter', bodyFont: 'Inter', fontSize: 44, lineHeight: 1.45, letterSpacing: 0, headingScale: 1.25,
  maxWidth: 1600, padding: 96, defaultLayout: 'center',
  gradient: { enabled: false, type: 'linear', angle: 135, stops: ['#1c2a4a', '#14171a'] },
  bgImage: null, blur: 0, darken: 30, saturate: 100, bgMode: 'cover',
  paperEnabled: false, paperType: 'aged', crtEnabled: false, crtIntensity: 40,
  ambientEnabled: false, ambientIntensity: 50, breathingEnabled: false, breathingSpeed: 5,
  hueShiftEnabled: false, hueShiftSpeed: 60, frostedEdgeEnabled: false, frostedEdgeSize: 16,
  slideShadow: false, slideBorder: false, glassCard: false,
  transition: 'fade', transitionSpeed: 400, transitionEasing: 'ease',
  codeTheme: 'one-dark',
  preset: '', // Minimal / Bold / Retro / Paper / Neon (src/presets.ts); '' = none / customised
};

export const fontStack = (n: string) =>
  n === 'JetBrains Mono' ? `'${n}', ui-monospace, monospace` : n === 'Inter' ? `'${n}', system-ui, sans-serif` : `'${n}', Georgia, serif`;

/** No migrations yet (version 1). Future: rename/convert keys here, like Aether's migrate(). */
const migrate = (saved: any) => saved;

type Toggle = 'studioOpen' | 'followCursor' | 'overview';
interface State {
  // persisted
  settings: ThemeSettings; mode: Mode; followCursor: boolean;
  // session
  studioOpen: boolean; overview: boolean; content: string; savedAt: number; dirty: boolean; current: number; overflow: boolean;
  patch: (p: Partial<ThemeSettings>) => void; applyPreset: (n: PresetName) => void; reset: () => void;
  setMode: (m: Mode) => void; toggle: (k: Toggle) => void;
  setContent: (c: string) => void; setCurrent: (i: number) => void; setOverflow: (b: boolean) => void;
}

let last = '';
export const useStore = create<State>()(
  persist(
    (setS) => ({
      settings: DEFAULTS, mode: 'deck', followCursor: true,
      studioOpen: false, overview: false, content: '', savedAt: Date.now(), dirty: false, current: 0, overflow: false,
      // any manual change clears the preset (unless the patch sets it)
      patch: (p) => setS((s) => ({ settings: { ...s.settings, ...p, ...('preset' in p ? {} : { preset: '' as const }) } })),
      applyPreset: (n) => setS({ settings: { ...DEFAULTS, ...PRESETS[n], preset: n } }),
      reset: () => setS({ settings: DEFAULTS }),
      setMode: (mode) => setS({ mode }),
      toggle: (k) => setS((s) => ({ [k]: !s[k] }) as Partial<State>),
      setContent: (content) => setS({ content, dirty: content !== last }),
      setCurrent: (i) => setS({ current: Math.max(0, i) }),
      setOverflow: (overflow) => setS({ overflow }),
    }),
    {
      name: 'aether-slides-settings',
      version: 1,
      partialize: (s) => ({ settings: s.settings, mode: s.mode, followCursor: s.followCursor }),
      // nothing saved yet (first launch) → keep the initial settings
      merge: (p, c) => ({ ...c, ...(p as object), settings: (p as any)?.settings ? { ...DEFAULTS, ...migrate((p as any).settings) } : c.settings }),
    },
  ),
);

/** Settings with every optional field resolved. Components read this. */
export function useSettings(): ResolvedSettings {
  const s = useStore((st) => st.settings);
  return useMemo(() => ({ ...DEFAULTS, ...s }), [s]);
}

export const markLoaded = (c: string) => { last = c; useStore.setState({ dirty: false }); };
export async function saveNow(force = false) {
  const c = useStore.getState().content;
  if (!force && c === last) return;
  try {
    await set(DOC_KEY, c, docs);
    last = c;
    useStore.setState({ savedAt: Date.now(), dirty: useStore.getState().content !== c });
  } catch { /* storage unavailable (private mode / quota): stays "Unsaved" */ }
}
export const loadDoc = () => get<string>(DOC_KEY, docs).catch(() => undefined);
