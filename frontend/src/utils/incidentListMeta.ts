import type { Incident } from '../api/incidents';
import { formatIncidentUnit } from './incidentUnit';

export function formatIncidentReceivedAt(value: string): string {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatIncidentLocation(incident: Pick<Incident, 'client_name' | 'object_name'>): string | null {
  const parts = [incident.client_name, incident.object_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatIncidentAssigneeLine(
  incident: Pick<Incident, 'status' | 'assigned_user_name'>
): string {
  const name = incident.assigned_user_name?.trim();

  switch (incident.status) {
    case 'in_progress':
      return name ? `Darbā: ${name}` : 'Darbā (nav piešķirts meistars)';
    case 'paused':
      return name ? `Pauze · ${name}` : 'Pauze';
    case 'pending':
      return name ? `Piešķirts: ${name}` : 'Gaida piešķiršanu';
    case 'completed':
      return name ? `Izpildīja: ${name}` : 'Izpildīts';
    case 'cancelled':
      return name ? `Atcelts · ${name}` : 'Atcelts';
    default:
      return name ? `Meistars: ${name}` : 'Nav piešķirts meistars';
  }
}

export function formatIncidentDeviceLine(incident: Incident): string | null {
  return formatIncidentUnit(incident);
}
