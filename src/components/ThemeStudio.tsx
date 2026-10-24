import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent, ReactNode } from 'react';
import { CODE_PALETTES, useSettings, useStore } from '../store';
import { useIsPhone, useVvHeight } from '../mobile';
import { CODE_BG, PRESETS } from '../presets';
import { EASINGS, LAYOUTS, PRESET_NAMES, TRANSITIONS } from '../types';
import type { BgMode, BoolKey, CodeTheme, NumKey, PaperType, ThemeSettings } from '../types';

/* ---------------------------------------------------------------------------------------------
   [to reconcile] Aether's real ThemeStudio.tsx was not available. Section, Group, Row, Color, Range, Select
   and Check below are my own versions with the same names and roles; swap in Aether's if you want pixel parity.
   --------------------------------------------------------------------------------------------- */
const Section = ({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) => (
  <details className="sec" open={open}><summary>{title}</summary><div className="sec-body">{children}</div></details>
);
const Group = ({ title, children }: { title: string; children: ReactNode }) => <div className="grp"><h3>{title}</h3>{children}</div>;
const Row = ({ label, children, value }: { label: string; children: ReactNode; value?: string }) => (
  <label className="row"><span className="row-l">{label}{value !== undefined && <em>{value}</em>}</span>{children}</label>
);
const Color = ({ label, v, set }: { label: string; v: string; set: (v: string) => void }) => (
  <Row label={label}><input type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'} onChange={(e) => set(e.target.value)} /></Row>
);
const Range = ({ label, v, min, max, step = 1, unit = '', set }: { label: string; v: number; min: number; max: number; step?: number; unit?: string; set: (v: number) => void }) => (
  <Row label={label} value={`${v}${unit}`}><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} /></Row>
);
const Select = <T extends string>({ label, v, opts, set }: { label: string; v: T; opts: readonly T[]; set: (v: T) => void }) => (
  <Row label={label}><select value={v} onChange={(e) => set(e.target.value as T)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></Row>
);
const Check = ({ label, v, set }: { label: string; v: boolean; set: (v: boolean) => void }) => (
  <label className="row row-check"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /><span>{label}</span></label>
);

const FONTS = ['Inter', 'Lora', 'Merriweather', 'JetBrains Mono'] as const;
const PAPERS: readonly PaperType[] = ['aged', 'linen', 'grid', 'dotted'];
const BGMODES: readonly BgMode[] = ['cover', 'contain', 'tile'];
const CODE_THEMES = Object.keys(CODE_PALETTES) as CodeTheme[];

type Snap = 'peek' | 'half' | 'full';
const PEEK = 112; // px of the sheet visible in the "peek" snap (handle + title)

export default function ThemeStudio() {
  const open = useStore((s) => s.studioOpen);
  const toggle = useStore((s) => s.toggle);
  const patch = useStore((s) => s.patch);
  const applyPreset = useStore((s) => s.applyPreset);
  const reset = useStore((s) => s.reset);
  const s = useSettings();
  const phone = useIsPhone();
  const vvh = useVvHeight();

  const num = (k: NumKey, label: string, min: number, max: number, step = 1, unit = '') =>
    <Range label={label} v={s[k] as number} min={min} max={max} step={step} unit={unit} set={(v) => patch({ [k]: v } as Partial<ThemeSettings>)} />;
  const chk = (k: BoolKey, label: string) => <Check label={label} v={s[k] as boolean} set={(v) => patch({ [k]: v } as Partial<ThemeSettings>)} />;
  const col = (k: 'slideBg' | 'deckBg' | 'text' | 'accent' | 'codeBg', label: string) => <Color label={label} v={s[k]} set={(v) => patch({ [k]: v })} />;
  const setStop = (i: number, v: string) => { const stops = [...s.gradient.stops]; stops[i] = v; patch({ gradient: { ...s.gradient, stops } }); };

  // ---- phone bottom sheet: snaps peek / half / full, dragged by the handle at the top edge ----
  const [snap, setSnap] = useState<Snap>('half');
  const [dy, setDy] = useState<number | null>(null); // live drag offset (px, relative to the snap position)
  const drag = useRef({ y0: 0, t0: 0, base: 0 });
  const H = Math.round(vvh * 0.92);
  const snapY: Record<Snap, number> = { full: 0, half: Math.max(0, H - Math.round(vvh * 0.5)), peek: Math.max(0, H - PEEK) };
  useEffect(() => { if (open && phone) setSnap('half'); }, [open, phone]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') toggle('studioOpen'); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, toggle]);

  const down = (e: RPointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { y0: e.clientY, t0: Date.now(), base: snapY[snap] }; setDy(0); };
  const move = (e: RPointerEvent) => { if (dy !== null) setDy(Math.max(-snapY[snap], e.clientY - drag.current.y0)); };
  const up = (e: RPointerEvent) => {
    if (dy === null) return;
    const { y0, t0, base } = drag.current;
    const v = (e.clientY - y0) / Math.max(1, Date.now() - t0); // px/ms, + = down
    const y = base + dy + v * 160;                              // project the flick
    setDy(null);
    if (y > snapY.peek + 70) { toggle('studioOpen'); return; }  // dragged below peek: close
    setSnap((['full', 'half', 'peek'] as Snap[]).reduce((a, b) => (Math.abs(snapY[b] - y) < Math.abs(snapY[a] - y) ? b : a)));
  };

  const offY = open ? snapY[snap] + (dy ?? 0) : H + 24;
  const style = phone
    ? { height: H, transform: `translateY(${offY}px)`, transition: dy !== null ? 'none' : undefined, overflow: 'hidden', padding: 0 } as const
    : { padding: 0, overflow: 'hidden' } as const;
  // the part of the sheet below the screen must stay reachable by scrolling
  const scrollStyle = phone ? { paddingTop: 40, paddingBottom: snapY[snap] + 24 } : undefined;

  return (
    <aside className={`studio glass ${open ? 'open' : ''}`} style={style} aria-label="Theme Studio" aria-hidden={!open}
      {...({ inert: open ? undefined : '' } as object)}>
      <div className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDy(null)}
        onDoubleClick={() => setSnap(snap === 'full' ? 'half' : 'full')}><span /></div>
      <div className="studio-scroll" style={scrollStyle}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Theme Studio</h2>
          <div className="flex gap-1">
            <button className="btn" onClick={() => { if (confirm('Reset the whole theme to the defaults?')) reset(); }}>Reset</button>
            <button className="btn" onClick={() => toggle('studioOpen')} aria-label="Close Theme Studio">✕</button>
          </div>
        </div>

        <Section title="Presets" open>
          <div className="presets">
            {PRESET_NAMES.map((n) => {
              const p = PRESETS[n];
              return (
                <button key={n} className={`preset ${s.preset === n ? 'on' : ''}`} aria-pressed={s.preset === n} onClick={() => applyPreset(n)}
                  style={{ background: p.slideBg, color: p.text, borderColor: s.preset === n ? 'var(--accent)' : 'transparent' }}>
                  <i style={{ background: p.accent }} />{n}
                </button>
              );
            })}
          </div>
          <p className="hint">{s.preset ? `Preset: ${s.preset}. Changing anything below clears it.` : 'Custom theme. A preset replaces all settings.'}</p>
        </Section>

        <Section title="Slide" open>
          <Group title="Colors">
            {col('slideBg', 'Slide')}{col('deckBg', 'Deck frame')}{col('text', 'Text')}{col('accent', 'Accent')}{col('codeBg', 'Code background')}
            {chk('dark', 'Dark interface (controls, scrollbars)')}
          </Group>
          <Group title="Typography">
            <Select label="Headings" v={s.headingFont as (typeof FONTS)[number]} opts={FONTS} set={(v) => patch({ headingFont: v })} />
            <Select label="Body" v={s.bodyFont as (typeof FONTS)[number]} opts={FONTS} set={(v) => patch({ bodyFont: v })} />
            {num('fontSize', 'Text size', 24, 80, 1, ' px')}
            {num('lineHeight', 'Line height', 1.1, 2, 0.05)}
            {num('letterSpacing', 'Letter spacing', -0.05, 0.2, 0.01, ' em')}
            {num('headingScale', 'Heading scale', 1.05, 1.6, 0.01)}
          </Group>
          <Group title="Layout">
            <Select label="Default layout" v={s.defaultLayout} opts={LAYOUTS} set={(v) => patch({ defaultLayout: v })} />
            {num('maxWidth', 'Content width', 800, 1800, 20, ' px')}
            {num('padding', 'Padding', 24, 220, 4, ' px')}
          </Group>
          <Group title="Background">
            <Check label="Gradient" v={s.gradient.enabled} set={(v) => patch({ gradient: { ...s.gradient, enabled: v } })} />
            {s.gradient.enabled && (
              <>
                <Select label="Type" v={s.gradient.type} opts={['linear', 'radial'] as const} set={(v) => patch({ gradient: { ...s.gradient, type: v } })} />
                {s.gradient.type === 'linear' && <Range label="Angle" v={s.gradient.angle} min={0} max={360} step={5} unit="°" set={(v) => patch({ gradient: { ...s.gradient, angle: v } })} />}
                <Color label="From" v={s.gradient.stops[0] ?? '#000000'} set={(v) => setStop(0, v)} />
                <Color label="To" v={s.gradient.stops[1] ?? '#000000'} set={(v) => setStop(1, v)} />
              </>
            )}
            <Row label="Image URL">
              <input type="url" className="txt" placeholder="https://… (empty = none)" value={s.bgImage ?? ''} spellCheck={false}
                onChange={(e) => patch({ bgImage: e.target.value.trim() || null })} />
            </Row>
            <Select label="Image mode" v={s.bgMode} opts={BGMODES} set={(v) => patch({ bgMode: v })} />
            {num('blur', 'Blur', 0, 40, 1, ' px')}
            {num('darken', 'Darken', 0, 90, 1, ' %')}
            {num('saturate', 'Saturation', 0, 200, 5, ' %')}
          </Group>
        </Section>

        <Section title="Effects">
          <Group title="Paper">
            {chk('paperEnabled', 'Paper texture')}
            {s.paperEnabled && <Select label="Type" v={s.paperType} opts={PAPERS} set={(v) => patch({ paperType: v })} />}
          </Group>
          <Group title="Screen">
            {chk('crtEnabled', 'CRT (scanlines, glow)')}
            {s.crtEnabled && num('crtIntensity', 'CRT intensity', 5, 100, 5, ' %')}
            {chk('ambientEnabled', 'Ambient glow (frame)')}
            {s.ambientEnabled && num('ambientIntensity', 'Glow intensity', 5, 100, 5, ' %')}
            {chk('breathingEnabled', 'Breathing')}
            {s.breathingEnabled && num('breathingSpeed', 'Breath cycle', 2, 14, 1, ' s')}
            {chk('hueShiftEnabled', 'Hue shift (background)')}
            {s.hueShiftEnabled && num('hueShiftSpeed', 'Hue cycle', 10, 180, 5, ' s')}
          </Group>
          <Group title="Frame">
            {chk('frostedEdgeEnabled', 'Frosted edge')}
            {s.frostedEdgeEnabled && num('frostedEdgeSize', 'Edge size', 4, 80, 2, ' px')}
            {chk('slideShadow', 'Slide shadow')}
            {chk('slideBorder', 'Slide border')}
            {chk('glassCard', 'Glass card behind text')}
          </Group>
        </Section>

        <Section title="Transitions">
          <Select label="Type" v={s.transition} opts={TRANSITIONS} set={(v) => patch({ transition: v })} />
          {num('transitionSpeed', 'Speed (duration)', 100, 1500, 50, ' ms')}
          <Select label="Easing" v={s.transitionEasing} opts={EASINGS} set={(v) => patch({ transitionEasing: v })} />
          <p className="hint">A slide can override this with <code>transition:</code> in its frontmatter; the first block sets the deck default.</p>
        </Section>

        <Section title="Code theme">
          <div className="presets">
            {CODE_THEMES.map((c) => {
              const p = CODE_PALETTES[c];
              return (
                <button key={c} className={`preset code ${s.codeTheme === c ? 'on' : ''}`} aria-pressed={s.codeTheme === c}
                  onClick={() => patch({ codeTheme: c, codeBg: CODE_BG[c] })}
                  style={{ background: CODE_BG[c], color: p.fg, borderColor: s.codeTheme === c ? 'var(--accent)' : 'transparent' }}>
                  <b style={{ color: p.keyword }}>fn</b> <span style={{ color: p.string }}>"{c}"</span>
                </button>
              );
            })}
          </div>
          <p className="hint">Picking a code theme also sets a matching code background (Colors → Code background).</p>
        </Section>
      </div>
    </aside>
  );
}
