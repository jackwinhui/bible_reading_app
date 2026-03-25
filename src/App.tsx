import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { TranslationProvider } from './contexts/TranslationContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { AnnotationProvider } from './contexts/AnnotationContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChapterPage from './pages/ChapterPage';
import ReadingPage from './pages/ReadingPage';
import BookmarksPage from './pages/BookmarksPage';
import AnnotationsPage from './pages/AnnotationsPage';
import MemoryVersePage from './pages/MemoryVersePage';

export default function App() {
  return (
    <ThemeProvider>
      <TranslationProvider>
        <BookmarkProvider>
          <AnnotationProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/read/:bookName" element={<ChapterPage />} />
                <Route path="/read/:bookName/:chapter" element={<ReadingPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/annotations" element={<AnnotationsPage />} />
                <Route path="/memory" element={<MemoryVersePage />} />
              </Route>
            </Routes>
          </AnnotationProvider>
        </BookmarkProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
}
