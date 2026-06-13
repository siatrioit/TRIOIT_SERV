import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients';
import { unitsApi, type UnitInput } from '../../api/units';
import { UnitModal } from './UnitModal';
import { Modal } from '../ui/Modal';

type CustomerAssetModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (clientId: string, objectId: string, data: UnitInput) => Promise<void>;
};

export function CustomerAssetCreateModal({ open, onClose, onSave }: CustomerAssetModalProps) {
  const [step, setStep] = useState<'location' | 'asset'>('location');
  const [clientId, setClientId] = useState('');
  const [objectId, setObjectId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [error, setError] = useState('');

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'asset-picker'],
    queryFn: () => clientsApi.list({ limit: '500' }),
    enabled: open,
  });

  const { data: clientDetail } = useQuery({
    queryKey: ['client', clientId, 'objects-for-asset'],
    queryFn: () => clientsApi.get(clientId),
    enabled: open && Boolean(clientId),
  });

  const clients = clientsData?.data ?? [];
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const activeObjects = useMemo(
    () => (clientDetail?.data.objects || []).filter((o) => o.status !== 'closed'),
    [clientDetail]
  );

  const { data: objectUnitsData } = useQuery({
    queryKey: ['object-units', clientId, objectId],
    queryFn: () => unitsApi.listForObject(clientId, objectId),
    enabled: open && step === 'asset' && Boolean(clientId && objectId),
  });

  const siblingUnits = objectUnitsData?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setStep('location');
    setClientId('');
    setObjectId('');
    setClientSearch('');
    setError('');
  }, [open]);

  useEffect(() => {
    setObjectId('');
  }, [clientId]);

  const handleLocationNext = () => {
    if (!clientId) {
      setError('Izvēlieties klientu');
      return;
    }
    if (!objectId) {
      setError('Izvēlieties objektu');
      return;
    }
    setError('');
    setStep('asset');
  };

  const handleAssetSave = async (data: UnitInput) => {
    await onSave(clientId, objectId, data);
    onClose();
  };

  if (!open) return null;

  if (step === 'asset') {
    return (
      <UnitModal
        open
        mode="create"
        onClose={() => setStep('location')}
        onSave={handleAssetSave}
        clientId={clientId}
        objectId={objectId}
        siblingUnits={siblingUnits}
      />
    );
  }

  return (
    <Modal
      open
      title="Jauns klienta aktīvs"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleLocationNext}>
            Tālāk
          </button>
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}
      <p className="text-sm text-gray-500 mb-4">
        Norādiet, pie kura klienta un objekta atrodas apkalpojamā iekārta.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Klients *</label>
          <input
            className="input-field"
            placeholder="Meklēt klientu..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              if (clientId) setClientId('');
            }}
          />
          {!clientId && clientSearch.trim() && (
            <ul className="mt-2 max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y">
              {filteredClients.slice(0, 15).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      setClientId(c.id);
                      setClientSearch(c.name);
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {clientId && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Objekts *</label>
            {activeObjects.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                Klientam nav aktīvu objektu — vispirms pievienojiet objektu klienta kartē.
              </p>
            ) : (
              <select
                className="input-field"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
              >
                <option value="">Izvēlieties objektu</option>
                {activeObjects.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.city ? ` · ${o.city}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
