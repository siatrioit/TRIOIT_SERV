import { Link } from 'react-router-dom';
import type { Incident } from '../../api/incidents';
import {
  formatIncidentAssigneeLine,
  formatIncidentDeviceLine,
  formatIncidentLocation,
  formatIncidentReceivedAt,
} from '../../utils/incidentListMeta';
import { formatUnreadMessageBadge } from '../../utils/unreadMessages';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

export function IncidentCard({ incident }: { incident: Incident }) {
  const location = formatIncidentLocation(incident);
  const device = formatIncidentDeviceLine(incident);
  const assigneeLine = formatIncidentAssigneeLine(incident);
  const isActiveWork = incident.status === 'in_progress' || incident.status === 'paused';

  const unreadCount = Number(incident.unread_count) || 0;

  return (
    <Link to={`/incidents/${incident.id}`} className="card block active:bg-gray-50">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium text-gray-900 leading-snug">{incident.title}</p>
          <p className="text-xs text-gray-500">{incident.incident_number}</p>

          {location && (
            <p className="text-sm text-gray-700 truncate" title={location}>
              {location}
            </p>
          )}

          {device && (
            <p className="text-sm text-gray-600 truncate" title={device}>
              {device}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-gray-500">
            <span>Reģistrēts: {formatIncidentReceivedAt(incident.received_at)}</span>
            <span
              className={
                isActiveWork
                  ? 'text-blue-700 font-medium'
                  : incident.status === 'pending' && !incident.assigned_user_name
                    ? 'text-amber-700 font-medium'
                    : undefined
              }
            >
              {assigneeLine}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0">
          {unreadCount > 0 && (
            <span
              className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full font-medium"
              title="Neskatītas ziņas no klienta portāla"
            >
              💬 {formatUnreadMessageBadge(unreadCount)}
            </span>
          )}
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </div>
      </div>
    </Link>
  );
}
