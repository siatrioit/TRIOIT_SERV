import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  UNIT_STATUS_LABELS,
  unitsApi,
  type Unit,
  type UnitInput,
  unitDisplayLabel,
} from '../api/units';
import { CustomerAssetCreateModal } from '../components/units/CustomerAssetCreateModal';
import { UnitModal } from '../components/units/UnitModal';
import { useAuthStore } from '../store/authStore';
import { groupUnitsIntoTree } from '../utils/unitTree';

function UnitMeta({ unit }: { unit: Unit }) {
  return (
    <p className="text-xs text-gray-400 mt-1">
      {UNIT_STATUS_LABELS[unit.status]}
      {unit.manufacturer ? ` · ${unit.manufacturer}` : ''}
      {unit.location_note ? ` · ${unit.location_note}` : ''}
    </p>
  );
}

export function CustomerAssetsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canStartIncident = role === 'admin' || role === 'manager' || role === 'technician';
  const canEdit = canStartIncident;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-assets', debouncedSearch],
    queryFn: () => unitsApi.list({ search: debouncedSearch || undefined, limit: '100' }),
  });

  const assets = data?.data ?? [];

  const groupedByObject = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const unit of assets) {
      const key = `${unit.client_id}:${unit.object_id ?? 'none'}`;
      const list = map.get(key) ?? [];
      list.push(unit);
      map.set(key, list);
    }
    return map;
  }, [assets]);

  const siblingUnits = useMemo(() => {
    if (!editUnit?.object_id) return assets;
    const key = `${editUnit.client_id}:${editUnit.object_id}`;
    return groupedByObject.get(key) ?? assets.filter((u) => u.object_id === editUnit.object_id);
  }, [editUnit, groupedByObject, assets]);

  const displayGroups = useMemo(() => {
    const groups: { key: string; clientId: string; objectId: string | null; tree: ReturnType<typeof groupUnitsIntoTree> }[] = [];
    for (const [key, units] of groupedByObject) {
      const [clientId, objectIdRaw] = key.split(':');
      groups.push({
        key,
        clientId,
        objectId: objectIdRaw === 'none' ? null : objectIdRaw,
        tree: groupUnitsIntoTree(units),
      });
    }
    return groups;
  }, [groupedByObject]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer-assets'] });

  const handleCreate = async (clientId: string, objectId: string, payload: UnitInput) => {
    await unitsApi.createForObject(clientId, objectId, payload);
    await invalidate();
  };

  const handleUpdate = async (payload: UnitInput) => {
    if (!editUnit) return;
    if (editUnit.object_id) {
      await unitsApi.updateForObject(editUnit.client_id, editUnit.object_id, editUnit.id, payload);
    } else {
      await unitsApi.update(editUnit.id, payload);
    }
    await invalidate();
    setEditUnit(null);
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Dzēst aktīvu „${unitDisplayLabel(unit)}"?`)) return;
    try {
      if (unit.object_id) {
        await unitsApi.deleteForObject(unit.client_id, unit.object_id, unit.id);
      } else {
        await unitsApi.delete(unit.id);
      }
      await invalidate();
    } catch (err) {
      alert(err instanceof ApiError ? err.displayMessage : 'Neizdevās dzēst');
    }
  };

  const renderUnitRow = (unit: Unit, isChild: boolean) => (
    <div
      key={unit.id}
      className={`flex justify-between gap-3 items-start ${isChild ? 'pl-6 border-l-2 border-gray-100 ml-2' : ''}`}
    >
      <button
        type="button"
        className="text-left flex-1 min-w-0"
        onClick={() => canEdit && setEditUnit(unit)}
        disabled={!canEdit}
      >
        <p className={`font-medium text-gray-900 ${isChild ? 'text-sm' : ''}`}>
          {isChild ? `↳ ${unitDisplayLabel(unit)}` : unitDisplayLabel(unit)}
        </p>
        {!isChild && (
          <p className="text-sm text-gray-600 mt-0.5">
            <Link
              to={`/clients/${unit.client_id}`}
              className="text-primary-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {unit.client_name || 'Klients'}
            </Link>
            {unit.object_name ? ` · ${unit.object_name}` : ''}
          </p>
        )}
        <UnitMeta unit={unit} />
      </button>
      {canEdit && (
        <button
          type="button"
          className="text-sm text-red-600 shrink-0 px-2 py-1"
          onClick={() => handleDelete(unit)}
        >
          Dzēst
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Klientu aktīvi</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Klientu īpašumā esošā aparatūra, ko apkalpojam (FSM:{' '}
            <span className="italic">customer assets</span>) — POS, datori, printeri u.c. pie
            objektiem. Nav jājauc ar TRIOIT noliktavas precēm.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            + Jauns
          </button>
        )}
      </div>

      <input
        className="input-field"
        placeholder="Meklēt pēc sērijas nr., modeļa, klienta, objekta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : assets.length === 0 ? (
        <div className="card text-center text-gray-500 py-10 space-y-2">
          <p>Nav reģistrētu klientu aktīvu.</p>
          {canEdit && (
            <button
              type="button"
              className="text-primary-600 font-medium text-sm"
              onClick={() => setCreateOpen(true)}
            >
              Pievienot pirmo →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayGroups.map(({ key, tree }) => (
            <div key={key} className="card space-y-3">
              {tree.map(({ unit, children }) => (
                <div key={unit.id} className="space-y-2">
                  {renderUnitRow(unit, false)}
                  {children.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {children.map((child) => renderUnitRow(child, true))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <CustomerAssetCreateModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onSave={handleCreate}
          />
          <UnitModal
            open={Boolean(editUnit)}
            mode="edit"
            initial={editUnit}
            onClose={() => setEditUnit(null)}
            onSave={handleUpdate}
            canStartIncident={canStartIncident}
            clientId={editUnit?.client_id}
            objectId={editUnit?.object_id ?? undefined}
            siblingUnits={siblingUnits}
          />
        </>
      )}
    </div>
  );
}
