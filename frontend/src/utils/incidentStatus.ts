import type { IncidentStatusConfig } from '../api/incidentStatuses';

export const OPEN_INCIDENT_STATUSES = ['pending', 'in_progress', 'paused'] as const;
export const CLOSED_INCIDENT_STATUSES = ['completed', 'cancelled'] as const;

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Gaida',
  in_progress: 'Darbā',
  paused: 'Pauze',
  completed: 'Izpildīts',
  cancelled: 'Atcelts',
};

export const ALL_INCIDENT_STATUSES = [
  'pending',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
] as const;

export const FALLBACK_INCIDENT_STATUSES: IncidentStatusConfig[] = ALL_INCIDENT_STATUSES.map(
  (code, i) => ({
    id: code,
    code,
    label: INCIDENT_STATUS_LABELS[code] ?? code,
    category: (CLOSED_INCIDENT_STATUSES as readonly string[]).includes(code) ? 'closed' : 'open',
    sort_order: (i + 1) * 10,
    badge_tone:
      code === 'pending'
        ? 'yellow'
        : code === 'in_progress'
          ? 'blue'
          : code === 'paused'
            ? 'gray'
            : code === 'completed'
              ? 'green'
              : 'red',
    sync_unit_status:
      code === 'in_progress' || code === 'paused'
        ? 'repair'
        : code === 'completed' || code === 'cancelled'
          ? 'active'
          : null,
  })
);

export function incidentStatusLabel(code: string, statuses?: IncidentStatusConfig[]): string {
  const fromList = statuses?.find((s) => s.code === code)?.label;
  if (fromList) return fromList;
  return INCIDENT_STATUS_LABELS[code] || code;
}

export function isOpenIncidentStatus(status: string): boolean {
  return (OPEN_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function isClosedIncidentStatus(status: string): boolean {
  return (CLOSED_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export const STATUS_BADGE_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-800',
};

export function badgeClassForStatus(
  code: string,
  statuses?: IncidentStatusConfig[]
): string {
  const tone = statuses?.find((s) => s.code === code)?.badge_tone;
  if (tone && STATUS_BADGE_COLORS[tone]) return STATUS_BADGE_COLORS[tone];
  return STATUS_BADGE_COLORS[code in STATUS_BADGE_COLORS ? code : 'gray'] ?? STATUS_BADGE_COLORS.yellow;
}
