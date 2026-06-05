import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { otBooks, ntBooks } from '../data/books';
import { useJournal } from '../contexts/JournalContext';
import { parseLocalDate } from '../utils/markdown';
import type { BibleBook } from '../types';

export default function HomePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2">
          Select a Book
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Choose a book of the Bible to start reading
        </p>
      </div>

      <OnThisDayCard />

      <BookGrid title="Old Testament" books={otBooks} />
      <BookGrid title="New Testament" books={ntBooks} />
    </div>
  );
}

function OnThisDayCard() {
  const { entries } = useJournal();
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayYear = today.getFullYear();

  const pastEntries = entries.filter((e) => {
    const d = parseLocalDate(e.date);
    return (
      d.getMonth() + 1 === todayMonth &&
      d.getDate() === todayDay &&
      d.getFullYear() < todayYear
    );
  });

  if (pastEntries.length === 0) return null;

  const years = new Set(pastEntries.map((e) => parseLocalDate(e.date).getFullYear())).size;
  const dateLabel = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <Link
      to="/journal"
      onClick={() => {
        // Default the journal page to "on this day" via a tiny hint in sessionStorage
        sessionStorage.setItem('journal-default-view', 'onThisDay');
      }}
      className="block mb-8 p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors no-underline"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
          <CalendarDays className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            On this day — {dateLabel}
          </div>
          <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            {pastEntries.length} {pastEntries.length === 1 ? 'reflection' : 'reflections'} from {years} previous {years === 1 ? 'year' : 'years'}
          </div>
        </div>
        <span className="text-primary-600 dark:text-primary-400 text-sm">→</span>
      </div>
    </Link>
  );
}

function BookGrid({ title, books }: { title: string; books: BibleBook[] }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-4 flex items-center gap-2">
        <span className="w-8 h-px bg-surface-300 dark:bg-surface-600" />
        {title}
        <span className="text-sm font-normal text-surface-400">({books.length} books)</span>
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {books.map((book) => (
          <Link
            key={book.id}
            to={`/read/${encodeURIComponent(book.name)}`}
            className="group flex flex-col items-center justify-center p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all no-underline"
          >
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 text-center leading-tight">
              {book.name}
            </span>
            <span className="text-xs text-surface-400 dark:text-surface-500 mt-1">
              {book.chapters} ch
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
