import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  BADGE_TONE_OPTIONS,
  UNIT_STATUS_OPTIONS,
  incidentStatusesApi,
  type IncidentStatusCategory,
  type IncidentStatusConfig,
  type UnitStatusCode,
} from '../../api/incidentStatuses';
import { useAuthStore } from '../../store/authStore';

function formatError(err: unknown) {
  return err instanceof ApiError ? err.displayMessage : 'Kļūda';
}

export function IncidentStatusesSetupPage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<IncidentStatusCategory>('open');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['setup-incident-statuses'],
    queryFn: () => incidentStatusesApi.listAdmin(),
    enabled: isAdmin,
  });

  const statuses = data?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['setup-incident-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['incident-statuses'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      incidentStatusesApi.create({ label: newLabel.trim(), category: newCategory }),
    onSuccess: () => {
      setNewLabel('');
      setError('');
      invalidate();
    },
    onError: (err) => setError(formatError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof incidentStatusesApi.update>[1];
    }) => incidentStatusesApi.update(id, patch),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentStatusesApi.delete(id),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  if (!isAdmin) return <Navigate to="/setup/users" replace />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-800">Atgadījumu statusi</h3>
        <p className="text-sm text-gray-500 mt-1">
          Pielāgojami statusi un saite ar aktīva statusu (automātiska sinhronizācija).
        </p>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

      <div className="card space-y-2">
        <p className="text-sm font-medium text-gray-700">Jauns statuss</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input-field flex-1"
            placeholder="Nosaukums, piem. Gaida apstiprinājumu"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <select
            className="input-field sm:w-40"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as IncidentStatusCategory)}
          >
            <option value="open">Atvērts</option>
            <option value="closed">Slēgts</option>
          </select>
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0"
            disabled={!newLabel.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            + Pievienot
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : (
        <ul className="space-y-3">
          {statuses.map((row) => (
            <StatusRow
              key={row.id}
              row={row}
              saving={updateMutation.isPending}
              onSave={(patch) => updateMutation.mutate({ id: row.id, patch })}
              onDelete={() => {
                if (confirm(`Dzēst statusu „${row.label}"?`)) deleteMutation.mutate(row.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusRow({
  row,
  saving,
  onSave,
  onDelete,
}: {
  row: IncidentStatusConfig;
  saving: boolean;
  onSave: (patch: Parameters<typeof incidentStatusesApi.update>[1]) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [category, setCategory] = useState(row.category);
  const [badgeTone, setBadgeTone] = useState(row.badge_tone ?? 'gray');
  const [syncUnit, setSyncUnit] = useState<UnitStatusCode | ''>(row.sync_unit_status ?? '');
  const [active, setActive] = useState(Boolean(row.is_active ?? true));

  useEffect(() => {
    setLabel(row.label);
    setCategory(row.category);
    setBadgeTone(row.badge_tone ?? 'gray');
    setSyncUnit(row.sync_unit_status ?? '');
    setActive(Boolean(row.is_active ?? true));
  }, [row.id, row.label, row.category, row.badge_tone, row.sync_unit_status, row.is_active]);

  const dirty =
    label !== row.label ||
    category !== row.category ||
    badgeTone !== (row.badge_tone ?? 'gray') ||
    (syncUnit || null) !== (row.sync_unit_status ?? null) ||
    active !== Boolean(row.is_active ?? true);

  return (
    <li className="card space-y-3">
      <div className="flex justify-between gap-2 items-start">
        <div>
          <p className="text-xs text-gray-400 font-mono">{row.code}</p>
          <p className="text-sm text-gray-500">
            {category === 'open' ? 'Atvērts' : 'Slēgts'}
            {!active && ' · Deaktivizēts'}
          </p>
        </div>
        <button type="button" className="text-sm text-red-600 shrink-0" onClick={onDelete}>
          Dzēst
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="input-field sm:col-span-2"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nosaukums"
        />
        <select
          className="input-field"
          value={category}
          onChange={(e) => setCategory(e.target.value as IncidentStatusCategory)}
        >
          <option value="open">Atvērts</option>
          <option value="closed">Slēgts</option>
        </select>
        <select
          className="input-field"
          value={badgeTone}
          onChange={(e) => setBadgeTone(e.target.value)}
        >
          {BADGE_TONE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="input-field sm:col-span-2"
          value={syncUnit}
          onChange={(e) => setSyncUnit(e.target.value as UnitStatusCode | '')}
        >
          <option value="">— Nesinhronizēt aktīva statusu —</option>
          {UNIT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Aktīvs → {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aktīvs (redzams izvēlnēs)
        </label>
      </div>

      {dirty && (
        <button
          type="button"
          className="btn-secondary !py-2 !px-4 !min-h-0 text-sm"
          disabled={saving || !label.trim()}
          onClick={() =>
            onSave({
              label: label.trim(),
              category,
              badge_tone: badgeTone,
              sync_unit_status: syncUnit || null,
              is_active: active,
            })
          }
        >
          {saving ? 'Saglabā...' : 'Saglabāt'}
        </button>
      )}
    </li>
  );
}
