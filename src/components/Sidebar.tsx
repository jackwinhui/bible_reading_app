import { Link, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { books, otBooks, ntBooks } from '../data/books';
import type { BibleBook } from '../types';

export default function Sidebar() {
  const { bookName } = useParams();
  const currentBook = bookName ? books.find((b) => b.name === decodeURIComponent(bookName)) ?? null : null;

  return (
    <aside className="w-64 shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto hidden lg:block">
      <div className="p-4">
        <BookList title="Old Testament" books={otBooks} currentBook={currentBook} />
        <BookList title="New Testament" books={ntBooks} currentBook={currentBook} />
      </div>
    </aside>
  );
}

function BookList({
  title,
  books,
  currentBook,
}: {
  title: string;
  books: BibleBook[];
  currentBook: BibleBook | null;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 px-2">
        {title}
      </h3>
      <ul className="space-y-0.5">
        {books.map((book) => (
          <li key={book.id}>
            <Link
              to={`/read/${encodeURIComponent(book.name)}`}
              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm no-underline transition-colors ${
                currentBook?.id === book.id
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-medium'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-800'
              }`}
            >
              <span>{book.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
