const colors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const labels: Record<string, string> = {
  low: 'Zema',
  medium: 'Vidēja',
  high: 'Augsta',
  critical: 'Kritiska',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[priority] || colors.medium}`}>
      {labels[priority] || priority}
    </span>
  );
}
