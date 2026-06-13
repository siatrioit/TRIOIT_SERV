import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../../api/incidents';
import { StatusBadge } from '../incidents/StatusBadge';

type UnitIncidentsSectionProps = {
  unitId: string;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function UnitIncidentsSection({ unitId }: UnitIncidentsSectionProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['unit-incidents', unitId],
    queryFn: () => incidentsApi.list({ unit_id: unitId, limit: '20' }),
    enabled: Boolean(unitId),
    refetchOnMount: 'always',
  });

  const incidents = data?.data ?? [];

  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50/80 p-3">
      <h4 className="text-sm font-medium text-gray-800 mb-2">Saistītie atgadījumi</h4>
      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Ielādē...</p>
      ) : isError ? (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          Neizdevās ielādēt atgadījumus
        </p>
      ) : incidents.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Nav reģistrētu atgadījumu</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-2">
          {incidents.map((inc) => (
            <li key={inc.id} className="border-b border-gray-100 pb-2 last:border-0">
              <Link
                to={`/incidents/${inc.id}`}
                className="block rounded-lg -mx-1 px-1 py-1 hover:bg-white/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary-700 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {inc.incident_number} · {formatWhen(inc.received_at)}
                    </p>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
