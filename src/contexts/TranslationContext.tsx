import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Translation } from '../types';

interface TranslationContextType {
  translation: Translation;
  setTranslation: (t: Translation) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translation, setTranslation] = useState<Translation>(() => {
    const stored = localStorage.getItem('bible-app-translation');
    return (stored === 'ESV' || stored === 'NASB1995' || stored === 'CSB' || stored === 'NLT') ? stored : 'ESV';
  });

  const handleSet = (t: Translation) => {
    setTranslation(t);
    localStorage.setItem('bible-app-translation', t);
  };

  return (
    <TranslationContext.Provider value={{ translation, setTranslation: handleSet }}>
      {children}
    </TranslationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}
