import { UNIT_TYPE_LABELS } from '../api/units';



type IncidentUnitFields = {
  unit_serial?: string | null;
  unit_type?: string | null;
  unit_model?: string | null;
  asset_type_name?: string | null;
  asset_component_name?: string | null;
};

export function formatIncidentUnit(incident: IncidentUnitFields): string | null {
  if (!incident.unit_serial) return null;

  const type =
    incident.asset_type_name ||
    (incident.unit_type ? UNIT_TYPE_LABELS[incident.unit_type] || incident.unit_type : null) ||
    'Ierīce';
  const model = incident.unit_model ? ` ${incident.unit_model}` : '';
  const component = incident.asset_component_name ? ` · ${incident.asset_component_name}` : '';
  return `${type}${model}${component} · ${incident.unit_serial}`;
}

