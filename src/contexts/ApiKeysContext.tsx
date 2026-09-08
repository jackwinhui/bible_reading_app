import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { getDefaultApiKeys, type ApiKeys } from '../utils/apiKeys';

interface ApiKeysContextType extends ApiKeys {
  setEsvApiKey: (key: string) => void;
  setScriptureApiKey: (key: string) => void;
  isConfigured: boolean;
}

const STORAGE_KEY = 'bible-app-api-keys';
const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

function loadKeys(): ApiKeys {
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

  return getDefaultApiKeys();
}

function saveKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeys>(loadKeys);

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
