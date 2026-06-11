import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  UNIT_STATUS_LABELS,
  unitsApi,
  type Unit,
  type UnitInput,
  unitDisplayLabel,
} from '../../api/units';
import { UnitModal } from '../units/UnitModal';

type ObjectUnitsSectionProps = {
  clientId: string;
  objectId: string;
  readOnly?: boolean;
};

export function ObjectUnitsSection({ clientId, objectId, readOnly }: ObjectUnitsSectionProps) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<
    { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; unit: Unit }
  >({ open: false });

  const queryKey = ['object-units', clientId, objectId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => unitsApi.listForObject(clientId, objectId),
    enabled: Boolean(clientId && objectId),
  });

  const units = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleSave = async (payload: UnitInput) => {
    if (modal.open && modal.mode === 'edit') {
      await unitsApi.updateForObject(clientId, objectId, modal.unit.id, payload);
    } else {
      await unitsApi.createForObject(clientId, objectId, payload);
    }
    await invalidate();
    queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Dzēst aktīvu „${unitDisplayLabel(unit)}"?`)) return;
    try {
      await unitsApi.deleteForObject(clientId, objectId, unit.id);
      await invalidate();
      queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
    } catch (err) {
      alert(err instanceof ApiError ? err.displayMessage : 'Neizdevās dzēst');
    }
  };

  return (
    <section className="card border-gray-200 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-800">Klienta aktīvi</h3>
          <p className="text-sm text-gray-500">Aparatūra pie šī objekta — ko apkalpojam</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            className="btn-secondary !py-2 !px-4 !min-h-0 text-sm w-full sm:w-auto shrink-0"
            onClick={() => setModal({ open: true, mode: 'create' })}
          >
            + Pievienot
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Ielādē...</p>
      ) : units.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-xl">
          Nav reģistrētu aktīvu
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-1">
          {units.map((unit) => (
            <li key={unit.id} className="px-3 py-3 flex items-start justify-between gap-3">
              <button
                type="button"
                className="text-left flex-1 min-w-0"
                onClick={() => !readOnly && setModal({ open: true, mode: 'edit', unit })}
                disabled={readOnly}
              >
                <p className="font-medium text-gray-900 truncate">{unitDisplayLabel(unit)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {UNIT_STATUS_LABELS[unit.status]}
                  {unit.manufacturer ? ` · ${unit.manufacturer}` : ''}
                  {unit.location_note ? ` · ${unit.location_note}` : ''}
                </p>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="text-sm text-red-600 shrink-0 px-2 py-1"
                  onClick={() => handleDelete(unit)}
                >
                  Dzēst
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <UnitModal
          open={modal.open}
          mode={modal.open && modal.mode === 'edit' ? 'edit' : 'create'}
          initial={modal.open && modal.mode === 'edit' ? modal.unit : null}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </section>
  );
}
