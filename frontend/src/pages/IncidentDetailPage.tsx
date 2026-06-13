import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../api/incidents';
import { IncidentAssigneeSection } from '../components/incidents/IncidentAssigneeSection';
import { IncidentActivityLog } from '../components/incidents/IncidentActivityLog';
import { IncidentCompletionSection } from '../components/incidents/IncidentCompletionSection';
import { IncidentStatusSection } from '../components/incidents/IncidentStatusSection';
import { IncidentMessageThread } from '../components/incidents/IncidentMessageThread';
import { IncidentMaterialsSection } from '../components/incidents/IncidentMaterialsSection';
import { IncidentWorkLogSection } from '../components/incidents/IncidentWorkLogSection';
import { PriorityBadge } from '../components/incidents/PriorityBadge';
import { StatusBadge } from '../components/incidents/StatusBadge';
import { formatIncidentUnit } from '../utils/incidentUnit';
import { useAuthStore } from '../store/authStore';
import { useIncidentStatuses } from '../hooks/useIncidentStatuses';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const canPost = role === 'admin' || role === 'manager' || role === 'technician';
  const { isClosed } = useIncidentStatuses();

  const { data, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-8">Ielādē...</div>;
  const incident = data?.data;
  if (!incident) return <div>Atgadījums nav atrasts</div>;

  const isClosedStatus = isClosed(incident.status);

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

      {(incident.object_name || formatIncidentUnit(incident)) && (
        <div className="card space-y-2 text-sm">
          {incident.object_name && (
            <div>
              <span className="text-gray-500">Objekts: </span>
              <span className="font-medium">{incident.object_name}</span>
            </div>
          )}
          {formatIncidentUnit(incident) && (
            <div>
              <span className="text-gray-500">Klienta aktīvs: </span>
              <span className="font-medium">{formatIncidentUnit(incident)}</span>
            </div>
          )}
          {incident.asset_component_name && (
            <div>
              <span className="text-gray-500">Apakšsadaļa: </span>
              <span className="font-medium">{incident.asset_component_name}</span>
            </div>
          )}
        </div>
      )}

      {id && (
        <IncidentStatusSection
          incidentId={id}
          status={incident.status}
          canEdit={canPost}
        />
      )}

      {id && (
        <IncidentAssigneeSection
          incidentId={id}
          assignedTo={incident.assigned_to}
          assignedUserName={incident.assigned_user_name}
          canEdit={canPost}
        />
      )}

      {id && (
        <>
          <IncidentWorkLogSection
            incidentId={id}
            canEdit={canPost}
            incidentClosed={isClosedStatus}
          />
          <IncidentMaterialsSection incidentId={id} />
          <IncidentCompletionSection
            incidentId={id}
            variant="staff"
            canEdit={canPost}
            incidentClosed={isClosedStatus}
          />
          <IncidentActivityLog incidentId={id} />
          <IncidentMessageThread
            incidentId={id}
            variant="staff"
            canPost={canPost}
            incidentClosed={isClosedStatus}
          />
        </>
      )}
    </div>
  );
}
