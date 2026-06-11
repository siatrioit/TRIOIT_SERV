import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Sākums', icon: '🏠' },
  { to: '/incidents', label: 'Atgadījumi', icon: '⚡' },
  { to: '/clients', label: 'Klienti', icon: '👥' },
  { to: '/map', label: 'Karte', icon: '📍' },
  { to: '/invoices', label: 'Rēķini', icon: '📄' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-lg transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl" aria-hidden>{item.icon}</span>
            <span className="text-xs mt-0.5 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
