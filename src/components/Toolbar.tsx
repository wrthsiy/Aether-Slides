import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSettings, useStore } from '../store';
import { useBarSwipe, useIsPhone } from '../mobile';
import { buildExport, download, fmtSize } from '../export';
import type { ExportMode } from '../export';
import { openPresenter, toggleFullscreen } from '../present';

interface Toast { msg: string; warnings: string[] }

export default function Toolbar() {
  const phone = useIsPhone();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const studioOpen = useStore((s) => s.studioOpen);
  const toggle = useStore((s) => s.toggle);
  const settings = useSettings();
  const sw = useBarSwipe();
  const [menu, setMenu] = useState<'export' | 'present' | 'more' | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const menuBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!menuBox.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  useEffect(() => {
    if (!toast || toast.warnings.length) return; // warnings stay until dismissed
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const doExport = async (m: ExportMode) => {
    setMenu(null); setBusy(true); setToast(null);
    try {
      const r = await buildExport(useStore.getState().content, settings, m);
      download(r);
      setToast({ msg: `Exported ${r.filename} · ${fmtSize(r.bytes)} (${m === 'local' ? 'self-contained' : 'external'})`, warnings: r.warnings });
    } catch (e) {
      setToast({ msg: 'Export failed.', warnings: [(e as Error).message || String(e)] });
    } finally { setBusy(false); }
  };
  // present actions need the deck on screen (phones: switch to the Deck tab first)
  const present = (f: () => void) => { setMenu(null); setMode('deck'); setTimeout(f, 60); };

  const exportItems = (
    <>
      <button className="btn" role="menuitem" onClick={() => void doExport('local')} title="Fonts and images embedded, works offline from file://">Local · self-contained</button>
      <button className="btn" role="menuitem" onClick={() => void doExport('external')} title="Google Fonts link, images stay URLs, smaller file">External · needs internet</button>
    </>
  );
  const presentItems = (
    <>
      <button className="btn" role="menuitem" onClick={() => present(toggleFullscreen)}>Fullscreen <kbd>F</kbd></button>
      <button className="btn" role="menuitem" onClick={() => present(() => toggle('overview'))}>Overview <kbd>O</kbd></button>
      <button className="btn" role="menuitem" onClick={() => present(openPresenter)}>Presenter view <kbd>P</kbd></button>
    </>
  );
  const dropdown = (id: 'export' | 'present' | 'more', label: string, items: ReactNode) => (
    <div className="relative" ref={menu === id ? menuBox : undefined}>
      <button className="btn" aria-haspopup="menu" aria-expanded={menu === id} disabled={busy && id !== 'present'} onClick={() => setMenu(menu === id ? null : id)}>
        {busy && id !== 'present' ? 'Exporting…' : label} ▾
      </button>
      {menu === id && <div className="more-menu glass fade-in" role="menu">{items}</div>}
    </div>
  );

  return (
    <header {...sw} className={`${sw.className} bar-top glass relative z-20 flex shrink-0 items-center gap-2 px-3`}>
      <strong className="whitespace-nowrap">Aether <span style={{ color: 'var(--accent)' }}>Slides</span></strong>
      <div className="flex-1" />
      {phone && (
        <div className="flex gap-1" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'edit'} className={`btn ${mode === 'edit' ? 'on' : ''}`} onClick={() => setMode('edit')}>Edit</button>
          <button role="tab" aria-selected={mode === 'deck'} className={`btn ${mode === 'deck' ? 'on' : ''}`} onClick={() => setMode('deck')}>Deck</button>
        </div>
      )}
      {phone ? dropdown('more', 'More', <>{presentItems}<hr style={{ opacity: 0.2 }} />{exportItems}</>) : (
        <>{dropdown('present', 'Present', presentItems)}{dropdown('export', 'Export', exportItems)}</>
      )}
      <button className={`btn ${studioOpen ? 'on' : ''}`} aria-pressed={studioOpen} onClick={() => toggle('studioOpen')}>Theme</button>
      {toast && createPortal(
        <div className="toast glass fade-in" role="status">
          <div className="flex items-start gap-2">
            <span className="flex-1">{toast.msg}</span>
            <button className="btn" style={{ minHeight: 0, padding: '.05rem .45rem' }} onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
          </div>
          {toast.warnings.map((w, i) => <div key={i} style={{ color: 'var(--muted)' }}>⚠ {w}</div>)}
        </div>,
        document.body,
      )}
    </header>
  );
}
