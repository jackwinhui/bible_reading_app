import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Plus, BookPlus, ChevronUp, ChevronDown, ExternalLink, GripVertical, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { JournalEntry, JournalBlock, VerseRef } from '../types';
import { useJournal, newJournalBlockId } from '../contexts/JournalContext';
import VersePickerModal from './VersePickerModal';
import RichTextEditor from './RichTextEditor';
import { formatVerseRef } from '../utils/markdown';
import { htmlToPlainText } from '../utils/html';

interface JournalEditorProps {
  entry: JournalEntry;
  onClose?: () => void;
}

export default function JournalEditor({ entry, onClose }: JournalEditorProps) {
  const { updateEntry, removeEntry } = useJournal();
  const [title, setTitle] = useState(entry.title ?? '');
  const [date, setDate] = useState(entry.date);
  const [body, setBody] = useState<JournalBlock[]>(entry.body);
  const [prayer, setPrayer] = useState(entry.prayer ?? '');
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
        prayer: prayer.trim() ? prayer : undefined,
        tags: tagList.length > 0 ? tagList : undefined,
      });
      setSavedAt(new Date().toLocaleTimeString());
    }, 400);
    return () => clearTimeout(t);
  }, [title, date, body, prayer, tags, entry.id, updateEntry]);

  const wordCount = useMemo(() => {
    const bodyWords = body.reduce((acc, b) => {
      if (b.type === 'text') return acc + htmlToPlainText(b.content).split(/\s+/).filter(Boolean).length;
      return acc + b.snapshot.split(/\s+/).filter(Boolean).length;
    }, 0);
    const prayerWords = htmlToPlainText(prayer).split(/\s+/).filter(Boolean).length;
    return bodyWords + prayerWords;
  }, [body, prayer]);

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

  const reorderBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBody((prev) => {
      if (
        fromIndex < 0 || fromIndex >= prev.length ||
        toIndex < 0 || toIndex > prev.length ||
        fromIndex === toIndex || fromIndex + 1 === toIndex
      ) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      copy.splice(insertAt, 0, moved);
      return copy;
    });
  }, []);

  // Drag state at the editor level so all blocks can react to it
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overGapIndex, setOverGapIndex] = useState<number | null>(null);

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
      <div className="space-y-1">
        {/* Top drop zone */}
        <DropZone
          index={0}
          active={dragIndex !== null && overGapIndex === 0 && dragIndex !== 0}
          onDragOver={() => setOverGapIndex(0)}
          onDrop={() => {
            if (dragIndex !== null) reorderBlock(dragIndex, 0);
            setDragIndex(null);
            setOverGapIndex(null);
          }}
          visible={dragIndex !== null}
        />
        {body.map((block, index) => (
          <div key={block.id}>
            <BlockEditor
              block={block}
              index={index}
              isFirst={index === 0}
              isLast={index === body.length - 1}
              isDragging={dragIndex === index}
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, -1)}
              onMoveDown={() => moveBlock(block.id, 1)}
              onAddTextBelow={() => insertTextBlockAfter(index)}
              onAddVerseBelow={() => openVersePicker(index)}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverGapIndex(null);
              }}
            />
            <DropZone
              index={index + 1}
              active={
                dragIndex !== null &&
                overGapIndex === index + 1 &&
                dragIndex !== index &&
                dragIndex !== index + 1
              }
              onDragOver={() => setOverGapIndex(index + 1)}
              onDrop={() => {
                if (dragIndex !== null) reorderBlock(dragIndex, index + 1);
                setDragIndex(null);
                setOverGapIndex(null);
              }}
              visible={dragIndex !== null}
            />
          </div>
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

      {/* Prayer / Applications — always present, separate from body */}
      <div className="mt-10 pt-6 border-t border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
          <HeartHandshake className="w-4 h-4 text-rose-500" />
          Prayer / Applications
        </div>
        <p className="text-xs text-surface-400 dark:text-surface-500 mb-3">
          What is God leading you to pray about, repent of, or apply from what you read today?
        </p>
        <RichTextEditor
          value={prayer}
          onChange={setPrayer}
          placeholder="Write your prayer or application..."
        />
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
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onChange: (patch: Partial<JournalBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddTextBelow: () => void;
  onAddVerseBelow: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  isDragging,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddTextBelow,
  onAddVerseBelow,
  onDragStart,
  onDragEnd,
}: BlockEditorProps) {
  const [draggable, setDraggable] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Some browsers require non-empty data for the drag to start
        e.dataTransfer.setData('text/plain', String(index));
        if (rootRef.current) e.dataTransfer.setDragImage(rootRef.current, 20, 20);
        onDragStart();
      }}
      onDragEnd={() => {
        setDraggable(false);
        onDragEnd();
      }}
      className={`group relative flex gap-2 rounded-lg transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {/* Inline toolbar — always part of the layout, only visible on hover */}
      <div className="w-7 shrink-0 flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onMouseDown={() => setDraggable(true)}
          onMouseUp={() => setDraggable(false)}
          onMouseLeave={() => setDraggable(false)}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30 disabled:pointer-events-none"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30 disabled:pointer-events-none"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
          title="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {block.type === 'text' ? (
          <RichTextEditor
            value={block.content}
            onChange={(html) => onChange({ content: html })}
            placeholder="Write your reflection..."
          />
        ) : (
          <VerseBlockView block={block} onAddBelow={onAddTextBelow} />
        )}

        {/* "Add block" between rows — larger persistent hit zone so cursor can reach it */}
        <div className="h-5 relative group/sep">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover/sep:opacity-100 transition-opacity">
            <div className="flex gap-1 bg-white dark:bg-surface-900 px-1 py-0.5 rounded-full border border-surface-200 dark:border-surface-700 shadow-sm">
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

interface DropZoneProps {
  index: number;
  active: boolean;
  visible: boolean;
  onDragOver: () => void;
  onDrop: () => void;
}

function DropZone({ active, visible, onDragOver, onDrop }: DropZoneProps) {
  return (
    <div
      onDragOver={(e) => {
        if (!visible) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDrop={(e) => {
        if (!visible) return;
        e.preventDefault();
        onDrop();
      }}
      className={`transition-all duration-150 ${
        visible
          ? active
            ? 'h-2 my-1 bg-primary-500 rounded-full'
            : 'h-2 my-1 bg-transparent'
          : 'h-0 my-0'
      }`}
    />
  );
}
