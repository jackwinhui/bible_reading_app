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
} from 'lucide-react';
import { fighterVerses, getCurrentWeekVerse } from '../data/fighterVerses';
import { fetchVerseRange, getVerseText } from '../services/bibleApi';
import { compareVerses, type ComparisonResult } from '../utils/verseComparison';
import { useTranslation } from '../contexts/TranslationContext';
import { getProgressForWeek, updateProgressForWeek } from '../utils/storage';
import type { FighterVerse, MemoryProgress } from '../types';

type Stage = 'study' | 'type' | 'result';

export default function MemoryVersePage() {
  const { translation } = useTranslation();
  const currentWeekVerse = getCurrentWeekVerse();
  const [selectedVerse, setSelectedVerse] = useState<FighterVerse>(currentWeekVerse);
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('study');
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [progress, setProgress] = useState<MemoryProgress | undefined>();
  const [showVerse, setShowVerse] = useState(true);

  const loadVerse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const verses = await fetchVerseRange(
        selectedVerse.book,
        selectedVerse.chapter,
        selectedVerse.verseStart,
        selectedVerse.verseEnd,
        translation
      );
      setVerseText(getVerseText(verses));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verse');
    } finally {
      setLoading(false);
    }
  }, [selectedVerse, translation]);

  useEffect(() => {
    loadVerse();
    setStage('study');
    setTypedText('');
    setResult(null);
    setShowVerse(true);
    setProgress(getProgressForWeek(selectedVerse.week));
  }, [loadVerse, selectedVerse.week]);

  const handleCheck = () => {
    const comparison = compareVerses(typedText, verseText);
    setResult(comparison);
    setStage('result');
    const updated = updateProgressForWeek(selectedVerse.week, selectedVerse.reference, comparison.score);
    setProgress(updated);
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

  const navigateWeek = (dir: -1 | 1) => {
    const newWeek = selectedVerse.week + dir;
    if (newWeek >= 1 && newWeek <= 52) {
      setSelectedVerse(fighterVerses[newWeek - 1]);
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
          Fighter Verses Set 1 — Memorize one verse per week
        </p>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
        <button
          onClick={() => navigateWeek(-1)}
          disabled={selectedVerse.week <= 1}
          className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">
            Week {selectedVerse.week} of 52
            {selectedVerse.week === currentWeekVerse.week && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs">
                This Week
              </span>
            )}
          </div>
          <div className="text-lg font-semibold text-surface-800 dark:text-surface-200 mt-1">
            {selectedVerse.reference}
          </div>
        </div>

        <button
          onClick={() => navigateWeek(1)}
          disabled={selectedVerse.week >= 52}
          className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Progress card */}
      {progress && (
        <div className="mb-6 flex items-center gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div className="flex-1 text-sm">
            <span className="text-surface-600 dark:text-surface-400">
              Best: <strong className="text-surface-800 dark:text-surface-200">{progress.bestScore}%</strong>
            </span>
            <span className="mx-3 text-surface-300 dark:text-surface-600">·</span>
            <span className="text-surface-600 dark:text-surface-400">
              {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Content area */}
      {loading ? (
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
                    {selectedVerse.reference} ({translation})
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
                  Type <strong>{selectedVerse.reference}</strong> from memory:
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
                <h3 className="text-sm font-medium text-surface-500 mb-3">Word-by-word comparison:</h3>
                <div className="flex flex-wrap gap-1">
                  {result.words.map((w, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm ${
                        w.correct
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}
                      title={w.correct ? 'Correct' : `Expected: "${w.expected}"`}
                    >
                      {w.correct ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {w.word || '___'}
                    </span>
                  ))}
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

      {/* Week list */}
      <div className="mt-12 pt-8 border-t border-surface-200 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-4">
          All Fighter Verses
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fighterVerses.map((fv) => {
            const prog = getProgressForWeek(fv.week);
            const isCurrent = fv.week === currentWeekVerse.week;
            const isSelected = fv.week === selectedVerse.week;
            return (
              <button
                key={fv.week}
                onClick={() => setSelectedVerse(fv)}
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
      </div>
    </div>
  );
}
