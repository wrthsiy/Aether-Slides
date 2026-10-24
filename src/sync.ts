import { useEffect } from 'react';
import { useStore } from './store';
import type { ThemeSettings } from './types';

/** Main window ⇄ presenter window. One channel, small messages.
 *  presenter → main: hello, go{current}, timer{...}      main → presenter: nav{current}, doc{content, settings}, timer{...} */
export const CHANNEL = 'aether-slides-sync';

export interface TimerState { running: boolean; acc: number; t0: number; target: number | null }
export type Msg =
  | { type: 'hello' }
  | { type: 'go'; current: number }
  | { type: 'nav'; current: number }
  | { type: 'doc'; content: string; settings: ThemeSettings; current: number }
  | { type: 'timer'; timer: TimerState };

export function useMainSync() {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    let lastTimer: Msg | null = null;
    const doc = (): Msg => { const s = useStore.getState(); return { type: 'doc', content: s.content, settings: s.settings, current: s.current }; };
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'hello') { ch.postMessage(doc()); if (lastTimer) ch.postMessage(lastTimer); }
      else if (m.type === 'go') useStore.getState().setCurrent(m.current);
      else if (m.type === 'timer') lastTimer = m;
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.current !== prev.current) ch.postMessage({ type: 'nav', current: s.current } satisfies Msg);
      if (s.content !== prev.content || s.settings !== prev.settings) { clearTimeout(t); t = setTimeout(() => ch.postMessage(doc()), 120); }
    });
    return () => { unsub(); clearTimeout(t); ch.close(); };
  }, []);
}
