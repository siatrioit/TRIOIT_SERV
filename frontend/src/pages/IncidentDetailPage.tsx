import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { PriorityBadge } from '../components/incidents/PriorityBadge';
import { StatusBadge } from '../components/incidents/StatusBadge';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-8">Ielādē...</div>;
  const incident = data?.data;
  if (!incident) return <div>Atgadījums nav atrasts</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={incident.status} />
      </div>
      <h2 className="text-xl font-bold">{incident.title}</h2>
      <p className="text-sm text-gray-500">{incident.incident_number}</p>
      {incident.description && (
        <p className="text-gray-700">{incident.description}</p>
      )}
    </div>
  );
}
