import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { incidentStatusesApi, type IncidentStatusConfig } from '../api/incidentStatuses';
import {
  FALLBACK_INCIDENT_STATUSES,
  incidentStatusLabel,
  isClosedIncidentStatus as isClosedFallback,
} from '../utils/incidentStatus';

export function useIncidentStatuses() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['incident-statuses'],
    queryFn: () => incidentStatusesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const statuses: IncidentStatusConfig[] = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.length > 0 ? rows : FALLBACK_INCIDENT_STATUSES;
  }, [data]);

  const byCode = useMemo(() => new Map(statuses.map((s) => [s.code, s])), [statuses]);

  return {
    statuses,
    byCode,
    isLoading,
    isError,
    label: (code: string) => incidentStatusLabel(code, statuses),
    isClosed: (code: string) => {
      const row = byCode.get(code);
      if (row) return row.category === 'closed';
      return isClosedFallback(code);
    },
    isOpen: (code: string) => {
      const row = byCode.get(code);
      if (row) return row.category === 'open';
      return !isClosedFallback(code);
    },
    openCodes: statuses.filter((s) => s.category === 'open').map((s) => s.code),
    closedCodes: statuses.filter((s) => s.category === 'closed').map((s) => s.code),
  };
}
