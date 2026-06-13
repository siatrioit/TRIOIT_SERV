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
  unitDisplayLabel,
} from '../../api/units';
import { newIncidentUrl } from '../../utils/newIncidentUrl';
import { UnitActivityLog } from './UnitActivityLog';
import { Modal } from '../ui/Modal';

const UNIT_STATUSES: UnitStatus[] = ['active', 'repair', 'decommissioned', 'spare'];

type UnitKind = 'main' | 'sub';

type UnitModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Unit | null;
  onClose: () => void;
  onSave: (data: UnitInput) => Promise<void>;
  canStartIncident?: boolean;
  clientId?: string;
  objectId?: string;
  siblingUnits?: Unit[];
  defaultParentId?: string | null;
  forceSubAsset?: boolean;
};

export function UnitModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  canStartIncident,
  clientId,
  objectId,
  siblingUnits = [],
  defaultParentId,
  forceSubAsset,
}: UnitModalProps) {
  const [unitKind, setUnitKind] = useState<UnitKind>('main');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [parentUnitId, setParentUnitId] = useState('');
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

  const mainUnits = useMemo(
    () => siblingUnits.filter((u) => !u.parent_unit_id && u.id !== initial?.id),
    [siblingUnits, initial?.id]
  );

  const selectedParent = mainUnits.find((u) => u.id === parentUnitId);
  const parentType = assetTypes.find(
    (t) => t.id === (selectedParent?.asset_type_id || '')
  );
  const subComponents = useMemo(
    () => (parentType?.components ?? []).filter((c) => c.is_active),
    [parentType]
  );

  useEffect(() => {
    if (!open) return;

    if (initial) {
      const isSub = Boolean(initial.parent_unit_id);
      setUnitKind(isSub ? 'sub' : 'main');
      setAssetTypeId(initial.asset_type_id || '');
      setParentUnitId(initial.parent_unit_id || '');
      setAssetComponentId(initial.asset_component_id || '');
      setSerialNumber(initial.serial_number);
      setModel(initial.model || '');
      setManufacturer(initial.manufacturer || '');
      setStatus(initial.status);
      setLocationNote(initial.location_note || '');
      setNotes(initial.notes || '');
    } else {
      const isSub = forceSubAsset || Boolean(defaultParentId);
      setUnitKind(isSub ? 'sub' : 'main');
      setParentUnitId(defaultParentId || '');
      setAssetComponentId('');
      const defaultType = assetTypes.find((t) => t.code === 'pos') ?? assetTypes[0];
      setAssetTypeId(defaultType?.id || '');
      setSerialNumber('');
      setModel('');
      setManufacturer('');
      setStatus('active');
      setLocationNote('');
      setNotes('');
    }
    setError('');
  }, [open, initial, assetTypes, defaultParentId, forceSubAsset]);

  useEffect(() => {
    if (unitKind !== 'sub' || !assetComponentId) return;
    if (!subComponents.some((c) => c.id === assetComponentId)) {
      setAssetComponentId('');
    }
  }, [parentUnitId, assetComponentId, subComponents, unitKind]);

  const handleSave = async () => {
    if (unitKind === 'sub') {
      if (!parentUnitId) {
        setError('Izvēlieties galveno aktīvu');
        return;
      }
      if (!assetComponentId) {
        setError('Izvēlieties apakšsadaļu');
        return;
      }
    } else if (!assetTypeId) {
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
      const payload: UnitInput = {
        serial_number: serialNumber.trim(),
        model: model.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        status,
        location_note: locationNote.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (unitKind === 'sub') {
        payload.parent_unit_id = parentUnitId;
        payload.asset_component_id = assetComponentId;
      } else {
        payload.asset_type_id = assetTypeId;
        payload.parent_unit_id = null;
        payload.asset_component_id = null;
      }

      await onSave(payload);
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

  const title =
    mode === 'create'
      ? unitKind === 'sub'
        ? 'Jauns apakšaktīvs'
        : 'Jauns galvenais aktīvs'
      : unitKind === 'sub'
        ? 'Apakšaktīvs'
        : 'Galvenais aktīvs';

  return (
    <Modal
      open={open}
      title={title}
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
        {mode === 'create' && !forceSubAsset && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Aktīva veids</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border ${
                  unitKind === 'main'
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 text-gray-600'
                }`}
                onClick={() => setUnitKind('main')}
              >
                Galvenais
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border ${
                  unitKind === 'sub'
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 text-gray-600'
                }`}
                onClick={() => setUnitKind('sub')}
                disabled={mainUnits.length === 0}
              >
                Apakšaktīvs
              </button>
            </div>
          </div>
        )}

        {unitKind === 'sub' ? (
          <>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Galvenais aktīvs *</label>
              <select
                className="input-field"
                value={parentUnitId}
                onChange={(e) => {
                  setParentUnitId(e.target.value);
                  setAssetComponentId('');
                }}
              >
                <option value="">Izvēlieties galveno aktīvu...</option>
                {mainUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitDisplayLabel(u)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Var pārvietot uz citu galveno aktīvu, mainot izvēli.
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Apakšsadaļa *</label>
              {subComponents.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                  Galvenajam aktīvam nav definētu apakšsadaļu — pievienojiet tās Iestatījumos.
                </p>
              ) : (
                <select
                  className="input-field"
                  value={assetComponentId}
                  onChange={(e) => setAssetComponentId(e.target.value)}
                >
                  <option value="">Izvēlieties apakšsadaļu...</option>
                  {subComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Tips *</label>
            {typesLoading ? (
              <p className="text-sm text-gray-400">Ielādē tipus...</p>
            ) : (
              <select
                className="input-field"
                value={assetTypeId}
                onChange={(e) => setAssetTypeId(e.target.value)}
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

        {mode === 'edit' && initial && (
          <UnitActivityLog
            unitId={initial.id}
            clientId={clientId ?? initial.client_id}
            objectId={objectId ?? initial.object_id ?? undefined}
          />
        )}
      </div>
    </Modal>
  );
}
