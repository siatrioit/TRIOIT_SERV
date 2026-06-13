import { UNIT_STATUS_LABELS, type UnitStatus } from '../../api/units';

const STATUS_STYLES: Record<UnitStatus, string> = {
  active: 'bg-green-100 text-green-800',
  repair: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  decommissioned: 'bg-gray-100 text-gray-600',
  spare: 'bg-blue-100 text-blue-800',
};

type UnitStatusBadgeProps = {
  status: UnitStatus;
  openIncidentCount?: number;
  compact?: boolean;
};

export function UnitStatusBadge({ status, openIncidentCount, compact }: UnitStatusBadgeProps) {
  const count = Number(openIncidentCount ?? 0);
  return (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? '' : 'mt-1'}`}>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] || STATUS_STYLES.active}`}
      >
        {UNIT_STATUS_LABELS[status] || status}
      </span>
      {count > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-900">
          {count} atgadīj.
        </span>
      )}
    </div>
  );
}
