import { useState, useRef, useEffect } from 'react';
import { BookmarkPlus, BookmarkCheck, MessageSquarePlus, MessageSquare } from 'lucide-react';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAnnotations } from '../contexts/AnnotationContext';
import { useTranslation } from '../contexts/TranslationContext';

interface VerseActionMenuProps {
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

export default function VerseActionMenu({
  book,
  chapter,
  verse,
  verseText,
  isOpen,
  onClose,
  anchorRect,
}: VerseActionMenuProps) {
  const { addBookmark, removeBookmark, isBookmarked, getBookmark } = useBookmarks();
  const { hasAnnotation, getAnnotation, addAnnotation } = useAnnotations();
  const { translation } = useTranslation();
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const bookmarked = isBookmarked(book, chapter, verse);
  const annotated = hasAnnotation(book, chapter, verse);

  useEffect(() => {
    if (isOpen && annotated) {
      const existing = getAnnotation(book, chapter, verse);
      if (existing) setAnnotationText(existing.note);
    }
  }, [isOpen, annotated, book, chapter, verse, getAnnotation]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
        setShowAnnotationInput(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      const bm = getBookmark(book, chapter, verse);
      if (bm) removeBookmark(bm.id);
    } else {
      addBookmark(book, chapter, verse, translation, verseText);
    }
  };

  const handleAnnotationSave = () => {
    if (annotationText.trim()) {
      addAnnotation(book, chapter, verse, annotationText.trim(), verseText);
      setShowAnnotationInput(false);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-2 min-w-[200px]"
      style={{
        top: anchorRect.bottom + 8,
        left: Math.min(anchorRect.left, window.innerWidth - 220),
      }}
    >
      <div className="text-xs text-surface-400 dark:text-surface-500 px-2 py-1 mb-1">
        {book} {chapter}:{verse}
      </div>

      <button
        onClick={handleBookmarkToggle}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-left"
      >
        {bookmarked ? (
          <>
            <BookmarkCheck className="w-4 h-4 text-primary-500" />
            <span className="text-primary-600 dark:text-primary-400">Remove Bookmark</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4 text-surface-500" />
            <span className="text-surface-700 dark:text-surface-300">Bookmark</span>
          </>
        )}
      </button>

      <button
        onClick={() => setShowAnnotationInput(!showAnnotationInput)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-left"
      >
        {annotated ? (
          <>
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span className="text-surface-700 dark:text-surface-300">Edit Note</span>
          </>
        ) : (
          <>
            <MessageSquarePlus className="w-4 h-4 text-surface-500" />
            <span className="text-surface-700 dark:text-surface-300">Add Note</span>
          </>
        )}
      </button>

      {showAnnotationInput && (
        <div className="mt-2 px-1">
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Write your note..."
            className="w-full h-20 p-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 text-surface-800 dark:text-surface-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setShowAnnotationInput(false);
                onClose();
              }}
              className="px-3 py-1 text-xs rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAnnotationSave}
              className="px-3 py-1 text-xs rounded-md bg-primary-600 text-white hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
