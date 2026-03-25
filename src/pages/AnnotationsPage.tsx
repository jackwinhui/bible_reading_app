import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit3, StickyNote, Save, X } from 'lucide-react';
import { useAnnotations } from '../contexts/AnnotationContext';

export default function AnnotationsPage() {
  const { annotations, updateAnnotation, removeAnnotation } = useAnnotations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (id: string, note: string) => {
    setEditingId(id);
    setEditText(note);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      updateAnnotation(editingId, editText.trim());
      setEditingId(null);
    }
  };

  const grouped = annotations.reduce(
    (acc, ann) => {
      if (!acc[ann.book]) acc[ann.book] = [];
      acc[ann.book].push(ann);
      return acc;
    },
    {} as Record<string, typeof annotations>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2">
        Notes
      </h1>
      <p className="text-surface-500 dark:text-surface-400 mb-8">
        {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
      </p>

      {annotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <StickyNote className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-4" />
          <p className="text-surface-500 dark:text-surface-400 mb-2">No notes yet</p>
          <p className="text-sm text-surface-400 dark:text-surface-500">
            Click on any verse while reading to add a note
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
          {Object.entries(grouped).map(([bookName, anns]) => (
            <div key={bookName}>
              <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-3">
                {bookName}
              </h2>
              <div className="space-y-3">
                {anns
                  .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)
                  .map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-xl border border-surface-200 dark:border-surface-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to={`/read/${encodeURIComponent(ann.book)}/${ann.chapter}`}
                          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline no-underline"
                        >
                          {ann.book} {ann.chapter}:{ann.verse}
                        </Link>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(ann.id, ann.note)}
                            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600 transition-colors"
                            title="Edit note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-surface-400 hover:text-red-500 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-surface-400 dark:text-surface-500 italic mb-2 line-clamp-1">
                        "{ann.verseText}"
                      </p>

                      {editingId === ann.id ? (
                        <div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-20 p-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 text-surface-800 dark:text-surface-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                            <button
                              onClick={saveEdit}
                              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-primary-600 text-white hover:bg-primary-700"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                          {ann.note}
                        </p>
                      )}

                      <p className="text-xs text-surface-400 mt-2">
                        Updated {new Date(ann.updatedAt).toLocaleDateString()}
                      </p>
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
