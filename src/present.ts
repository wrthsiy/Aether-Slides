/** F: fullscreen the deck element (the overview lives inside it, so it goes fullscreen too). */
export function toggleFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.querySelector('.deck') as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null;
  if (!el) return;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (document.exitFullscreen ?? d.webkitExitFullscreen)?.call(document); return; }
  try { void (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el); } catch { /* not supported (iPhone Safari) */ }
}

/** P: presenter view in a new window. The same bundle renders it when the URL has ?presenter (see main.tsx). */
export function openPresenter() {
  const url = `${location.origin}${location.pathname}?presenter`;
  const w = window.open(url, 'aether-slides-presenter', 'popup=yes,width=1280,height=800');
  w?.focus();
}
