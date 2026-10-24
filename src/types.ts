export const LAYOUTS = ['center', 'top', 'split', 'full'] as const;
export type Layout = (typeof LAYOUTS)[number];

export const TRANSITIONS = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'zoom', 'flip'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const EASINGS = ['ease', 'ease-in-out', 'linear', 'smooth'] as const;
export type Easing = (typeof EASINGS)[number];

export const PRESET_NAMES = ['Minimal', 'Bold', 'Retro', 'Paper', 'Neon'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

/** Phones: which tab is visible. Desktop always shows both. */
export type Mode = 'edit' | 'deck';

// ---------------- parsing ----------------
/** Per-slide frontmatter (as authored). */
export interface SlideMeta {
  layout?: Layout;
  background?: string; // color / gradient / image URL
  class?: string;      // sanitized, space separated
  transition?: Transition;
}
/** Deck-level keys, read from the first slide's frontmatter block. */
export interface DeckMeta { title: string; preset?: PresetName; transition?: Transition }

export interface Slide {
  index: number;
  /** 0-based first source line of the slide (including its frontmatter block). */
  startLine: number;
  /** 0-based last source line of the slide body. */
  endLine: number;
  /** Effective layout (authored `layout:` or the theme's default layout). */
  layout: Layout;
  /** Rendered body HTML (all columns concatenated for a split slide). `layout: full` has its image removed. */
  html: string;
  /** Rendered HTML per column, only for `layout: split` slides that use `+++`. */
  columns?: string[];
  /** `layout: full`: URL of the first image, used as the slide background. */
  image?: string;
  meta: SlideMeta;
  /** Presenter notes. Never rendered on the slide, stripped from exports. */
  notes: string;
}
export interface Warning { line: number; message: string } // 1-based line
export interface ParseResult { deck: DeckMeta; slides: Slide[]; warnings: Warning[] }

// ---------------- theme ----------------
export type BgMode = 'cover' | 'contain' | 'tile';
export type PaperType = 'aged' | 'linen' | 'grid' | 'dotted';
export type CodeTheme = 'one-dark' | 'github-light' | 'dracula' | 'solarized' | 'nord';
export interface GradientSettings { enabled: boolean; type: 'linear' | 'radial'; angle: number; stops: string[] }

/** Optional → settings saved by older versions still load; defaults live in DEFAULTS (store.ts). */
export interface EffectSettings {
  paperEnabled?: boolean; paperType?: PaperType;
  crtEnabled?: boolean; crtIntensity?: number;
  ambientEnabled?: boolean; ambientIntensity?: number;
  breathingEnabled?: boolean; breathingSpeed?: number;
  hueShiftEnabled?: boolean; hueShiftSpeed?: number;
  frostedEdgeEnabled?: boolean; frostedEdgeSize?: number;
  slideShadow?: boolean; slideBorder?: boolean; glassCard?: boolean;
}
export interface TransitionSettings { transition?: Transition; transitionSpeed?: number /* ms */; transitionEasing?: Easing }

export interface ThemeSettings extends EffectSettings, TransitionSettings {
  dark: boolean;
  // colors
  slideBg: string; deckBg: string; text: string; accent: string; codeBg: string;
  // typography (sizes are px on the 1920x1080 canvas)
  headingFont: string; bodyFont: string; fontSize: number; lineHeight: number; letterSpacing: number; headingScale: number;
  // layout
  maxWidth: number; padding: number; defaultLayout: Layout;
  // background
  gradient: GradientSettings; bgImage: string | null; // an URL (persisted, unlike Aether's session-only ObjectURL)
  blur: number; darken: number; saturate: number; bgMode: BgMode;
  codeTheme?: CodeTheme;
  preset?: PresetName | ''; // '' = none / customised
}
export type ResolvedSettings = Required<ThemeSettings>;
export type NumKey = { [K in keyof ResolvedSettings]: ResolvedSettings[K] extends number ? K : never }[keyof ResolvedSettings];
export type BoolKey = { [K in keyof ResolvedSettings]: ResolvedSettings[K] extends boolean ? K : never }[keyof ResolvedSettings];
