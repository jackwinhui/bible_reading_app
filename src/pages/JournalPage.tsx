import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Calendar, List, ArrowLeft, BookOpen, Tag } from 'lucide-react';
import { useJournal } from '../contexts/JournalContext';
import JournalEditor from '../components/JournalEditor';
import { formatVerseRef, parseLocalDate } from '../utils/markdown';
import { contentToPlainText } from '../utils/html';
import type { JournalEntry } from '../types';

type View = 'list' | 'calendar';

export default function JournalPage() {
  const { entryId } = useParams();
  if (entryId) return <EntryView entryId={entryId} />;
  return <ListPage />;
}

function EntryView({ entryId }: { entryId: string }) {
  const navigate = useNavigate();
  const { getEntry } = useJournal();
  const entry = getEntry(entryId);

  if (!entry) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-surface-500">Entry not found.</p>
        <Link to="/journal" className="text-primary-600 hover:underline mt-2 inline-block">
          ← Back to journal
        </Link>
      </div>
    );
  }
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/journal')}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All entries
        </button>
      </div>
      <JournalEditor key={entry.id} entry={entry} onClose={() => navigate('/journal')} />
    </div>
  );
}

function ListPage() {
  const navigate = useNavigate();
  const { entries, createEntry } = useJournal();
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) for (const t of e.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (tagFilter) result = result.filter((e) => e.tags?.includes(tagFilter));
    const s = search.trim().toLowerCase();
    if (s) {
      result = result.filter((e) => {
        if ((e.title ?? '').toLowerCase().includes(s)) return true;
        if (e.body.some((b) => b.type === 'text' && contentToPlainText(b.content).toLowerCase().includes(s))) return true;
        if (e.prayer && contentToPlainText(e.prayer).toLowerCase().includes(s)) return true;
        if (e.verseRefs.some((r) => formatVerseRef(r).toLowerCase().includes(s))) return true;
        return false;
      });
    }
    return [...result].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  }, [entries, search, tagFilter]);

  const handleNew = () => {
    const e = createEntry();
    navigate(`/journal/${e.id}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Journal</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> New entry
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, body, or reference..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md ${
              view === 'list'
                ? 'bg-white dark:bg-surface-700 shadow-sm'
                : 'text-surface-500'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md ${
              view === 'calendar'
                ? 'bg-white dark:bg-surface-700 shadow-sm'
                : 'text-surface-500'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            onClick={() => setTagFilter(null)}
            className={`text-xs px-2 py-1 rounded-full ${
              tagFilter === null
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                tagFilter === t
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
              }`}
            >
              <Tag className="w-3 h-3" /> {t}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {entries.length === 0 ? (
        <EmptyState onNew={handleNew} />
      ) : view === 'list' ? (
        <ListView entries={filtered} />
      ) : (
        <CalendarView entries={filtered} />
      )}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-20">
      <BookOpen className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-700 mb-4" />
      <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-1">
        Start your journal
      </h2>
      <p className="text-sm text-surface-500 mb-6">
        Capture reflections on what you're reading. Insert verses to anchor your thoughts.
      </p>
      <button
        onClick={onNew}
        className="px-5 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
      >
        Write first entry
      </button>
    </div>
  );
}

function ListView({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-surface-400 text-center py-12">No entries match your filters.</p>;
  }

  // Group by month
  const groups = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const d = parseLocalDate(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([key, items]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        });
        return (
          <div key={key}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">
              {label}
            </h3>
            <div className="space-y-2">
              {items.map((e) => <EntryRow key={e.id} entry={e} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ entry }: { entry: JournalEntry }) {
  const firstText = entry.body.find((b) => b.type === 'text') as { content: string } | undefined;
  const excerpt = contentToPlainText(firstText?.content ?? '').slice(0, 180).trim();
  return (
    <Link
      to={`/journal/${entry.id}`}
      className="block p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors no-underline"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">
            {entry.title || 'Untitled entry'}
          </div>
          <div className="text-xs text-surface-400 mt-0.5">
            {parseLocalDate(entry.date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>
      {excerpt && (
        <p className="text-sm text-surface-600 dark:text-surface-400 leading-snug line-clamp-2 mt-2">
          {excerpt}
        </p>
      )}
      {(entry.verseRefs.length > 0 || (entry.tags?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.verseRefs.slice(0, 3).map((r, i) => (
            <span
              key={`r${i}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300"
            >
              {formatVerseRef(r)}
            </span>
          ))}
          {entry.verseRefs.length > 3 && (
            <span className="text-[10px] text-surface-400">+{entry.verseRefs.length - 3}</span>
          )}
          {(entry.tags ?? []).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function CalendarView({ entries }: { entries: JournalEntry[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [entries]);

  const first = new Date(cursor.year, cursor.month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: { day: number | null; date: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: ds });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() =>
            setCursor((c) =>
              c.month === 0
                ? { year: c.year - 1, month: 11 }
                : { year: c.year, month: c.month - 1 }
            )
          }
          className="px-3 py-1 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          ←
        </button>
        <span className="text-sm font-semibold">
          {first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() =>
            setCursor((c) =>
              c.month === 11
                ? { year: c.year + 1, month: 0 }
                : { year: c.year, month: c.month + 1 }
            )
          }
          className="px-3 py-1 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-surface-400 uppercase mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const items = c.date ? byDate.get(c.date) ?? [] : [];
          return (
            <div
              key={i}
              className={`aspect-square rounded-md border border-surface-200 dark:border-surface-700 p-1 text-xs flex flex-col ${
                c.day ? 'bg-surface-50 dark:bg-surface-900' : 'bg-transparent border-transparent'
              }`}
            >
              {c.day && (
                <>
                  <div className="text-surface-500 mb-0.5">{c.day}</div>
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    {items.slice(0, 2).map((e) => (
                      <Link
                        key={e.id}
                        to={`/journal/${e.id}`}
                        className="block text-[10px] truncate text-primary-600 dark:text-primary-400 no-underline hover:underline"
                        title={e.title || 'Untitled'}
                      >
                        • {e.title || 'Untitled'}
                      </Link>
                    ))}
                    {items.length > 2 && (
                      <div className="text-[9px] text-surface-400">+{items.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
