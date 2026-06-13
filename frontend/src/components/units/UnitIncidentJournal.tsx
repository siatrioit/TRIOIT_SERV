import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '../../api/incidents';
import { unitsApi, type UnitActivityEntry } from '../../api/units';
import { StatusBadge } from '../incidents/StatusBadge';
import { useIncidentStatuses } from '../../hooks/useIncidentStatuses';

const journalShell =
  'min-w-0 w-full overflow-hidden border border-gray-100 rounded-xl bg-gray-50/80 p-3';
const journalList = 'max-h-48 overflow-y-auto overflow-x-hidden space-y-2';

type UnitIncidentJournalProps = {
  unitId: string;
  clientId?: string;
  objectId?: string;
};

type JournalRow = {
  key: string;
  incidentId?: string;
  label: string;
  detail: string;
  at: string;
  status?: string;
  isActive?: boolean;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function parseMetadata(entry: UnitActivityEntry): Record<string, unknown> | null {
  const raw = entry.metadata;
  if (!raw) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function incidentIdFromActivity(entry: UnitActivityEntry): string | null {
  if (entry.action !== 'incident_sync') return null;
  const id = parseMetadata(entry)?.incident_id;
  return typeof id === 'string' ? id : null;
}

export function UnitIncidentJournal({ unitId, clientId, objectId }: UnitIncidentJournalProps) {
  const { isOpen } = useIncidentStatuses();

  const { data: incidentsData, isLoading: incidentsLoading, isError: incidentsError } = useQuery({
    queryKey: ['unit-incidents', unitId],
    queryFn: () => incidentsApi.list({ unit_id: unitId, limit: '50' }),
    enabled: Boolean(unitId),
    refetchOnMount: 'always',
  });

  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({
    queryKey: ['unit-activity', unitId, clientId, objectId],
    queryFn: () =>
      clientId && objectId
        ? unitsApi.listActivityForObject(clientId, objectId, unitId)
        : unitsApi.listActivity(unitId),
    enabled: Boolean(unitId),
    refetchOnMount: 'always',
  });

  const rows = useMemo(() => {
    const incidents = incidentsData?.data ?? [];
    const activity = activityData?.data ?? [];
    const latestSync = new Map<string, { at: string; note: string }>();

    for (const entry of activity) {
      if (entry.action !== 'incident_sync') continue;
      const incidentId = incidentIdFromActivity(entry);
      if (!incidentId) continue;
      const prev = latestSync.get(incidentId);
      if (!prev || new Date(entry.created_at) > new Date(prev.at)) {
        latestSync.set(incidentId, { at: entry.created_at, note: entry.description });
      }
    }

    const list: JournalRow[] = incidents.map((inc) => {
      const sync = latestSync.get(inc.id);
      return {
        key: `incident-${inc.id}`,
        incidentId: inc.id,
        label: inc.title,
        detail: sync ? `${inc.incident_number} · ${sync.note}` : inc.incident_number,
        at: sync?.at ?? inc.received_at,
        status: inc.status,
        isActive: isOpen(inc.status),
      };
    });

    for (const entry of activity) {
      if (entry.action !== 'incident_sync') continue;
      if (incidentIdFromActivity(entry)) continue;
      list.push({
        key: `activity-${entry.id}`,
        label: entry.description,
        detail: [entry.actor_name, formatWhen(entry.created_at)].filter(Boolean).join(' · '),
        at: entry.created_at,
      });
    }

    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [incidentsData, activityData, isOpen]);

  const isLoading = incidentsLoading || activityLoading;
  const isError = incidentsError || activityError;

  return (
    <div className={journalShell}>
      <h4 className="text-sm font-medium text-gray-800 mb-2">Atgadījumu žurnāls</h4>
      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Ielādē...</p>
      ) : isError ? (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          Neizdevās ielādēt atgadījumu žurnālu
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Nav reģistrētu atgadījumu</p>
      ) : (
        <ul className={journalList}>
          {rows.map((row) => (
            <li key={row.key} className="min-w-0 border-b border-gray-100 pb-2 last:border-0">
              {row.incidentId ? (
                <Link
                  to={`/incidents/${row.incidentId}`}
                  className={`block w-full min-w-0 rounded-lg px-2 py-1.5 transition-colors ${
                    row.isActive
                      ? 'bg-amber-50 ring-1 ring-inset ring-amber-200 hover:bg-amber-100/80'
                      : 'hover:bg-white/80'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <JournalRowContent row={row} />
                </Link>
              ) : (
                <div className="min-w-0 px-2 py-1.5 opacity-75">
                  <JournalRowContent row={row} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Atgadījumu ieraksti no darbību žurnāla (incident_sync) */
export function isIncidentActivityEntry(entry: UnitActivityEntry): boolean {
  return entry.action === 'incident_sync';
}

function JournalRowContent({ row }: { row: JournalRow }) {
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium truncate ${
            row.incidentId
              ? row.isActive
                ? 'text-amber-900'
                : 'text-primary-700'
              : 'text-gray-700'
          }`}
        >
          {row.label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {row.detail}
          {row.incidentId ? ` · ${formatWhen(row.at)}` : ''}
        </p>
      </div>
      {row.status && (
        <span className="shrink-0">
          <StatusBadge status={row.status} />
        </span>
      )}
    </div>
  );
}
