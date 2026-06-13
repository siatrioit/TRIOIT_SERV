import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { clientsApi, type Client, type ClientPayload } from '../../api/clients';
import { Modal } from '../../components/ui/Modal';

function roleBadges(c: Client) {
  const tags: string[] = [];
  if (flag(c.is_supplier)) tags.push('Piegādātājs');
  if (flag(c.is_buyer)) tags.push('Pircējs');
  if (flag(c.is_service_client)) tags.push('Serviss');
  return tags;
}

function flag(v: unknown) {
  return v === true || v === 1 || v === '1';
}

export function WarehouseClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-clients', search],
    queryFn: () =>
      clientsApi.list({ search: search || undefined, warehouse: '1', limit: '100' }),
  });

  const clients = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouse-clients'] });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Partneri noliktavai — piegādātāji un pircēji. Ja nav atzīmes „Apkalpojam tehniku”, partners
          netiks rādīts apkalpošanas klientu sarakstā.
        </p>
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0 text-sm shrink-0"
          onClick={() => {
            setError('');
            setModalOpen(true);
          }}
        >
          + Jauns partners
        </button>
      </div>

      <input
        className="input-field"
        placeholder="Meklēt partneri..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-gray-500 card py-6 text-center">Nav partneru</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => {
            const roles = roleBadges(c);
            return (
              <li key={c.id} className="card">
                <Link to={`/clients/${c.id}`} className="block active:bg-gray-50 -m-4 p-4 rounded-2xl">
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.city || '—'}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {roles.map((r) => (
                        <span
                          key={r}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg whitespace-nowrap"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <PartnerModal
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            invalidate();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function PartnerModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [isSupplier, setIsSupplier] = useState(true);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isServiceClient, setIsServiceClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const create = useMutation({
    mutationFn: (payload: ClientPayload) => clientsApi.create(payload),
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setLocalError('Nosaukums ir obligāts');
      return;
    }
    if (!isSupplier && !isBuyer && !isServiceClient) {
      setLocalError('Izvēlieties vismaz vienu lomu');
      return;
    }
    setSaving(true);
    setLocalError('');
    onError('');
    try {
      await create.mutateAsync({
        name: name.trim(),
        client_type: 'company',
        country: 'LV',
        is_supplier: isSupplier,
        is_buyer: isBuyer,
        is_service_client: isServiceClient,
      });
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiError ? e.displayMessage : 'Neizdevās izveidot';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Jauns partners"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Izveidot'}
          </button>
        </>
      }
    >
      {localError && (
        <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{localError}</div>
      )}
      <div className="space-y-3">
        <input
          className="input-field"
          placeholder="Nosaukums *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isSupplier} onChange={(e) => setIsSupplier(e.target.checked)} />
          Piegādātājs (saņemšanas pavadzīmes)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBuyer} onChange={(e) => setIsBuyer(e.target.checked)} />
          Pircējs (izrakstīšanas pavadzīmes)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isServiceClient}
            onChange={(e) => setIsServiceClient(e.target.checked)}
          />
          Apkalpojam tehniku (redzams izsaukumos)
        </label>
      </div>
    </Modal>
  );
}
