import { Outlet } from 'react-router-dom';
import { AppBrand } from './AppBrand';
import { BottomNav } from './BottomNav';
import { QuickActionFab } from './QuickActionFab';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-primary-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <AppBrand />
      </header>

      <main className="flex-1 px-4 py-4 w-full max-w-lg lg:max-w-4xl mx-auto">
        <Outlet />
      </main>

      <QuickActionFab />
      <BottomNav />
    </div>
  );
}
