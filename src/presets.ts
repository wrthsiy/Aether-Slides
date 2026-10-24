import type { CodeTheme, PresetName, ThemeSettings } from './types';

/** Matching code background per code theme (picking a code theme in the studio also sets `codeBg`). */
export const CODE_BG: Record<CodeTheme, string> = {
  'one-dark': '#0e1018', 'github-light': '#f3f4f6', dracula: '#282a36', solarized: '#002b36', nord: '#2e3440',
};

/** Applying a preset = DEFAULTS + these values + `preset: name` (store.applyPreset). Any manual change clears `preset`. */
export const PRESETS: Record<PresetName, Partial<ThemeSettings>> = {
  Minimal: {
    dark: false, slideBg: '#ffffff', deckBg: '#eceef2', text: '#1a1c22', accent: '#2f6bff', codeBg: CODE_BG['github-light'], codeTheme: 'github-light',
    headingFont: 'Inter', bodyFont: 'Inter', fontSize: 44, headingScale: 1.2, darken: 0,
    transition: 'fade', transitionSpeed: 300, transitionEasing: 'ease', slideShadow: true,
  },
  Bold: {
    dark: true, slideBg: '#0b0b0f', deckBg: '#000000', text: '#ffffff', accent: '#ffd400', codeBg: '#17171d', codeTheme: 'one-dark',
    headingFont: 'Inter', bodyFont: 'Inter', fontSize: 52, headingScale: 1.36, lineHeight: 1.35, defaultLayout: 'center', darken: 30,
    transition: 'slide-left', transitionSpeed: 450, transitionEasing: 'smooth',
  },
  Retro: {
    dark: true, slideBg: '#0c1a10', deckBg: '#050b07', text: '#9bff9b', accent: '#ffb000', codeBg: '#06100a', codeTheme: 'solarized',
    headingFont: 'JetBrains Mono', bodyFont: 'JetBrains Mono', fontSize: 40, headingScale: 1.22, lineHeight: 1.5,
    crtEnabled: true, crtIntensity: 55, slideBorder: true,
    transition: 'slide-up', transitionSpeed: 350, transitionEasing: 'ease-in-out',
  },
  Paper: {
    dark: false, slideBg: '#f4ecd8', deckBg: '#e4d9bd', text: '#3b3226', accent: '#a4452c', codeBg: '#ebe1c8', codeTheme: 'github-light',
    headingFont: 'Lora', bodyFont: 'Merriweather', fontSize: 40, headingScale: 1.28, lineHeight: 1.6,
    paperEnabled: true, paperType: 'aged', slideShadow: true, darken: 0,
    transition: 'fade', transitionSpeed: 500, transitionEasing: 'ease',
  },
  Neon: {
    dark: true, slideBg: '#0d0221', deckBg: '#07010f', text: '#f5e9ff', accent: '#ff2bd6', codeBg: '#1b0a33', codeTheme: 'dracula',
    headingFont: 'Inter', bodyFont: 'Inter', fontSize: 46, headingScale: 1.3,
    gradient: { enabled: true, type: 'linear', angle: 150, stops: ['#2a0a4d', '#0d0221'] }, darken: 0,
    ambientEnabled: true, ambientIntensity: 60, glassCard: true, slideBorder: true,
    transition: 'zoom', transitionSpeed: 450, transitionEasing: 'smooth',
  },
};
