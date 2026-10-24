import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight'; // transitive dependency of @codemirror/language (not listed in package.json)
import { useStore } from '../store';
import { setEditorFocused } from '../mobile';

// Deliberately simple: Markdown, line wrapping, basic keymap, one-way follow-cursor.
// No focus mode, typewriter, sound, cursor trail, format bar or snippets.

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--text)', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--accent)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--muted)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { background: 'color-mix(in srgb, var(--accent) 35%, transparent) !important' },
}, { dark: true });

const highlight = HighlightStyle.define([
  { tag: t.heading, color: 'var(--accent)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--accent)' },
  { tag: t.monospace, color: 'var(--hl-built, #e5c07b)' },
  { tag: t.quote, color: 'var(--muted)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.meta, t.comment], color: 'var(--muted)' },
  { tag: t.contentSeparator, color: 'var(--accent)', fontWeight: '700' },
]);

export default function Editor({ startLines }: { startLines: number[] }) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const starts = useRef(startLines);
  starts.current = startLines;
  const follow = useStore((s) => s.followCursor);
  const toggle = useStore((s) => s.toggle);

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: useStore.getState().content,
        extensions: [
          lineNumbers(), history(), drawSelection(), highlightActiveLine(), EditorView.lineWrapping,
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(highlight),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': 'Slide source (Markdown)' }),
          EditorView.domEventHandlers({
            focus: () => { setEditorFocused(true); return false; },
            blur: () => { setEditorFocused(false); return false; },
          }),
          EditorView.updateListener.of((u) => {
            const st = useStore.getState();
            if (u.docChanged) st.setContent(u.state.doc.toString());
            if (u.selectionSet && st.followCursor) { // editor → deck, one way
              const line = u.state.doc.lineAt(u.state.selection.main.head).number - 1;
              let idx = 0;
              for (let i = 0; i < starts.current.length; i++) { if (starts.current[i] <= line) idx = i; else break; }
              if (idx !== st.current) st.setCurrent(idx);
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; setEditorFocused(false); };
  }, []);

  // changes that did not come from typing
  const content = useStore((s) => s.content);
  useEffect(() => {
    const v = viewRef.current;
    if (v && v.state.doc.toString() !== content) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: content } });
  }, [content]);

  return (
    <div className="relative h-full">
      <div ref={host} className="h-full" />
      <button className={`btn follow-chip glass ${follow ? 'on' : ''}`} aria-pressed={follow} onClick={() => toggle('followCursor')}
        title="The deck follows the editor cursor">Follow</button>
    </div>
  );
}
