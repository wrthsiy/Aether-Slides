import type { Easing, ResolvedSettings } from './types';
import { CODE_PALETTES, fontStack } from './store';

export const EASE: Record<Easing, string> = { ease: 'ease', 'ease-in-out': 'ease-in-out', linear: 'linear', smooth: 'cubic-bezier(.2,.8,.2,1)' };

export const cssUrl = (u: string) => `url("${u.replace(/["\\\n]/g, (c) => encodeURIComponent(c))}")`;

/** CSS variables for a theme. Used live (applyTheme), by the presenter window and by the export's :root block.
 *  `image` overrides settings.bgImage (the local export passes a data URI). */
export function themeVars(s: ResolvedSettings, o: { image?: string | null } = {}): Record<string, string> {
  const image = o.image !== undefined ? o.image : s.bgImage;
  const layers: string[] = [];
  if (image) layers.push(cssUrl(image));
  if (s.gradient.enabled && s.gradient.stops.length >= 2) {
    const stops = s.gradient.stops.join(', ');
    layers.push(s.gradient.type === 'radial' ? `radial-gradient(circle at 50% 40%, ${stops})` : `linear-gradient(${s.gradient.angle}deg, ${stops})`);
  }
  const has = layers.length > 0;
  const v: Record<string, string> = {
    '--slide-bg': s.slideBg, '--deck-bg': s.deckBg, '--text': s.text, '--accent': s.accent, '--code-bg': s.codeBg,
    '--bg-editor': s.deckBg, '--bg-preview': s.slideBg, // the app chrome follows the deck theme
    '--font-heading': fontStack(s.headingFont), '--font-body': fontStack(s.bodyFont),
    '--font-size': `${s.fontSize}px`, '--line-height': String(s.lineHeight), '--letter-spacing': `${s.letterSpacing}em`,
    // one ratio → heading sizes (same exponents as Aether)
    '--h1-size': `${(s.headingScale ** 3.4).toFixed(3)}em`, '--h2-size': `${(s.headingScale ** 2).toFixed(3)}em`,
    '--h3-size': `${s.headingScale.toFixed(3)}em`, '--h4-size': `${(s.headingScale ** 0.5).toFixed(3)}em`,
    '--slide-pad': `${s.padding}px`, '--slide-max': `${s.maxWidth}px`,
    '--tr-speed': `${s.transitionSpeed}ms`, '--tr-ease': EASE[s.transitionEasing],
    // background layer (gradient and/or image), applied to the slide canvas (.slide-theme-bg) and the deck frame (.deck::before)
    '--bg-layer': has ? layers.join(', ') : 'none',
    '--bg-size': s.bgMode === 'tile' ? 'auto' : s.bgMode, '--bg-repeat': s.bgMode === 'tile' ? 'repeat' : 'no-repeat',
    '--bg-blur': `${s.blur}px`, '--bg-sat': String(s.saturate / 100), '--bg-dark': has ? String(s.darken / 100) : '0',
    '--bg-scale': s.blur > 0 ? '1.12' : '1',
    // effects
    '--ambient': String(s.ambientIntensity / 100), '--crt': String(s.crtIntensity / 100),
    '--breath-dur': `${s.breathingSpeed}s`, '--hue-dur': `${s.hueShiftSpeed}s`, '--frost-size': `${s.frostedEdgeSize}px`,
  };
  for (const [k, val] of Object.entries(CODE_PALETTES[s.codeTheme])) v[`--hl-${k}`] = val;
  return v;
}

/** Classes for the `.deck` element (effects). Defined in slides.css, so the export gets them unchanged. */
export function deckClass(s: ResolvedSettings): string {
  const c: string[] = [];
  if (s.paperEnabled) c.push('fx-paper', `paper-${s.paperType}`);
  if (s.crtEnabled) c.push('fx-crt');
  if (s.ambientEnabled) c.push('fx-ambient');
  if (s.breathingEnabled) c.push('fx-breathing');
  if (s.hueShiftEnabled) c.push('fx-hue');
  if (s.frostedEdgeEnabled) c.push('fx-frost');
  if (s.slideShadow) c.push('fx-shadow');
  if (s.slideBorder) c.push('fx-border');
  if (s.glassCard) c.push('fx-glass');
  return c.join(' ');
}

export function applyTheme(s: ResolvedSettings) {
  const r = document.documentElement;
  Object.entries(themeVars(s)).forEach(([k, val]) => r.style.setProperty(k, val));
  r.classList.toggle('dark', s.dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.deckBg);
}
