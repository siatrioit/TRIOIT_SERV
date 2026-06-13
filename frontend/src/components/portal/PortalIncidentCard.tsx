import { Link } from 'react-router-dom';
import type { PortalIncident } from '../../api/portalIncidents';
import { formatUnreadMessageBadge } from '../../utils/unreadMessages';
import { PriorityBadge } from '../incidents/PriorityBadge';
import { StatusBadge } from '../incidents/StatusBadge';

export function PortalIncidentCard({ incident }: { incident: PortalIncident }) {
  const unreadMessages = incident.unread_count ?? 0;

  return (
    <Link
      to={`/portal/incidents/${incident.id}`}
      className="card block active:bg-gray-50 transition-colors"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{incident.title}</p>
          <p className="text-xs text-gray-500 mt-1">{incident.incident_number}</p>
          {incident.object_name && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{incident.object_name}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          {unreadMessages > 0 && (
            <span
              className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium"
              title="Neskatītas ziņas saziņā ar meistaru"
            >
              💬 {formatUnreadMessageBadge(unreadMessages)}
            </span>
          )}
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </div>
      </div>
    </Link>
  );
}
