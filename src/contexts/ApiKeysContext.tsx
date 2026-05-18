import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';

interface ApiKeysState {
  esvApiKey: string;
  scriptureApiKey: string;
}

interface ApiKeysContextType extends ApiKeysState {
  setEsvApiKey: (key: string) => void;
  setScriptureApiKey: (key: string) => void;
  isConfigured: boolean;
}

const STORAGE_KEY = 'bible-app-api-keys';
const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

function loadKeys(): ApiKeysState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        esvApiKey: parsed.esvApiKey || '',
        scriptureApiKey: parsed.scriptureApiKey || '',
      };
    }
  } catch { /* ignore */ }

  // Fall back to build-time env vars if available
  return {
    esvApiKey: import.meta.env.VITE_ESV_API_KEY || '',
    scriptureApiKey: import.meta.env.VITE_SCRIPTURE_API_KEY || '',
  };
}

function saveKeys(keys: ApiKeysState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeysState>(loadKeys);

  const setEsvApiKey = useCallback((key: string) => {
    setKeys((prev) => {
      const updated = { ...prev, esvApiKey: key };
      saveKeys(updated);
      return updated;
    });
  }, []);

  const setScriptureApiKey = useCallback((key: string) => {
    setKeys((prev) => {
      const updated = { ...prev, scriptureApiKey: key };
      saveKeys(updated);
      return updated;
    });
  }, []);

  const isConfigured = keys.esvApiKey.length > 0 || keys.scriptureApiKey.length > 0;

  return (
    <ApiKeysContext.Provider value={{ ...keys, setEsvApiKey, setScriptureApiKey, isConfigured }}>
      {children}
    </ApiKeysContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApiKeys() {
  const ctx = useContext(ApiKeysContext);
  if (!ctx) throw new Error('useApiKeys must be used within ApiKeysProvider');
  return ctx;
}
