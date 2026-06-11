import { Link, Outlet } from 'react-router-dom';
import { AppBrand } from './AppBrand';
import { BottomNav } from './BottomNav';
import { QuickActionFab } from './QuickActionFab';
import { useAuthStore } from '../../store/authStore';

export function AppLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const showUsersLink = role === 'admin' || role === 'manager';
  const showWarehouseLink =
    role === 'admin' || role === 'manager' || role === 'technician';

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-primary-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between gap-3 max-w-lg lg:max-w-4xl mx-auto">
          <AppBrand />
          <div className="flex items-center gap-4 shrink-0">
            {showWarehouseLink && (
              <Link
                to="/warehouse"
                className="text-sm font-medium text-primary-100 hover:text-white"
              >
                Noliktava
              </Link>
            )}
            {showUsersLink && (
              <Link
                to="/users"
                className="text-sm font-medium text-primary-100 hover:text-white"
              >
                Lietotāji
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 w-full max-w-lg lg:max-w-4xl mx-auto">
        <Outlet />
      </main>

      <QuickActionFab />
      <BottomNav />
    </div>
  );
}
