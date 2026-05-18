import { Link, useLocation } from 'react-router-dom';
import { Book, Bookmark, StickyNote, Brain, Settings, NotebookPen } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTranslation } from '../contexts/TranslationContext';
import type { Translation } from '../types';

export default function Header() {
  const location = useLocation();
  const { translation, setTranslation } = useTranslation();

  // Track the last reading location so the Read tab returns to it
  const lastReadPath = (() => {
    if (location.pathname.startsWith('/read/')) {
      localStorage.setItem('bible-app-last-read', location.pathname);
      return location.pathname;
    }
    return localStorage.getItem('bible-app-last-read') || '/';
  })();

  const navItems = [
    { to: lastReadPath, icon: Book, label: 'Read' },
    { to: '/journal', icon: NotebookPen, label: 'Journal' },
    { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { to: '/annotations', icon: StickyNote, label: 'Notes' },
    { to: '/memory', icon: Brain, label: 'Memory' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <Book className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <span className="font-semibold text-lg text-surface-900 dark:text-surface-50">
            Bible App
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isReadItem = label === 'Read';
            const isActive = isReadItem
              ? location.pathname === '/' || location.pathname.startsWith('/read')
              : location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5">
            {(['ESV', 'NASB1995', 'CSB', 'NLT'] as Translation[]).map((t) => (
              <button
                key={t}
                onClick={() => setTranslation(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  translation === t
                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
