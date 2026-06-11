import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { IncidentCard } from '../components/incidents/IncidentCard';

export function IncidentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => incidentsApi.list({ limit: '50' }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Atgadījumi</h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
