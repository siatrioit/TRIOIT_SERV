/** Saite uz jaunu atgadījumu ar aizpildītu klientu / objektu / aktīvu */
export function newIncidentUrl(params: {
  clientId: string;
  objectId?: string | null;
  unitId?: string;
}): string {
  const q = new URLSearchParams();
  q.set('clientId', params.clientId);
  if (params.objectId) q.set('objectId', params.objectId);
  if (params.unitId) q.set('unitId', params.unitId);
  return `/incidents/new?${q.toString()}`;
}
