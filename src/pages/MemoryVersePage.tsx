import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { fighterVerses, getCurrentWeekVerse } from '../data/fighterVerses';
import { fetchVerseRange, getVerseText } from '../services/bibleApi';
import { compareVerses, type ComparisonResult } from '../utils/verseComparison';
import { useTranslation } from '../contexts/TranslationContext';
import { useCustomVerses } from '../contexts/CustomVersesContext';
import {
  getProgressForWeek,
  updateProgressForWeek,
  getProgressForCustomVerse,
  updateProgressForCustomVerse,
} from '../utils/storage';
import type { CustomMemoryVerse, FighterVerse, Translation } from '../types';
import CustomVerseEditorModal from '../components/CustomVerseEditorModal';

type Tab = 'fighter' | 'custom';
type Stage = 'study' | 'type' | 'result';

/** Normalized "memorizable verse" — covers both fighter and custom verses. */
interface ActiveVerse {
  source: 'fighter' | 'custom';
  fighterWeek?: number;        // present for fighter
  customId?: string;           // present for custom
  title: string;               // user-facing title (reference or custom title)
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  translation?: Translation;   // null = use user's current translation
  description?: string;
}

function fighterToActive(v: FighterVerse): ActiveVerse {
  return {
    source: 'fighter',
    fighterWeek: v.week,
    title: v.reference,
    reference: v.reference,
    book: v.book,
    chapter: v.chapter,
    verseStart: v.verseStart,
    verseEnd: v.verseEnd,
  };
}

function customToActive(v: CustomMemoryVerse): ActiveVerse {
  return {
    source: 'custom',
    customId: v.id,
    title: v.title,
    reference: v.reference,
    book: v.book,
    chapter: v.chapter,
    verseStart: v.verseStart,
    verseEnd: v.verseEnd,
    translation: v.translation,
    description: v.description,
  };
}

