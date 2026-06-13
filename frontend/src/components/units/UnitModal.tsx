import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { assetTypesApi } from '../../api/assetTypes';
import {
  UNIT_STATUS_LABELS,
  type Unit,
  type UnitInput,
  type UnitStatus,
} from '../../api/units';
import { newIncidentUrl } from '../../utils/newIncidentUrl';
import { Modal } from '../ui/Modal';

const UNIT_STATUSES: UnitStatus[] = ['active', 'repair', 'decommissioned', 'spare'];

type UnitModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Unit | null;
  onClose: () => void;
  onSave: (data: UnitInput) => Promise<void>;
  canStartIncident?: boolean;
};

export function UnitModal({ open, mode, initial, onClose, onSave, canStartIncident }: UnitModalProps) {
  const [assetTypeId, setAssetTypeId] = useState('');
  const [assetComponentId, setAssetComponentId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [status, setStatus] = useState<UnitStatus>('active');
  const [locationNote, setLocationNote] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => assetTypesApi.list(true),
    enabled: open,
  });

  const assetTypes = useMemo(
    () => (typesData?.data ?? []).filter((t) => t.is_active),
    [typesData]
  );

  const selectedType = assetTypes.find((t) => t.id === assetTypeId);
  const components = useMemo(
    () => (selectedType?.components ?? []).filter((c) => c.is_active),
    [selectedType]
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setAssetTypeId(initial.asset_type_id || '');
      setAssetComponentId(initial.asset_component_id || '');
      setSerialNumber(initial.serial_number);
      setModel(initial.model || '');
      setManufacturer(initial.manufacturer || '');
      setStatus(initial.status);
      setLocationNote(initial.location_note || '');
      setNotes(initial.notes || '');
    } else {
      const defaultType = assetTypes.find((t) => t.code === 'pos') ?? assetTypes[0];
      setAssetTypeId(defaultType?.id || '');
      setAssetComponentId('');
      setSerialNumber('');
      setModel('');
      setManufacturer('');
      setStatus('active');
      setLocationNote('');
      setNotes('');
    }
    setError('');
  }, [open, initial, assetTypes]);

  useEffect(() => {
    if (!assetComponentId) return;
    if (!components.some((c) => c.id === assetComponentId)) {
      setAssetComponentId('');
    }
  }, [assetTypeId, assetComponentId, components]);

  const handleSave = async () => {
    if (!assetTypeId) {
      setError('Izvēlieties aktīva tipu');
      return;
    }
    if (!serialNumber.trim()) {
      setError('Sērijas numurs ir obligāts');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        asset_type_id: assetTypeId,
        asset_component_id: assetComponentId || null,
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

  const showIncidentLink =
    canStartIncident && mode === 'edit' && initial?.object_id && initial.client_id;

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Jauns klienta aktīvs' : 'Klienta aktīvs'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end w-full">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving || typesLoading}
          >
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
          {showIncidentLink && (
            <Link
              to={newIncidentUrl({
                clientId: initial.client_id,
                objectId: initial.object_id,
                unitId: initial.id,
              })}
              className="btn-primary w-full sm:w-auto text-center !bg-emerald-600 hover:!bg-emerald-700 sm:mr-auto"
              onClick={onClose}
            >
              Jauns atgadījums
            </Link>
          )}
        </div>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Tips</label>
          {typesLoading ? (
            <p className="text-sm text-gray-400">Ielādē tipus...</p>
          ) : (
            <select
              className="input-field"
              value={assetTypeId}
              onChange={(e) => {
                setAssetTypeId(e.target.value);
                setAssetComponentId('');
              }}
            >
              <option value="">Izvēlieties tipu...</option>
              {assetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {components.length > 0 && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Apakšsadaļa (neobligāti)</label>
            <select
              className="input-field"
              value={assetComponentId}
              onChange={(e) => setAssetComponentId(e.target.value)}
            >
              <option value="">— Nav norādīta —</option>
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
