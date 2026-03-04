import {useEffect, useRef} from 'react';
import {EditorView, keymap} from '@codemirror/view';
import {EditorState, Compartment} from '@codemirror/state';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {languages} from '@codemirror/language-data';
import snApi from 'sn-extension-api';

// Module-level: stable across renders since this component is a singleton
const editableCompartment = new Compartment();

const MarkdownEditor = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);

  // Create editor once on mount, destroy on unmount
  useEffect(() => {
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: snApi.text ?? '',
        extensions: [
          markdown({base: markdownLanguage, codeLanguages: languages}),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          editableCompartment.of(EditorView.editable.of(!snApi.locked)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              snApi.text = update.state.doc.toString();
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              backgroundColor: 'var(--sn-stylekit-editor-background-color)',
              color: 'var(--sn-stylekit-editor-foreground-color)',
              fontSize: 'var(--sn-stylekit-font-size-editor)',
              fontFamily: 'var(--sn-stylekit-monospace-font)',
            },
            '.cm-scroller': {overflow: 'auto', lineHeight: '1.6'},
            '.cm-content': {
              padding: '16px',
              caretColor: 'var(--sn-stylekit-editor-foreground-color)',
            },
            '&.cm-focused': {outline: 'none'},
            '.cm-cursor': {borderLeftColor: 'var(--sn-stylekit-editor-foreground-color)'},
            '.cm-selectionBackground, ::selection': {
              backgroundColor: 'var(--sn-stylekit-info-color, rgba(100,100,200,0.3))',
            },
          }),
        ],
      }),
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Reconcile on every render (handles note switching + locked state changes)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Sync document content — guards against equal strings to preserve undo history
    const currentContent = view.state.doc.toString();
    const apiText = snApi.text ?? '';
    if (currentContent !== apiText) {
      view.dispatch({
        changes: {from: 0, to: view.state.doc.length, insert: apiText},
        selection: {anchor: 0},
      });
    }

    // Sync locked/editable state
    view.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!snApi.locked)),
    });
  }); // No deps: runs after every render

  return <div ref={containerRef} className="markdown-editor-container"/>;
};

export default MarkdownEditor;
