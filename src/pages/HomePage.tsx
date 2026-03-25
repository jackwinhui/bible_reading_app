import { Link } from 'react-router-dom';
import { otBooks, ntBooks } from '../data/books';
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

      <BookGrid title="Old Testament" books={otBooks} />
      <BookGrid title="New Testament" books={ntBooks} />
    </div>
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
