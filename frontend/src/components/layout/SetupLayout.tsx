import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const sections = [
  { to: '/setup/users', label: 'Lietotāji', roles: ['admin', 'manager'] as const },
  { to: '/setup/asset-types', label: 'Aktīvu tipi', roles: ['admin'] as const },
];

export function SetupLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'admin' || role === 'manager';

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const visibleSections = sections.filter((s) => role && s.roles.includes(role as 'admin' | 'manager'));

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-semibold">Iestatījumi</h2>
        <p className="text-sm text-gray-500">Sistēmas konfigurācija un lietotāji</p>
      </div>

      <nav className="flex gap-2 flex-wrap border-b border-gray-200 pb-2">
        {visibleSections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
