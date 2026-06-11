import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  clientsApi,
  emptyObject,
  sanitizeClientObject,
  type ClientObjectInput,
  type ClientType,
} from '../api/clients';

export function ClientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('company');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [objects, setObjects] = useState<ClientObjectInput[]>([emptyObject(true)]);

  useEffect(() => {
    if (isNew) return;
    clientsApi
      .get(id!)
      .then((res) => {
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
          c.objects?.length
            ? c.objects.map((o) => ({
                ...o,
                is_primary: Boolean(o.is_primary),
              }))
            : [emptyObject(true)]
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Neizdevās ielādēt'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const updateObject = (index: number, patch: Partial<ClientObjectInput>) => {
    setObjects((prev) =>
      prev.map((obj, i) => (i === index ? { ...obj, ...patch } : obj))
    );
  };

  const setPrimaryObject = (index: number) => {
    setObjects((prev) =>
      prev.map((obj, i) => ({ ...obj, is_primary: i === index }))
    );
  };

  const addObject = () => {
    setObjects((prev) => [...prev, emptyObject(prev.length === 0)]);
  };

  const removeObject = (index: number) => {
    setObjects((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((o) => o.is_primary)) next[0].is_primary = true;
      return [...next];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validObjects = objects
      .map(sanitizeClientObject)
      .filter((o) => o.name.length > 0);

    if (validObjects.length === 0) {
      setError('Pievieno vismaz vienu objektu ar nosaukumu');
      return;
    }

    if (!validObjects.some((o) => o.is_primary)) {
      validObjects[0].is_primary = true;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        client_type: clientType,
        phone: phone || undefined,
        email: email || undefined,
        representative: representative || undefined,
        address: address || undefined,
        city: city || undefined,
        postal_code: postalCode || undefined,
        country: 'LV',
        notes: notes || undefined,
        objects: validObjects,
      };

      if (isNew) {
        const res = await clientsApi.create(payload);
        navigate(`/clients/${res.data.id}`, { replace: true });
      } else {
        await clientsApi.update(id!, payload);
        navigate('/clients');
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
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Ielādē...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isNew ? 'Jauns klients' : 'Rediģēt klientu'}
        </h2>
        <Link to="/clients" className="text-primary-600 text-sm font-medium">
          ← Atpakaļ
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <section className="card space-y-4">
        <h3 className="font-medium text-gray-800">Klienta dati</h3>

        <input
          className="input-field"
          placeholder="Nosaukums *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
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
          className="input-field"
          placeholder="Pārstāvis / kontaktpersona"
          value={representative}
          onChange={(e) => setRepresentative(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Juridiskā / galvenā adrese (ne obligāta)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <textarea
          className="input-field min-h-[80px]"
          placeholder="Piezīmes par klientu"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Objekti</h3>
            <p className="text-sm text-gray-500">
              Vietas, kur sniedzat pakalpojumus (1 vai vairākas)
            </p>
          </div>
          <button
            type="button"
            onClick={addObject}
            className="text-primary-600 text-sm font-medium"
          >
            + Objekts
          </button>
        </div>

        {objects.map((obj, index) => (
          <div key={obj.id || index} className="card space-y-3 border-primary-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">
                Objekts {index + 1}
                {obj.is_primary && (
                  <span className="ml-2 text-xs text-primary-600">(galvenais)</span>
                )}
              </span>
              <div className="flex gap-3">
                {!obj.is_primary && (
                  <button
                    type="button"
                    className="text-xs text-primary-600"
                    onClick={() => setPrimaryObject(index)}
                  >
                    Galvenais
                  </button>
                )}
                {objects.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-500"
                    onClick={() => removeObject(index)}
                  >
                    Dzēst
                  </button>
                )}
              </div>
            </div>

            <input
              className="input-field"
              placeholder="Objekta nosaukums * (piem. Veikals Rīgā)"
              value={obj.name}
              onChange={(e) => updateObject(index, { name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Objekta kods (iekšējais)"
              value={obj.object_code || ''}
              onChange={(e) => updateObject(index, { object_code: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Adrese"
              value={obj.address || ''}
              onChange={(e) => updateObject(index, { address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Pilsēta"
                value={obj.city || ''}
                onChange={(e) => updateObject(index, { city: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Indekss"
                value={obj.postal_code || ''}
                onChange={(e) => updateObject(index, { postal_code: e.target.value })}
              />
            </div>
            <input
              className="input-field"
              placeholder="Kontaktpersona objektā"
              value={obj.contact_name || ''}
              onChange={(e) => updateObject(index, { contact_name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Tālrunis objektā"
              value={obj.contact_phone || ''}
              onChange={(e) => updateObject(index, { contact_phone: e.target.value })}
            />
            <input
              type="email"
              className="input-field"
              placeholder="E-pasts objektā"
              value={obj.contact_email || ''}
              onChange={(e) => updateObject(index, { contact_email: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Piekļuves info (kods, darba laiks u.c.)"
              value={obj.access_notes || ''}
              onChange={(e) => updateObject(index, { access_notes: e.target.value })}
            />
            <textarea
              className="input-field min-h-[64px]"
              placeholder="Piezīmes par objektu"
              value={obj.notes || ''}
              onChange={(e) => updateObject(index, { notes: e.target.value })}
            />
          </div>
        ))}
      </section>

      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? 'Saglabā...' : isNew ? 'Izveidot klientu' : 'Saglabāt izmaiņas'}
      </button>
    </form>
  );
}
