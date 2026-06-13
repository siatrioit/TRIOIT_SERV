import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalAuthApi } from '../../api/portalAuth';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalUserCanWrite } from '../../utils/portalPermissions';
import { useAppVersionLabel } from '../../hooks/useAppVersionLabel';

export function PortalLayout() {
  const versionLabel = useAppVersionLabel();
  const queryClient = useQueryClient();
  const user = usePortalAuthStore((s) => s.user);
  const logout = usePortalAuthStore((s) => s.logout);
  const setSession = usePortalAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => portalAuthApi.me(),
    retry: false,
  });

  useEffect(() => {
    if (data?.data) {
      setSession(data.data.access, data.data.objects);
    }
  }, [data, setSession]);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/portal/login', { replace: true });
  };

  const hasClientWide = usePortalAuthStore((s) =>
    s.access.some((a) => a.scope === 'client')
  );
  const access = usePortalAuthStore((s) => s.access);
  const canWrite = portalUserCanWrite(access);

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-gray-50">
      <header className="bg-emerald-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between gap-3 max-w-lg lg:max-w-2xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold">TRIO Klientu portāls</h1>
            <p className="text-xs text-emerald-200">{versionLabel}</p>
          </div>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-emerald-100 hover:text-white shrink-0"
            >
              Iziet
            </button>
          )}
        </div>
        {user && (
          <p className="text-sm text-emerald-100 mt-1 max-w-lg lg:max-w-2xl mx-auto truncate">
            {user.full_name}
            {hasClientWide ? ' · visa organizācija' : ' · objekta pieeja'}
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-4 w-full max-w-lg lg:max-w-2xl mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `flex flex-col items-center min-w-[72px] text-xs font-medium ${
                isActive ? 'text-emerald-700' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl" aria-hidden>
              ⚡
            </span>
            Izsaukumi
          </NavLink>
          <NavLink
            to="/portal/incidents/new"
            className={({ isActive }) =>
              `flex flex-col items-center min-w-[72px] text-xs font-medium ${
                isActive ? 'text-emerald-700' : canWrite ? 'text-gray-500' : 'text-gray-300 pointer-events-none'
              }`
            }
            aria-disabled={!canWrite}
            onClick={(e) => {
              if (!canWrite) e.preventDefault();
            }}
          >
            <span className="text-xl bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center -mt-4 shadow-md">
              +
            </span>
            Jauns
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
