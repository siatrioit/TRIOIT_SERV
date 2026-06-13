import { NavLink, Outlet } from 'react-router-dom';

const sections = [
  {
    to: '/warehouse/products',
    label: 'Preces un grupas',
    hint: 'Katalogs',
    icon: '🏷️',
  },
  {
    to: '/warehouse/clients',
    label: 'Klienti',
    hint: 'Partneri',
    icon: '👥',
  },
  {
    to: '/warehouse/receipts',
    label: 'Saņemšana',
    hint: 'Piegādes',
    icon: '📥',
  },
  {
    to: '/warehouse/issues',
    label: 'Izrakstīšana',
    hint: 'Izsniegšana',
    icon: '📤',
  },
] as const;

export function WarehouseLayout() {
  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-lg font-semibold">Noliktava</h2>
        <p className="text-sm text-gray-500">Preču uzskaite un pavadzīmes</p>
      </div>

      <nav className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Noliktavas sadaļas">
        {sections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition-all min-h-[96px] justify-center ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-200'
                  : 'border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm'
              }`
            }
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl shadow-sm border border-gray-100 group-hover:scale-105 transition-transform"
              aria-hidden
            >
              {s.icon}
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-gray-900">{s.label}</span>
              <span className="block text-[10px] text-gray-500 mt-0.5">{s.hint}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
