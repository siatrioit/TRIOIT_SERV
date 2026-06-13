import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppBrand } from './AppBrand';
import { BottomNav } from './BottomNav';
import { PushNotificationBanner } from './PushNotificationBanner';
import { QuickActionFab } from './QuickActionFab';
import { useAuthStore } from '../../store/authStore';
import { syncPushSubscriptionIfGranted } from '../../utils/pushNotifications';

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const role = user?.role;
  const showUsersLink = role === 'admin' || role === 'manager';
  const canUsePush = role === 'admin' || role === 'manager' || role === 'technician';

  useEffect(() => {
    if (!canUsePush) return;
    syncPushSubscriptionIfGranted().catch(() => {});
  }, [canUsePush]);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-primary-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between gap-3 max-w-lg lg:max-w-4xl mx-auto">
          <AppBrand />
          <div className="flex items-center gap-3 shrink-0">
            {showUsersLink && (
              <Link
                to="/setup"
                className="text-sm font-medium text-primary-100 hover:text-white"
              >
                Iestatījumi
              </Link>
            )}
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-primary-100 hover:text-white"
              >
                Iziet
              </button>
            )}
          </div>
        </div>
        {user && (
          <p className="text-sm text-primary-100 mt-1 max-w-lg lg:max-w-4xl mx-auto truncate">
            {user.full_name}
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-4 w-full max-w-lg lg:max-w-4xl mx-auto">
        <PushNotificationBanner role={role} />
        <Outlet />
      </main>

      <QuickActionFab />
      <BottomNav />
    </div>
  );
}
