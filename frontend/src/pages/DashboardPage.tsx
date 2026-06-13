import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { incidentsApi } from '../api/incidents';
import { IncidentCard } from '../components/incidents/IncidentCard';
import { AiQueryBar } from '../components/ai/AiQueryBar';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => incidentsApi.list({ status: 'open', limit: '5' }),
  });

  return (
    <div className="space-y-6">
      <AiQueryBar />

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Atvērtie atgadījumi</h2>
          <Link to="/incidents" className="text-primary-600 text-sm font-medium">
            Visi →
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Ielādē...</div>
        ) : data?.data.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">
            Nav atvērtu atgadījumu
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
