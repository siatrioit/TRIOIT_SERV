import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  clientsApi,
  type ClientObjectInput,
  type ClientType,
} from '../api/clients';
import { ClientObjectList } from '../components/clients/ClientObjectList';
import { ClientObjectModal } from '../components/clients/ClientObjectModal';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; object: ClientObjectInput };

export function ClientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [savingClient, setSavingClient] = useState(false);
  const [error, setError] = useState('');
  const [clientMessage, setClientMessage] = useState('');

  const [name, setName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('company');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [objects, setObjects] = useState<ClientObjectInput[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false });

  const clientId = isNew ? null : id!;

  const loadClient = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await clientsApi.get(clientId);
      const c = res.data;
      setName(c.name);
      setClientType(c.client_type);
      setPhone(c.phone || '');
      setEmail(c.email || '');
      setRepresentative(c.representative || '');
      setAddress(c.address || '');
      setCity(c.city || '');
      setPostalCode(c.postal_code || '');
      setNotes(c.notes || '');
      setObjects(
        (c.objects || []).map((o) => ({
          ...o,
          is_primary: Boolean(o.is_primary),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Neizdevās ielādēt');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!isNew) loadClient();
  }, [isNew, loadClient]);

  const clientPayload = () => ({
    name: name.trim(),
    client_type: clientType,
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    representative: representative.trim() || undefined,
    address: address.trim() || undefined,
    city: city.trim() || undefined,
    postal_code: postalCode.trim() || undefined,
    country: 'LV' as const,
    notes: notes.trim() || undefined,
  });

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setClientMessage('');
    if (!name.trim()) {
      setError('Klienta nosaukums ir obligāts');
      return;
    }

    setSavingClient(true);
    try {
      if (isNew) {
        const res = await clientsApi.create(clientPayload());
        navigate(`/clients/${res.data.id}`, { replace: true });
      } else {
        await clientsApi.update(clientId!, clientPayload());
        setClientMessage('Klienta dati saglabāti');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Saglabāšana neizdevās'
      );
    } finally {
      setSavingClient(false);
    }
  };

  const reloadObjects = async () => {
    if (!clientId) return;
    const res = await clientsApi.get(clientId);
    setObjects(
      (res.data.objects || []).map((o) => ({
        ...o,
        is_primary: Boolean(o.is_primary),
      }))
    );
  };

  const handleSaveObject = async (data: ClientObjectInput) => {
    if (!clientId) return;
    if (modal.open && modal.mode === 'edit' && modal.object.id) {
      await clientsApi.updateObject(clientId, modal.object.id, data);
    } else {
      await clientsApi.createObject(clientId, data);
    }
    await reloadObjects();
  };

  const handleDeleteObject = async () => {
    if (!clientId || !modal.open || modal.mode !== 'edit' || !modal.object.id) return;
    await clientsApi.deleteObject(clientId, modal.object.id);
    await reloadObjects();
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Ielādē...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {isNew ? 'Jauns klients' : name || 'Klienta karte'}
        </h2>
        <Link to="/clients" className="text-primary-600 text-sm font-medium shrink-0">
          ← Klienti
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}
      {clientMessage && (
        <div className="bg-green-50 text-green-800 px-4 py-3 rounded-xl text-sm">
          {clientMessage}
        </div>
      )}

      <form onSubmit={handleSaveClient} className="card space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-4">
        <h3 className="font-medium text-gray-800 lg:col-span-2">Klienta dati</h3>

        <input
          className="input-field lg:col-span-2"
          placeholder="Nosaukums *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              clientType === 'company'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600'
            }`}
            onClick={() => setClientType('company')}
          >
            Uzņēmums
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              clientType === 'private'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600'
            }`}
            onClick={() => setClientType('private')}
          >
            Privātpersona
          </button>
        </div>

        <input
          className="input-field"
          placeholder="Telefons"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="email"
          className="input-field"
          placeholder="E-pasts"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input-field lg:col-span-2"
          placeholder="Pārstāvis / kontaktpersona"
          value={representative}
          onChange={(e) => setRepresentative(e.target.value)}
        />
        <input
          className="input-field lg:col-span-2"
          placeholder="Juridiskā / galvenā adrese (ne obligāta)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Pilsēta"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Indekss"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <textarea
          className="input-field min-h-[80px] lg:col-span-2"
          placeholder="Piezīmes par klientu"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="lg:col-span-2 pt-1">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={savingClient}>
            {savingClient ? 'Saglabā...' : isNew ? 'Izveidot klientu' : 'Saglabāt klienta datus'}
          </button>
        </div>
      </form>

      {!isNew && (
        <ClientObjectList
          objects={objects}
          disabled={!clientId}
          onAdd={() => setModal({ open: true, mode: 'create' })}
          onOpen={(object) => setModal({ open: true, mode: 'edit', object })}
        />
      )}

      {isNew && (
        <div className="card text-sm text-gray-500 text-center py-6">
          Pēc klienta izveides šeit parādīsies objektu saraksts — katru varēs pievienot atsevišķi.
        </div>
      )}

      <ClientObjectModal
        open={modal.open}
        mode={modal.open && modal.mode === 'edit' ? 'edit' : 'create'}
        initial={modal.open && modal.mode === 'edit' ? modal.object : null}
        onClose={() => setModal({ open: false })}
        onSave={handleSaveObject}
        onDelete={
          modal.open && modal.mode === 'edit' && modal.object.id
            ? handleDeleteObject
            : undefined
        }
      />
    </div>
  );
}
