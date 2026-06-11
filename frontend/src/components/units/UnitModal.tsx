import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  type Unit,
  type UnitInput,
  type UnitStatus,
  type UnitType,
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

export function UnitModal({ open, mode, initial, onClose, onSave }: UnitModalProps) {
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
      title={mode === 'create' ? 'Jauns klienta aktīvs' : 'Klienta aktīvs'}
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
          placeholder="Atrašanās vieta pie objekta"
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
        />
        <textarea
          className="input-field min-h-[72px]"
          placeholder="Piezīmes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}
