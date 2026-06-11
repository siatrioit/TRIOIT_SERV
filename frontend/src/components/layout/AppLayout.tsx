import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { QuickActionFab } from './QuickActionFab';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-primary-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <h1 className="text-lg font-semibold">TRIO-SERV</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <QuickActionFab />
      <BottomNav />
    </div>
  );
}
