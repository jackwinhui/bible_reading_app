import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 text-surface-800 dark:text-surface-200 transition-colors">
      <Header />
      <div className="flex max-w-7xl mx-auto" style={{ height: 'calc(100vh - 3.5rem)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
