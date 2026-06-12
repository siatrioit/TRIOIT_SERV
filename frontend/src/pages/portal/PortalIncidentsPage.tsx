import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { PortalIncidentCard } from '../../components/portal/PortalIncidentCard';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { isClosedIncidentStatus, isOpenIncidentStatus } from '../../utils/incidentStatus';
import { portalUserCanWrite } from '../../utils/portalPermissions';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}

export function PortalIncidentsPage() {
  const objects = usePortalAuthStore((s) => s.objects);
  const access = usePortalAuthStore((s) => s.access);
  const canWrite = portalUserCanWrite(access);
  const [objectFilter, setObjectFilter] = useState('');

  const sortedObjects = useMemo(() => sortByName(objects), [objects]);

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['portal-incidents', objectFilter],
    queryFn: () =>
      portalIncidentsApi.list({
        limit: '100',
        ...(objectFilter ? { object_id: objectFilter } : {}),
      }),
    refetchInterval: 30_000,
    refetchOnMount: 'always',
  });

  const incidents = data?.data ?? [];

  const { openIncidents, closedIncidents } = useMemo(() => {
    const open = incidents.filter((i) => isOpenIncidentStatus(i.status));
    const closed = incidents.filter((i) => isClosedIncidentStatus(i.status));
    const other = incidents.filter(
      (i) => !isOpenIncidentStatus(i.status) && !isClosedIncidentStatus(i.status)
    );
    return {
      openIncidents: [...open, ...other],
      closedIncidents: closed,
    };
  }, [incidents]);

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

      {canWrite ? (
        <Link
          to="/portal/incidents/new"
          className="card block text-center py-4 border-2 border-dashed border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
        >
          + Reģistrēt jaunu izsaukumu
        </Link>
      ) : null}

      {error && (
        <div className="card text-red-700 text-sm">
          Neizdevās ielādēt izsaukumus. Mēģiniet vēlreiz.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          {objectFilter
            ? 'Šim objektam nav reģistrētu izsaukumu.'
            : 'Nav reģistrētu izsaukumu.'}
          {canWrite && !objectFilter && (
            <p className="text-sm mt-2">Nospiediet „Jauns izsaukums”, lai izsauktu meistaru.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Aktīvie ({openIncidents.length})
            </h3>
            {openIncidents.length === 0 ? (
              <p className="text-sm text-gray-500 card py-4 text-center">Nav aktīvu izsaukumu</p>
            ) : (
              <div className="space-y-3">
                {openIncidents.map((incident) => (
                  <PortalIncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Noslēgtie ({closedIncidents.length})
            </h3>
            {closedIncidents.length === 0 ? (
              <p className="text-sm text-gray-500 card py-4 text-center">Nav noslēgtu izsaukumu</p>
            ) : (
              <div className="space-y-3">
                {closedIncidents.map((incident) => (
                  <PortalIncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
