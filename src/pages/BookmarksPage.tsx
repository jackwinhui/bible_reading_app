import { Link } from 'react-router-dom';
import { Trash2, BookOpen, Bookmark } from 'lucide-react';
import { useBookmarks } from '../contexts/BookmarkContext';

export default function BookmarksPage() {
  const { bookmarks, removeBookmark } = useBookmarks();

  const grouped = bookmarks.reduce(
    (acc, bm) => {
      if (!acc[bm.book]) acc[bm.book] = [];
      acc[bm.book].push(bm);
      return acc;
    },
    {} as Record<string, typeof bookmarks>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2">
        Bookmarks
      </h1>
      <p className="text-surface-500 dark:text-surface-400 mb-8">
        {bookmarks.length} saved verse{bookmarks.length !== 1 ? 's' : ''}
      </p>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bookmark className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-4" />
          <p className="text-surface-500 dark:text-surface-400 mb-2">No bookmarks yet</p>
          <p className="text-sm text-surface-400 dark:text-surface-500">
            Click on any verse while reading to bookmark it
          </p>
          <Link
            to="/"
            className="mt-4 text-sm text-primary-600 hover:underline no-underline"
          >
            Start reading →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([bookName, bms]) => (
            <div key={bookName}>
              <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {bookName}
              </h2>
              <div className="space-y-2">
                {bms
                  .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)
                  .map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-start gap-3 p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/read/${encodeURIComponent(bm.book)}/${bm.chapter}`}
                          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline no-underline"
                        >
                          {bm.book} {bm.chapter}:{bm.verse}
                        </Link>
                        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
                          {bm.text}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500">
                            {bm.translation}
                          </span>
                          <span className="text-xs text-surface-400">
                            {new Date(bm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeBookmark(bm.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-surface-400 hover:text-red-500 transition-colors shrink-0"
                        title="Remove bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