export default function MemoryVersePage() {
  const { translation: userTranslation } = useTranslation();
  const { verses: customVerses, addVerse, updateVerse, removeVerse } = useCustomVerses();
  const currentWeekVerse = getCurrentWeekVerse();

  const [tab, setTab] = useState<Tab>('fighter');
  const [active, setActive] = useState<ActiveVerse>(() => fighterToActive(currentWeekVerse));
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('study');
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [bestScore, setBestScore] = useState<number | undefined>();
  const [showVerse, setShowVerse] = useState(true);

  // Custom verse editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState<CustomMemoryVerse | undefined>();

  const translationForActive = active.translation ?? userTranslation;

  const loadVerse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const verses = await fetchVerseRange(
        active.book,
        active.chapter,
        active.verseStart,
        active.verseEnd,
        translationForActive
      );
      setVerseText(getVerseText(verses));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verse');
    } finally {
      setLoading(false);
    }
  }, [active, translationForActive]);

  useEffect(() => {
    loadVerse();
    setStage('study');
    setTypedText('');
    setResult(null);
    setShowVerse(true);
    if (active.source === 'fighter') {
      setBestScore(getProgressForWeek(active.fighterWeek!)?.bestScore);
    } else {
      setBestScore(getProgressForCustomVerse(active.customId!)?.bestScore);
    }
  }, [loadVerse, active]);

  const handleCheck = () => {
    const comparison = compareVerses(typedText, verseText);
    setResult(comparison);
    setStage('result');
    if (active.source === 'fighter') {
      const updated = updateProgressForWeek(
        active.fighterWeek!,
        active.reference,
        comparison.score
      );
      setBestScore(updated.bestScore);
    } else {
      const updated = updateProgressForCustomVerse(active.customId!, comparison.score);
      setBestScore(updated.bestScore);
    }
  };

  const handleReset = () => {
    setStage('study');
    setTypedText('');
    setResult(null);
    setShowVerse(true);
  };

  const handleStartTyping = () => {
    setShowVerse(false);
    setStage('type');
    setTypedText('');
  };

  const navigateFighterWeek = (dir: -1 | 1) => {
    if (active.source !== 'fighter') return;
    const newWeek = active.fighterWeek! + dir;
    if (newWeek >= 1 && newWeek <= 52) {
      setActive(fighterToActive(fighterVerses[newWeek - 1]));
    }
  };

  const selectFighter = (fv: FighterVerse) => setActive(fighterToActive(fv));
  const selectCustom = (cv: CustomMemoryVerse) => setActive(customToActive(cv));

  const handleSaveCustom = (
    init: Omit<CustomMemoryVerse, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingVerse) {
      updateVerse(editingVerse.id, init);
      // Refresh active if currently studying this verse
      if (active.source === 'custom' && active.customId === editingVerse.id) {
        setActive(customToActive({ ...editingVerse, ...init, updatedAt: new Date().toISOString() }));
      }
    } else {
      const created = addVerse(init);
      // Auto-select the newly added verse
      setTab('custom');
      setActive(customToActive(created));
    }
    setEditingVerse(undefined);
  };

  const handleDeleteCustom = (cv: CustomMemoryVerse) => {
    if (!confirm(`Delete "${cv.title}"? This cannot be undone.`)) return;
    removeVerse(cv.id);
    // If currently studying this verse, fall back to current fighter week
    if (active.source === 'custom' && active.customId === cv.id) {
      setActive(fighterToActive(currentWeekVerse));
      setTab('fighter');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary-500" />
          Memory Verse
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Memorize Scripture — Fighter Verses set 1 + your own custom verses
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 mb-6 w-fit">
        <button
          onClick={() => setTab('fighter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
            tab === 'fighter'
              ? 'bg-white dark:bg-surface-700 shadow-sm'
              : 'text-surface-500'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Fighter Verses
        </button>
        <button
          onClick={() => setTab('custom')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
            tab === 'custom'
              ? 'bg-white dark:bg-surface-700 shadow-sm'
              : 'text-surface-500'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> My Verses
          {customVerses.length > 0 && (
            <span className="text-xs text-surface-400">({customVerses.length})</span>
          )}
        </button>
      </div>

      {tab === 'fighter' && active.source === 'fighter' && (
        <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <button
            onClick={() => navigateFighterWeek(-1)}
            disabled={active.fighterWeek! <= 1}
            className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">
              Week {active.fighterWeek} of 52
              {active.fighterWeek === currentWeekVerse.week && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs">
                  This Week
                </span>
              )}
            </div>
            <div className="text-lg font-semibold text-surface-800 dark:text-surface-200 mt-1">
              {active.reference}
            </div>
          </div>

          <button
            onClick={() => navigateFighterWeek(1)}
            disabled={active.fighterWeek! >= 52}
            className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {tab === 'custom' && active.source === 'custom' && (
        <div className="mb-6 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <div className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1">
            {active.reference} ({translationForActive})
          </div>
          <div className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            {active.title}
          </div>
          {active.description && (
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 whitespace-pre-wrap">
              {active.description}
            </p>
          )}
        </div>
      )}

      {/* Best score badge (no attempts counter) */}
      {bestScore !== undefined && (
        <div className="mb-6 flex items-center gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div className="flex-1 text-sm text-surface-600 dark:text-surface-400">
            Best score: <strong className="text-surface-800 dark:text-surface-200">{bestScore}%</strong>
          </div>
        </div>
      )}

      {/* Practice area or empty state for custom */}
      {tab === 'custom' && customVerses.length === 0 ? (
        <CustomEmptyState
          onAdd={() => {
            setEditingVerse(undefined);
            setEditorOpen(true);
          }}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-500">Loading verse...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-surface-500 mb-2">{error}</p>
          <button onClick={loadVerse} className="text-sm text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Study stage */}
          {stage === 'study' && (
            <div>
              <div className="relative p-6 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                    {active.reference} ({translationForActive})
                  </span>
                  <button
                    onClick={() => setShowVerse(!showVerse)}
                    className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                  >
                    {showVerse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showVerse ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p
                  className={`text-lg leading-relaxed text-surface-800 dark:text-surface-200 transition-all duration-300 ${
                    showVerse ? 'opacity-100' : 'opacity-0 select-none'
                  }`}
                >
                  {verseText}
                </p>
              </div>

              <button
                onClick={handleStartTyping}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
              >
                I'm ready — Test me!
              </button>
            </div>
          )}

          {/* Typing stage */}
          {stage === 'type' && (
            <div>
              <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Type <strong>{active.reference}</strong> from memory:
                </p>
              </div>

              <textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Start typing the verse..."
                className="w-full h-40 p-4 text-lg rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStage('study');
                    setShowVerse(true);
                  }}
                  className="flex-1 py-3 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 font-medium transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!typedText.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-medium transition-colors"
                >
                  Check My Answer
                </button>
              </div>
            </div>
          )}

          {/* Result stage */}
          {stage === 'result' && result && (
            <div>
              {/* Score */}
              <div
                className={`text-center p-6 rounded-xl mb-6 border ${
                  result.score >= 90
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : result.score >= 70
                      ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="text-5xl font-bold mb-2">
                  <span
                    className={
                      result.score >= 90
                        ? 'text-green-600 dark:text-green-400'
                        : result.score >= 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {result.score}%
                  </span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  {result.correctWords} of {result.totalWords} words correct
                </p>
                {result.score === 100 && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    🎉 Perfect! You've memorized this verse!
                  </p>
                )}
              </div>

              {/* Word-by-word comparison */}
              <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 mb-6">
                <h3 className="text-sm font-medium text-surface-500 mb-3">
                  Word-by-word comparison
                </h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {result.words.map((w, i) => {
                    if (w.kind === 'correct') {
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          title="Correct"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {w.word}
                        </span>
                      );
                    }
                    if (w.kind === 'wrong') {
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                          title={`Expected: "${w.expected}"`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span className="line-through opacity-70">{w.word}</span>
                          <span className="font-medium">→ {w.expected}</span>
                        </span>
                      );
                    }
                    if (w.kind === 'missing') {
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-dashed border-amber-400 dark:border-amber-700"
                          title="Missing word"
                        >
                          + {w.expected}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 line-through"
                        title="Extra word (not in verse)"
                      >
                        {w.word}
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500 dark:text-surface-400 pt-2 border-t border-surface-200 dark:border-surface-700">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    {result.correctWords} correct
                  </span>
                  {result.wrongWords > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      {result.wrongWords} wrong
                    </span>
                  )}
                  {result.missingWords > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                      {result.missingWords} missing
                    </span>
                  )}
                  {result.extraWords > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-surface-400" />
                      {result.extraWords} extra
                    </span>
                  )}
                </div>
              </div>

              {/* Correct verse */}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 mb-6">
                <h3 className="text-sm font-medium text-surface-500 mb-2">Correct verse:</h3>
                <p className="text-surface-700 dark:text-surface-300 leading-relaxed">{verseText}</p>
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {/* Verse list for current tab */}
      <div className="mt-12 pt-8 border-t border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300">
            {tab === 'fighter' ? 'All Fighter Verses' : 'My Custom Verses'}
          </h2>
          {tab === 'custom' && (
            <button
              onClick={() => {
                setEditingVerse(undefined);
                setEditorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> Add verse
            </button>
          )}
        </div>

        {tab === 'fighter' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fighterVerses.map((fv) => {
              const prog = getProgressForWeek(fv.week);
              const isCurrent = fv.week === currentWeekVerse.week;
              const isSelected = active.source === 'fighter' && active.fighterWeek === fv.week;
              return (
                <button
                  key={fv.week}
                  onClick={() => selectFighter(fv)}
                  className={`flex items-center justify-between p-3 rounded-lg text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary-100 dark:bg-primary-900 border border-primary-300 dark:border-primary-700'
                      : 'border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                  }`}
                >
                  <div>
                    <span className="text-xs text-surface-400 mr-2">W{fv.week}</span>
                    <span className={`font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-surface-700 dark:text-surface-300'}`}>
                      {fv.reference}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400">
                        This week
                      </span>
                    )}
                  </div>
                  {prog && (
                    <span
                      className={`text-xs font-medium ${
                        prog.bestScore >= 90
                          ? 'text-green-500'
                          : prog.bestScore >= 70
                            ? 'text-amber-500'
                            : 'text-surface-400'
                      }`}
                    >
                      {prog.bestScore}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : customVerses.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-8">
            No custom verses yet. Click "Add verse" to create your first.
          </p>
        ) : (
          <div className="space-y-2">
            {customVerses.map((cv) => {
              const prog = getProgressForCustomVerse(cv.id);
              const isSelected = active.source === 'custom' && active.customId === cv.id;
              return (
                <div
                  key={cv.id}
                  className={`group flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-300 dark:border-primary-700'
                      : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                  }`}
                >
                  <button
                    onClick={() => selectCustom(cv)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-surface-800 dark:text-surface-200'}`}>
                        {cv.title}
                      </span>
                      {prog && (
                        <span
                          className={`text-xs font-medium ${
                            prog.bestScore >= 90
                              ? 'text-green-500'
                              : prog.bestScore >= 70
                                ? 'text-amber-500'
                                : 'text-surface-400'
                          }`}
                        >
                          {prog.bestScore}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {cv.reference} · {cv.translation}
                    </div>
                    {cv.description && (
                      <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">
                        {cv.description}
                      </div>
                    )}
                  </button>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingVerse(cv);
                        setEditorOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(cv)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomVerseEditorModal
        isOpen={editorOpen}
        initial={editingVerse}
        onClose={() => {
          setEditorOpen(false);
          setEditingVerse(undefined);
        }}
        onSave={handleSaveCustom}
      />
    </div>
  );
}

function CustomEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
      <BookOpen className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-700 mb-3" />
      <h3 className="text-base font-semibold text-surface-700 dark:text-surface-300 mb-1">
        No custom memory verses yet
      </h3>
      <p className="text-sm text-surface-500 mb-5 max-w-sm mx-auto">
        Add verses from your church, a memorization plan, or any verse you want to hide in your heart.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
      >
        <Plus className="w-4 h-4" /> Add your first verse
      </button>
    </div>
  );
}
