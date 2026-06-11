import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { PortalIncidentCard } from '../../components/portal/PortalIncidentCard';

export function PortalIncidentsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['portal-incidents'],
    queryFn: () => portalIncidentsApi.list({ limit: '50' }),
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
          Nav reģistrētu izsaukumu. Nospiediet „Jauns izsaukums”, lai izsauktu meistaru.
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
