import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  unitsApi,
  type Unit,
  type UnitInput,
  type UnitStatus,
  type UnitType,
  unitDisplayLabel,
} from '../../api/units';
import { Modal } from '../ui/Modal';

const UNIT_TYPES: UnitType[] = ['computer', 'pos', 'printer', 'network', 'other'];
const UNIT_STATUSES: UnitStatus[] = ['active', 'repair', 'decommissioned', 'spare'];

type UnitModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Unit | null;
  onClose: () => void;
  onSave: (data: UnitInput) => Promise<void>;
};

function UnitModal({ open, mode, initial, onClose, onSave }: UnitModalProps) {
  const [unitType, setUnitType] = useState<UnitType>('other');
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [status, setStatus] = useState<UnitStatus>('active');
  const [locationNote, setLocationNote] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setUnitType(initial.unit_type);
      setSerialNumber(initial.serial_number);
      setModel(initial.model || '');
      setManufacturer(initial.manufacturer || '');
      setStatus(initial.status);
      setLocationNote(initial.location_note || '');
      setNotes(initial.notes || '');
    } else {
      setUnitType('pos');
      setSerialNumber('');
      setModel('');
      setManufacturer('');
      setStatus('active');
      setLocationNote('');
      setNotes('');
    }
    setError('');
  }, [open, initial]);

  const handleSave = async () => {
    if (!serialNumber.trim()) {
      setError('Sērijas numurs ir obligāts');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        unit_type: unitType,
        serial_number: serialNumber.trim(),
        model: model.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        status,
        location_note: locationNote.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Saglabāšana neizdevās'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Jauna ierīce' : 'Ierīce'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Tips</label>
          <select
            className="input-field"
            value={unitType}
            onChange={(e) => setUnitType(e.target.value as UnitType)}
          >
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {UNIT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <input
          className="input-field"
          placeholder="Sērijas numurs *"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          autoFocus
        />
        <input
          className="input-field"
          placeholder="Modelis"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Ražotājs"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
        />
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Statuss</label>
          <select
            className="input-field"
            value={status}
            onChange={(e) => setStatus(e.target.value as UnitStatus)}
          >
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {UNIT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <input
          className="input-field"
          placeholder="Atrašanās vieta objektā (piem. kasē 2)"
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
        />
        <textarea
          className="input-field min-h-[72px]"
          placeholder="Piezīmes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

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
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Dzēst ierīci „${unitDisplayLabel(unit)}"?`)) return;
    try {
      await unitsApi.deleteForObject(clientId, objectId, unit.id);
      await invalidate();
    } catch (err) {
      alert(err instanceof ApiError ? err.displayMessage : 'Neizdevās dzēst');
    }
  };

  return (
    <section className="card border-gray-200 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-800">Aparatūra / ierīces</h3>
          <p className="text-sm text-gray-500">Datori, POS, printeri u.c. pie šī objekta</p>
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
          Nav reģistrētu ierīču
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
