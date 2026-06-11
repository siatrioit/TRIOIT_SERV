import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { IncidentMessageThread } from '../components/incidents/IncidentMessageThread';
import { PriorityBadge } from '../components/incidents/PriorityBadge';
import { StatusBadge } from '../components/incidents/StatusBadge';
import { useAuthStore } from '../store/authStore';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const canPost = role === 'admin' || role === 'manager' || role === 'technician';

  const { data, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-8">Ielādē...</div>;
  const incident = data?.data;
  if (!incident) return <div>Atgadījums nav atrasts</div>;

  const isClosed = incident.status === 'completed' || incident.status === 'cancelled';

  return (
    <div className="space-y-4 pb-8">
      <Link to="/incidents" className="text-primary-600 text-sm font-medium">
        ← Visi atgadījumi
      </Link>

      <div className="flex gap-2 flex-wrap">
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={incident.status} />
      </div>
      <h2 className="text-xl font-bold">{incident.title}</h2>
      <p className="text-sm text-gray-500">{incident.incident_number}</p>
      {incident.description && (
        <div className="card">
          <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
        </div>
      )}

      {id && (
        <IncidentMessageThread
          incidentId={id}
          variant="staff"
          canPost={canPost}
          incidentClosed={isClosed}
        />
      )}
    </div>
  );
}
