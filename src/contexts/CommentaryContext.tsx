import { createContext, useContext, useState, type ReactNode } from 'react';

interface CommentaryContextType {
  showCommentary: boolean;
  setShowCommentary: (v: boolean) => void;
  toggleCommentary: () => void;
}

const CommentaryContext = createContext<CommentaryContextType | undefined>(undefined);

const STORAGE_KEY = 'bible-app-show-commentary';

export function CommentaryProvider({ children }: { children: ReactNode }) {
  const [showCommentary, setShowCommentaryState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  const setShowCommentary = (v: boolean) => {
    setShowCommentaryState(v);
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  };

  const toggleCommentary = () => setShowCommentary(!showCommentary);

  return (
    <CommentaryContext.Provider value={{ showCommentary, setShowCommentary, toggleCommentary }}>
      {children}
    </CommentaryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommentary() {
  const ctx = useContext(CommentaryContext);
  if (!ctx) throw new Error('useCommentary must be used within CommentaryProvider');
  return ctx;
}
