import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { books } from '../data/books';

export default function ChapterPage() {
  const { bookName } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(bookName || '');
  const book = books.find((b) => b.name === decodedName);

  if (!book) {
    return (
      <div className="p-6 text-center">
        <p className="text-surface-500">Book not found</p>
        <Link to="/" className="text-primary-600 hover:underline mt-2 inline-block">
          ← Back to books
        </Link>
      </div>
    );
  }

  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Books
      </button>

      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2">
        {book.name}
      </h1>
      <p className="text-surface-500 dark:text-surface-400 mb-8">
        {book.testament === 'OT' ? 'Old Testament' : 'New Testament'} · {book.chapters} chapters
      </p>

      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {chapters.map((ch) => (
          <Link
            key={ch}
            to={`/read/${encodeURIComponent(book.name)}/${ch}`}
            className="flex items-center justify-center h-12 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 text-surface-700 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-all no-underline"
          >
            {ch}
          </Link>
        ))}
      </div>
    </div>
  );
}
