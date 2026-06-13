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

export function isOpenIncidentStatus(status: string): boolean {
  return (OPEN_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function isClosedIncidentStatus(status: string): boolean {
  return (CLOSED_INCIDENT_STATUSES as readonly string[]).includes(status);
}
