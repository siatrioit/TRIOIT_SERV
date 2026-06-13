import type { QueryClient } from '@tanstack/react-query';

export const STAFF_INCIDENT_LIST_KEYS = [
  ['incidents', 'open'],
  ['incidents', 'closed'],
] as const;

export const PORTAL_INCIDENT_LIST_KEYS = [['portal-incidents']] as const;

export function clearIncidentUnreadInLists(
  queryClient: QueryClient,
  incidentId: string,
  variant: 'staff' | 'portal'
) {
  const keys = variant === 'portal' ? PORTAL_INCIDENT_LIST_KEYS : STAFF_INCIDENT_LIST_KEYS;

  for (const queryKey of keys) {
    queryClient.setQueriesData<{ data: Array<{ id: string; unread_count?: number }> }>(
      { queryKey: [...queryKey] },
      (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((item) =>
            item.id === incidentId ? { ...item, unread_count: 0 } : item
          ),
        };
      }
    );
  }
}

export async function invalidateIncidentLists(
  queryClient: QueryClient,
  variant: 'staff' | 'portal'
) {
  const keys = variant === 'portal' ? PORTAL_INCIDENT_LIST_KEYS : STAFF_INCIDENT_LIST_KEYS;
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }))
  );
}
