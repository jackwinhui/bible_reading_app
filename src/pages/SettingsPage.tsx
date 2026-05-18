import { useRef, useState } from 'react';
import { Settings, Eye, EyeOff, ExternalLink, Check, Download, Upload, NotebookPen } from 'lucide-react';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useJournal } from '../contexts/JournalContext';
import type { JournalEntry } from '../types';

export default function SettingsPage() {
  const { esvApiKey, scriptureApiKey, setEsvApiKey, setScriptureApiKey } = useApiKeys();
  const { entries, exportEntries, importEntries } = useJournal();
  const [esvInput, setEsvInput] = useState(esvApiKey);
  const [scriptureInput, setScriptureInput] = useState(scriptureApiKey);
  const [showEsv, setShowEsv] = useState(false);
  const [showScripture, setShowScripture] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setEsvApiKey(esvInput.trim());
    setScriptureApiKey(scriptureInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJson = () => {
    const blob = new Blob([exportEntries()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bible-app-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const lines: string[] = [];
    for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push(`# ${e.title || 'Untitled entry'}`);
      lines.push(`_${e.date}_`);
      if (e.tags?.length) lines.push(`Tags: ${e.tags.join(', ')}`);
      lines.push('');
      for (const b of e.body) {
        if (b.type === 'text') {
          lines.push(b.content);
          lines.push('');
        } else {
          const range = b.ref.verseEnd && b.ref.verseEnd > b.ref.verseStart
            ? `${b.ref.verseStart}-${b.ref.verseEnd}`
            : `${b.ref.verseStart}`;
          lines.push(`> **${b.ref.book} ${b.ref.chapter}:${range}** (${b.ref.translation})`);
          lines.push(`> ${b.snapshot}`);
          lines.push('');
        }
      }
      lines.push('---\n');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bible-app-journal-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as JournalEntry[];
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      const mode = confirm(`Import ${parsed.length} entries?\n\nOK = Merge with existing\nCancel = Replace all`);
      importEntries(parsed, mode ? 'merge' : 'replace');
      setImportStatus(`Imported ${parsed.length} entries.`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
        <Settings className="w-8 h-8 text-primary-500" />
        Settings
      </h1>
      <p className="text-surface-500 dark:text-surface-400 mb-8">
        Configure your API keys and manage your journal. Data is stored locally on your device.
      </p>

      <div className="space-y-6">
        {/* ESV API Key */}
        <div className="p-5 rounded-xl border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-surface-800 dark:text-surface-200">
              ESV API Key
            </h2>
            <a
              href="https://api.esv.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline no-underline"
            >
              Get free key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500 mb-3">
            Required for ESV translation. Sign up at api.esv.org for a free key.
          </p>
          <div className="relative">
            <input
              type={showEsv ? 'text' : 'password'}
              value={esvInput}
              onChange={(e) => setEsvInput(e.target.value)}
              placeholder="Paste your ESV API key..."
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => setShowEsv(!showEsv)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600"
            >
              {showEsv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {esvApiKey && (
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Configured
            </p>
          )}
        </div>

        {/* Scripture API Key */}
        <div className="p-5 rounded-xl border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-surface-800 dark:text-surface-200">
              Scripture API Key
            </h2>
            <a
              href="https://scripture.api.bible/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline no-underline"
            >
              Get free key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500 mb-3">
            Required for NASB1995, CSB, and NLT translations. Sign up at scripture.api.bible.
          </p>
          <div className="relative">
            <input
              type={showScripture ? 'text' : 'password'}
              value={scriptureInput}
              onChange={(e) => setScriptureInput(e.target.value)}
              placeholder="Paste your Scripture API key..."
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => setShowScripture(!showScripture)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600"
            >
              {showScripture ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {scriptureApiKey && (
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Configured
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save API Keys'}
        </button>

        {/* Journal export/import */}
        <div className="p-5 rounded-xl border border-surface-200 dark:border-surface-700">
          <h2 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-2 flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-emerald-500" /> Journal
          </h2>
          <p className="text-xs text-surface-400 dark:text-surface-500 mb-3">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} stored locally. Export to back up; import to restore or merge.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportJson}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export Markdown
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800"
            >
              <Upload className="w-4 h-4" /> Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          {importStatus && (
            <p className="text-xs mt-2 text-surface-600 dark:text-surface-300">{importStatus}</p>
          )}
        </div>

        <p className="text-xs text-center text-surface-400 dark:text-surface-500">
          Keys are stored in your browser's local storage and never sent anywhere except the respective API services.
        </p>
      </div>
    </div>
  );
}
