import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { TranslationProvider } from './contexts/TranslationContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { AnnotationProvider } from './contexts/AnnotationContext';
import { ApiKeysProvider } from './contexts/ApiKeysContext';
import { JournalProvider } from './contexts/JournalContext';
import { CustomVersesProvider } from './contexts/CustomVersesContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChapterPage from './pages/ChapterPage';
import ReadingPage from './pages/ReadingPage';
import BookmarksPage from './pages/BookmarksPage';
import AnnotationsPage from './pages/AnnotationsPage';
import MemoryVersePage from './pages/MemoryVersePage';
import JournalPage from './pages/JournalPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <ApiKeysProvider>
        <TranslationProvider>
        <BookmarkProvider>
          <AnnotationProvider>
            <JournalProvider>
              <CustomVersesProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/read/:bookName" element={<ChapterPage />} />
                    <Route path="/read/:bookName/:chapter" element={<ReadingPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/annotations" element={<AnnotationsPage />} />
                    <Route path="/memory" element={<MemoryVersePage />} />
                    <Route path="/journal" element={<JournalPage />} />
                    <Route path="/journal/:entryId" element={<JournalPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Routes>
              </CustomVersesProvider>
            </JournalProvider>
          </AnnotationProvider>
        </BookmarkProvider>
      </TranslationProvider>
      </ApiKeysProvider>
    </ThemeProvider>
  );
}
