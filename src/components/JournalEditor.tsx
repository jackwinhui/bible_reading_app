import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Plus, BookPlus, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { JournalEntry, JournalBlock, VerseRef } from '../types';
import { useJournal, newJournalBlockId } from '../contexts/JournalContext';
import VersePickerModal from './VersePickerModal';
import { renderMarkdown, formatVerseRef } from '../utils/markdown';

interface JournalEditorProps {
  entry: JournalEntry;
  onClose?: () => void;
}

export default function JournalEditor({ entry, onClose }: JournalEditorProps) {
  const { updateEntry, removeEntry } = useJournal();
  const [title, setTitle] = useState(entry.title ?? '');
  const [date, setDate] = useState(entry.date);
  const [body, setBody] = useState<JournalBlock[]>(entry.body);
  const [tags, setTags] = useState<string>((entry.tags ?? []).join(', '));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInsertIndex, setPickerInsertIndex] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string>('');
  const skipFirstSave = useRef(true);

  // Debounced auto-save
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      const tagList = tags
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      updateEntry(entry.id, {
        title: title.trim() || undefined,
        date,
        body,
        tags: tagList.length > 0 ? tagList : undefined,
      });
      setSavedAt(new Date().toLocaleTimeString());
    }, 400);
    return () => clearTimeout(t);
  }, [title, date, body, tags, entry.id, updateEntry]);

  const wordCount = useMemo(() => {
    return body.reduce((acc, b) => {
      if (b.type === 'text') return acc + b.content.split(/\s+/).filter(Boolean).length;
      return acc + b.snapshot.split(/\s+/).filter(Boolean).length;
    }, 0);
  }, [body]);

  const updateBlock = useCallback(
    (id: string, patch: Partial<JournalBlock>) => {
      setBody((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          return { ...b, ...patch } as JournalBlock;
        })
      );
    },
    []
  );

  const removeBlock = useCallback((id: string) => {
    setBody((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)));
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBody((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }, []);

  const insertTextBlockAfter = useCallback((index: number) => {
    setBody((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, { id: newJournalBlockId(), type: 'text', content: '' });
      return copy;
    });
  }, []);

  const openVersePicker = useCallback((index: number) => {
    setPickerInsertIndex(index);
    setPickerOpen(true);
  }, []);

  const handleVerseInsert = useCallback(
    (ref: VerseRef, snapshot: string) => {
      const block: JournalBlock = {
        id: newJournalBlockId(),
        type: 'verse',
        ref,
        snapshot,
      };
      setBody((prev) => {
        const copy = [...prev];
        const at = pickerInsertIndex !== null ? pickerInsertIndex + 1 : copy.length;
        copy.splice(at, 0, block);
        // Auto-add a text block after for continued writing if at end
        if (at === copy.length - 1) {
          copy.push({ id: newJournalBlockId(), type: 'text', content: '' });
        }
        return copy;
      });
    },
    [pickerInsertIndex]
  );

  const handleDelete = () => {
    if (confirm('Delete this entry? This cannot be undone.')) {
      removeEntry(entry.id);
      onClose?.();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled entry"
            className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-surface-300 dark:placeholder:text-surface-600"
          />
          <div className="flex items-center gap-3 mt-2 text-sm text-surface-500">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none"
            />
            <span className="text-xs">·</span>
            <span className="text-xs">{wordCount} words</span>
            {savedAt && (
              <>
                <span className="text-xs">·</span>
                <span className="text-xs">Saved {savedAt}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="w-full text-xs px-2 py-1 mb-6 bg-transparent outline-none text-surface-500 border-b border-transparent focus:border-surface-300 dark:focus:border-surface-600 transition-colors"
      />

      {/* Blocks */}
      <div className="space-y-3">
        {body.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            isFirst={index === 0}
            isLast={index === body.length - 1}
            onChange={(patch) => updateBlock(block.id, patch)}
            onRemove={() => removeBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, -1)}
            onMoveDown={() => moveBlock(block.id, 1)}
            onAddTextBelow={() => insertTextBlockAfter(index)}
            onAddVerseBelow={() => openVersePicker(index)}
          />
        ))}
      </div>

      {/* Add-block controls at end */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => insertTextBlockAfter(body.length - 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          <Plus className="w-4 h-4" /> Add paragraph
        </button>
        <button
          onClick={() => openVersePicker(body.length - 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950"
        >
          <BookPlus className="w-4 h-4" /> Insert verse
        </button>
      </div>

      <VersePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInsert={handleVerseInsert}
      />
    </div>
  );
}

interface BlockEditorProps {
  block: JournalBlock;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<JournalBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddTextBelow: () => void;
  onAddVerseBelow: () => void;
}

function BlockEditor({
  block,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddTextBelow,
  onAddVerseBelow,
}: BlockEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textContent = block.type === 'text' ? block.content : null;

  // Auto-grow textarea
  useEffect(() => {
    if (textContent === null || !textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [textContent]);

  return (
    <div className="group relative">
      {/* Hover toolbar */}
      <div className="absolute -left-12 top-1 hidden group-hover:flex flex-col gap-0.5 opacity-70 hover:opacity-100">
        <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {block.type === 'text' ? (
        <div>
          {showPreview ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 min-h-[60px]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) || '<p class="text-surface-400 italic">(empty)</p>' }}
              onClick={() => setShowPreview(false)}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              onBlur={() => block.content && setShowPreview(true)}
              placeholder="Write your reflection... (markdown supported: **bold**, *italic*, # heading, > quote, - list)"
              className="w-full min-h-[60px] p-3 rounded-lg bg-transparent border border-transparent hover:border-surface-200 dark:hover:border-surface-700 focus:border-surface-300 dark:focus:border-surface-600 focus:bg-surface-50 dark:focus:bg-surface-800/50 outline-none resize-none leading-relaxed"
              rows={2}
            />
          )}
        </div>
      ) : (
        <VerseBlockView block={block} onAddBelow={onAddTextBelow} />
      )}

      {/* "Add block" between rows on hover at bottom */}
      <div className="h-2 relative">
        <div className="absolute inset-x-0 -bottom-1 flex justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-1 bg-white dark:bg-surface-900 px-1 rounded-full border border-surface-200 dark:border-surface-700 shadow-sm">
            <button
              onClick={onAddTextBelow}
              className="text-[10px] px-2 py-0.5 rounded-full text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              title="Add paragraph below"
            >
              + text
            </button>
            <button
              onClick={onAddVerseBelow}
              className="text-[10px] px-2 py-0.5 rounded-full text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
              title="Add verse below"
            >
              + verse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerseBlockView({
  block,
  onAddBelow,
}: {
  block: Extract<JournalBlock, { type: 'verse' }>;
  onAddBelow: () => void;
}) {
  const refLabel = formatVerseRef(block.ref);
  const href = `/read/${encodeURIComponent(block.ref.book)}/${block.ref.chapter}`;
  return (
    <div className="rounded-lg border-l-4 border-primary-400 bg-primary-50/50 dark:bg-primary-950/30 p-4 my-1">
      <div className="flex items-center justify-between mb-2">
        <Link
          to={href}
          className="text-xs font-semibold text-primary-700 dark:text-primary-300 no-underline hover:underline flex items-center gap-1"
        >
          {refLabel}
          <ExternalLink className="w-3 h-3" />
          <span className="text-surface-400 font-normal ml-1">· {block.ref.translation}</span>
        </Link>
        <button
          onClick={onAddBelow}
          className="text-[10px] px-2 py-0.5 rounded text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
        >
          + paragraph below
        </button>
      </div>
      <p className="text-sm leading-relaxed italic text-surface-700 dark:text-surface-300">
        “{block.snapshot}”
      </p>
    </div>
  );
}
