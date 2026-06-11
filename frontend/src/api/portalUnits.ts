import { portalApi } from './portalClient';
import type { Unit } from './units';

export const portalUnitsApi = {
  listForObject: (objectId: string) =>
    portalApi.get<{ data: Unit[] }>(`/units?object_id=${encodeURIComponent(objectId)}`),
};
