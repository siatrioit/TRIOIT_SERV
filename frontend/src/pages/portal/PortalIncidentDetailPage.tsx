import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { IncidentMessageThread } from '../../components/incidents/IncidentMessageThread';
import { PriorityBadge } from '../../components/incidents/PriorityBadge';
import { StatusBadge } from '../../components/incidents/StatusBadge';

function formatDate(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PortalIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['portal-incident', id],
    queryFn: () => portalIncidentsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-8 text-gray-400">Ielādē...</div>;

  const incident = data?.data;
  if (!incident) {
    return (
      <div className="card text-center text-gray-500 py-8">
        Izsaukums nav atrasts.{' '}
        <Link to="/portal" className="text-emerald-700 font-medium">
          Atpakaļ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <Link to="/portal" className="text-emerald-700 text-sm font-medium">
        ← Visi izsaukumi
      </Link>

      <div className="flex gap-2 flex-wrap">
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={incident.status} />
      </div>

      <h2 className="text-xl font-bold">{incident.title}</h2>
      <p className="text-sm text-gray-500">{incident.incident_number}</p>

      <div className="card space-y-2 text-sm">
        <div>
          <span className="text-gray-500">Klients: </span>
          <span className="font-medium">{incident.client_name}</span>
        </div>
        {incident.object_name && (
          <div>
            <span className="text-gray-500">Objekts: </span>
            <span className="font-medium">{incident.object_name}</span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Saņemts: </span>
          <span>{formatDate(incident.received_at)}</span>
        </div>
      </div>

      {incident.description && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Apraksts</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
        </div>
      )}

      {incident.status === 'completed' && incident.resolution && (
        <div className="card bg-green-50 border-green-100">
          <h3 className="text-sm font-medium text-green-800 mb-2">Risinājums</h3>
          <p className="text-green-900 whitespace-pre-wrap">{incident.resolution}</p>
          {incident.completed_at && (
            <p className="text-xs text-green-700 mt-2">
              Pabeigts: {formatDate(incident.completed_at)}
            </p>
          )}
        </div>
      )}

      {id && (
        <IncidentMessageThread
          incidentId={id}
          variant="portal"
          incidentClosed={
            incident.status === 'completed' || incident.status === 'cancelled'
          }
        />
      )}
    </div>
  );
}
