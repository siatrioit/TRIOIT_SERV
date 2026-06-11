import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { usePortalAuthStore, type PortalObject } from '../../store/portalAuthStore';

export function PortalNewIncidentPage() {
  const navigate = useNavigate();
  const objects = usePortalAuthStore((s) => s.objects);
  const access = usePortalAuthStore((s) => s.access);
  const user = usePortalAuthStore((s) => s.user);

  const defaultObject = objects.length === 1 ? objects[0] : null;

  const [objectId, setObjectId] = useState(defaultObject?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === objectId),
    [objects, objectId]
  );

  const clientNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const grant of access) {
      map.set(grant.client_id, grant.client_name);
    }
    return map;
  }, [access]);

  const objectsByClient = useMemo(() => {
    const map = new Map<string, PortalObject[]>();
    for (const obj of objects) {
      const list = map.get(obj.client_id) ?? [];
      list.push(obj);
      map.set(obj.client_id, list);
    }
    return map;
  }, [objects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObject) {
      setError('Izvēlieties objektu');
      return;
    }
    if (!title.trim()) {
      setError('Aprakstiet problēmu virsrakstā');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await portalIncidentsApi.create({
        client_id: selectedObject.client_id,
        object_id: selectedObject.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      navigate(`/portal/incidents/${res.data.id}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Neizdevās reģistrēt izsaukumu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Jauns izsaukums</h2>
        <p className="text-sm text-gray-500 mt-1">
          Aprakstiet problēmu — meistars saņems paziņojumu un sazināsies ar jums.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {objects.length > 1 ? (
          <div>
            <label className="block text-sm font-medium mb-1">Objekts *</label>
            <select
              className="input-field"
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              required
            >
              <option value="">Izvēlieties objektu</option>
              {[...objectsByClient.entries()].map(([clientId, clientObjects]) => (
                <optgroup
                  key={clientId}
                  label={clientNames.get(clientId) || 'Objekti'}
                >
                  {clientObjects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                      {obj.city ? ` · ${obj.city}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : selectedObject ? (
          <div className="card bg-emerald-50 border-emerald-100">
            <p className="text-sm text-gray-600">Objekts</p>
            <p className="font-medium">{selectedObject.name}</p>
            {(selectedObject.city || selectedObject.address) && (
              <p className="text-sm text-gray-500">
                {[selectedObject.city, selectedObject.address].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="card text-gray-500 text-sm text-center py-6">
            Nav pieejamu objektu. Sazinieties ar TRIO SERV administratoru.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Problēmas apraksts *</label>
          <input
            className="input-field"
            placeholder="piem. Kase nedarbojas, nav interneta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Papildu informācija</label>
          <textarea
            className="input-field min-h-[120px]"
            placeholder="Kad sākās, kas jau mēģināts, kontakttālrunis uz vietas..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Steidzamība</label>
          <select
            className="input-field"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Var pagaidīt</option>
            <option value="medium">Standarta</option>
            <option value="high">Steidzami</option>
          </select>
        </div>

        {user?.phone && (
          <p className="text-xs text-gray-500">
            Kontakts: {user.phone} — meistars var sazināties uz šo numuru.
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-emerald-600 text-white font-medium rounded-xl px-6 py-3 min-h-[48px] hover:bg-emerald-700 disabled:opacity-50"
          disabled={loading || !selectedObject}
        >
          {loading ? 'Reģistrē...' : 'Izsaukt meistaru'}
        </button>
      </form>
    </div>
  );
}
