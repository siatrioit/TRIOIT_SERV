import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { IncidentCard } from '../components/incidents/IncidentCard';

function IncidentSection({
  title,
  incidents,
  emptyText,
}: {
  title: string;
  incidents: Awaited<ReturnType<typeof incidentsApi.list>>['data'];
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {incidents.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-xl">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </section>
  );
}

export function IncidentsPage() {
  const { data: openData, isLoading: openLoading } = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => incidentsApi.list({ status: 'open', limit: '50' }),
    refetchInterval: 30_000,
  });

  const { data: closedData, isLoading: closedLoading } = useQuery({
    queryKey: ['incidents', 'closed'],
    queryFn: () => incidentsApi.list({ status: 'closed', limit: '50' }),
    refetchInterval: 30_000,
  });

  const isLoading = openLoading || closedLoading;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Atgadījumi</h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : (
        <>
          <IncidentSection
            title="Aktīvie atgadījumi"
            incidents={openData?.data ?? []}
            emptyText="Nav aktīvu atgadījumu"
          />
          <IncidentSection
            title="Noslēgtie atgadījumi"
            incidents={closedData?.data ?? []}
            emptyText="Nav noslēgtu atgadījumu"
          />
        </>
      )}
    </div>
  );
}
