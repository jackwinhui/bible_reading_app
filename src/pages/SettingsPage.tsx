import { useState } from 'react';
import { Settings, Eye, EyeOff, ExternalLink, Check } from 'lucide-react';
import { useApiKeys } from '../contexts/ApiKeysContext';

export default function SettingsPage() {
  const { esvApiKey, scriptureApiKey, setEsvApiKey, setScriptureApiKey } = useApiKeys();
  const [esvInput, setEsvInput] = useState(esvApiKey);
  const [scriptureInput, setScriptureInput] = useState(scriptureApiKey);
  const [showEsv, setShowEsv] = useState(false);
  const [showScripture, setShowScripture] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setEsvApiKey(esvInput.trim());
    setScriptureApiKey(scriptureInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
        <Settings className="w-8 h-8 text-primary-500" />
        Settings
      </h1>
      <p className="text-surface-500 dark:text-surface-400 mb-8">
        Configure your API keys to load Bible text. Keys are stored locally on your device.
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

        <p className="text-xs text-center text-surface-400 dark:text-surface-500">
          Keys are stored in your browser's local storage and never sent anywhere except the respective API services.
        </p>
      </div>
    </div>
  );
}
