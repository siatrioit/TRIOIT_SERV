import { NavLink, Outlet } from 'react-router-dom';

const sections = [
  { to: '/warehouse/products', label: 'Preces un grupas' },
  { to: '/warehouse/clients', label: 'Klienti' },
  { to: '/warehouse/receipts', label: 'Saņemšanas pavadzīmes' },
  { to: '/warehouse/issues', label: 'Izrakstīšanas pavadzīmes' },
];

export function WarehouseLayout() {
  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-semibold">Noliktava</h2>
        <p className="text-sm text-gray-500">Preču uzskaite, partneri un pavadzīmes</p>
      </div>

      <nav className="flex gap-2 flex-wrap border-b border-gray-200 pb-2">
        {sections.map((s) => (
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
