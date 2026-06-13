import { useIncidentStatuses } from '../../hooks/useIncidentStatuses';
import { STATUS_BADGE_COLORS } from '../../utils/incidentStatus';

const CODE_COLORS: Record<string, string> = {
  pending: STATUS_BADGE_COLORS.yellow,
  in_progress: STATUS_BADGE_COLORS.blue,
  paused: STATUS_BADGE_COLORS.gray,
  completed: STATUS_BADGE_COLORS.green,
  cancelled: STATUS_BADGE_COLORS.red,
};

export function StatusBadge({ status }: { status: string }) {
  const { label, statuses } = useIncidentStatuses();
  const config = statuses.find((s) => s.code === status);
  const className =
    (config?.badge_tone && STATUS_BADGE_COLORS[config.badge_tone]) ||
    CODE_COLORS[status] ||
    STATUS_BADGE_COLORS.gray;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
      {label(status)}
    </span>
  );
}
