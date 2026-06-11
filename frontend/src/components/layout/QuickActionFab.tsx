import { Link } from 'react-router-dom';

/** Peldošā poga — ātra jauna atgadījuma izveide */
export function QuickActionFab() {
  return (
    <Link
      to="/incidents/new"
      className="fixed bottom-20 right-4 z-50 btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-xl text-2xl"
      aria-label="Jauns atgadījums"
    >
      +
    </Link>
  );
}
