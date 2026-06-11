import { UNIT_TYPE_LABELS } from '../api/units';

type IncidentUnitFields = {
  unit_serial?: string | null;
  unit_type?: string | null;
  unit_model?: string | null;
};

export function formatIncidentUnit(incident: IncidentUnitFields): string | null {
  if (!incident.unit_serial) return null;
  const type = incident.unit_type
    ? UNIT_TYPE_LABELS[incident.unit_type as keyof typeof UNIT_TYPE_LABELS] || incident.unit_type
    : 'Ierīce';
  const model = incident.unit_model ? ` ${incident.unit_model}` : '';
  return `${type}${model} · ${incident.unit_serial}`;
}
