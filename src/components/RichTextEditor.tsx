import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
} from 'lucide-react';
import { migrateContentToHtml, sanitizeHtml } from '../utils/html';

interface RichTextEditorProps {
  value: string;          // HTML (or legacy markdown that gets migrated on first read)
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Lightweight contentEditable wrapper with a floating formatting toolbar.
 * Uses document.execCommand for formatting — "deprecated" but works
 * reliably in Chromium (which Electron uses) and all modern browsers.
 */
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  // One-shot init: load the migrated HTML into the contentEditable.
  // We never re-sync from `value` after mount — the DOM is the source of
  // truth while the editor is mounted, and the parent only mutates its
  // copy on `onChange`. Re-syncing on every prop change would reset the
  // cursor on every keystroke.
  useEffect(() => {
    if (!editorRef.current) return;
    const html = migrateContentToHtml(value);
    editorRef.current.innerHTML = html;
    setIsEmpty(!editorRef.current.textContent?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    if (!editorRef.current) return;
    setIsEmpty(!editorRef.current.textContent?.trim());
    onChange(sanitizeHtml(editorRef.current.innerHTML));
  };

  const exec = (command: string, value?: string) => {
    // Restore focus so execCommand acts on the editor's selection
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  return (
    <div ref={containerRef} className="relative">
      {isFocused && <FloatingToolbar exec={exec} />}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={emitChange}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          // Don't lose focus when the user clicks the toolbar — the toolbar
          // buttons use onMouseDown+preventDefault to keep selection alive,
          // but the focus event still fires; check the relatedTarget.
          const next = e.relatedTarget as Node | null;
          if (next && containerRef.current?.contains(next)) return;
          setIsFocused(false);
        }}
        data-placeholder={placeholder}
        className={`prose prose-sm dark:prose-invert max-w-none min-h-[60px] p-3 rounded-lg outline-none leading-relaxed
          border border-transparent hover:border-surface-200 dark:hover:border-surface-700
          focus:border-surface-300 dark:focus:border-surface-600 focus:bg-surface-50 dark:focus:bg-surface-800/50
          ${isEmpty ? 'empty-editor' : ''}`}
      />
    </div>
  );
}

interface FloatingToolbarProps {
  exec: (command: string, value?: string) => void;
}

function FloatingToolbar({ exec }: FloatingToolbarProps) {
  // onMouseDown + preventDefault keeps the editor's selection alive when
  // clicking a toolbar button (otherwise the click would steal focus and
  // the selection would collapse).
  const btn = (
    Icon: React.ComponentType<{ className?: string }>,
    title: string,
    fn: () => void
  ) => (
    <button
      key={title}
      onMouseDown={(e) => {
        e.preventDefault();
        fn();
      }}
      title={title}
      className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div
      tabIndex={-1}
      className="absolute -top-11 left-0 z-20 flex items-center gap-0.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg p-1"
    >
      {btn(Bold, 'Bold (⌘B)', () => exec('bold'))}
      {btn(Italic, 'Italic (⌘I)', () => exec('italic'))}
      {btn(Underline, 'Underline (⌘U)', () => exec('underline'))}
      <Divider />
      {btn(Heading1, 'Heading 1', () => exec('formatBlock', 'H1'))}
      {btn(Heading2, 'Heading 2', () => exec('formatBlock', 'H2'))}
      {btn(Heading3, 'Heading 3', () => exec('formatBlock', 'H3'))}
      <Divider />
      {btn(List, 'Bullet list', () => exec('insertUnorderedList'))}
      {btn(ListOrdered, 'Numbered list', () => exec('insertOrderedList'))}
      {btn(Quote, 'Quote', () => exec('formatBlock', 'BLOCKQUOTE'))}
      <Divider />
      {btn(RemoveFormatting, 'Clear formatting', () => {
        exec('removeFormat');
        exec('formatBlock', 'P');
      })}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-0.5" />;
}
