const colors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  paused: 'bg-gray-100 text-gray-700',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

const labels: Record<string, string> = {
  pending: 'Gaida',
  in_progress: 'Darbā',
  paused: 'Pauze',
  completed: 'Izpildīts',
  cancelled: 'Atcelts',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {labels[status] || status}
    </span>
  );
}
