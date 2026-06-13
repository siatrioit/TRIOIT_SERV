import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { IncidentCard } from '../components/incidents/IncidentCard';

type Tab = 'open' | 'closed';

export function IncidentsPage() {
  const [tab, setTab] = useState<Tab>('open');

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', tab],
    queryFn: () => incidentsApi.list({ status: tab, limit: '50' }),
    refetchInterval: 30_000,
  });

  const incidents = data?.data ?? [];

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Atgadījumi</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {tab === 'open' ? 'Atvērtie un aktīvie atgadījumi' : 'Pabeigtie un noslēgtie atgadījumi'}
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'open' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
          }`}
          onClick={() => setTab('open')}
        >
          Aktīvie
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'closed' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
          }`}
          onClick={() => setTab('closed')}
        >
          Noslēgtie
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : incidents.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-xl">
          {tab === 'open' ? 'Nav aktīvu atgadījumu' : 'Nav noslēgtu atgadījumu'}
        </p>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
