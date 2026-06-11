import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { PortalIncidentCard } from '../../components/portal/PortalIncidentCard';
import { usePortalAuthStore } from '../../store/portalAuthStore';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}

export function PortalIncidentsPage() {
  const objects = usePortalAuthStore((s) => s.objects);
  const [objectFilter, setObjectFilter] = useState('');

  const sortedObjects = useMemo(() => sortByName(objects), [objects]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['portal-incidents', objectFilter],
    queryFn: () =>
      portalIncidentsApi.list({
        limit: '50',
        ...(objectFilter ? { object_id: objectFilter } : {}),
      }),
    refetchInterval: 30_000,
  });

  const incidents = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Mani izsaukumi</h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-sm text-emerald-700 font-medium"
        >
          {isFetching ? '...' : 'Atjaunot'}
        </button>
      </div>

      {sortedObjects.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Objekts</label>
          <select
            className="input-field"
            value={objectFilter}
            onChange={(e) => setObjectFilter(e.target.value)}
          >
            <option value="">Visi pieejamie objekti</option>
            {sortedObjects.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.name}
                {obj.city ? ` · ${obj.city}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {sortedObjects.length === 1 && (
        <p className="text-sm text-gray-500">Objekts: {sortedObjects[0].name}</p>
      )}

      <Link
        to="/portal/incidents/new"
        className="card block text-center py-4 border-2 border-dashed border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
      >
        + Reģistrēt jaunu izsaukumu
      </Link>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          {objectFilter
            ? 'Šim objektam nav reģistrētu izsaukumu.'
            : 'Nav reģistrētu izsaukumu. Nospiediet „Jauns izsaukums”, lai izsauktu meistaru.'}
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <PortalIncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
