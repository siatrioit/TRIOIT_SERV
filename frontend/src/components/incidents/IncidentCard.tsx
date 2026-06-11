import { Link } from 'react-router-dom';
import type { Incident } from '../../api/incidents';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

export function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <Link to={`/incidents/${incident.id}`} className="card block active:bg-gray-50">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{incident.title}</p>
          <p className="text-xs text-gray-500 mt-1">{incident.incident_number}</p>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </div>
      </div>
    </Link>
  );
}
