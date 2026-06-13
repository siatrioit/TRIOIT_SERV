import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { portalUnitsApi } from '../../api/portalUnits';
import { unitDisplayLabel } from '../../api/units';
import { AssetComponentPicker } from '../../components/incidents/AssetComponentPicker';
import { usePortalAuthStore, type PortalObject } from '../../store/portalAuthStore';
import { portalUserCanWrite } from '../../utils/portalPermissions';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}

export function PortalNewIncidentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const objects = usePortalAuthStore((s) => s.objects);
  const access = usePortalAuthStore((s) => s.access);
  const user = usePortalAuthStore((s) => s.user);

  if (!portalUserCanWrite(access)) {
    return <Navigate to="/portal" replace />;
  }

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const grant of access) {
      map.set(grant.client_id, grant.client_name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'lv')
    );
  }, [access]);

  const [clientId, setClientId] = useState('');
  const [objectId, setObjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [assetComponentId, setAssetComponentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredObjects = useMemo(
    () => sortByName(objects.filter((o) => o.client_id === clientId)),
    [objects, clientId]
  );

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === objectId),
    [objects, objectId]
  );

  const { data: unitsData } = useQuery({
    queryKey: ['portal-units', objectId],
    queryFn: () => portalUnitsApi.listForObject(objectId),
    enabled: Boolean(objectId),
  });

  const units = unitsData?.data ?? [];
  const selectedUnit = units.find((u) => u.id === unitId);

  useEffect(() => {
    if (clients.length === 1) setClientId(clients[0].id);
  }, [clients]);

  useEffect(() => {
    setObjectId('');
    setUnitId('');
  }, [clientId]);

  useEffect(() => {
    setUnitId('');
    setAssetComponentId('');
  }, [objectId]);

  useEffect(() => {
    setAssetComponentId('');
  }, [unitId]);

  useEffect(() => {
    if (filteredObjects.length === 1 && filteredObjects[0].id) {
      setObjectId(filteredObjects[0].id);
    }
  }, [filteredObjects]);

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
        unit_id: unitId || undefined,
        asset_component_id: assetComponentId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      await queryClient.invalidateQueries({ queryKey: ['portal-incidents'] });
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

  const showClientPicker = clients.length > 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Jauns izsaukums</h2>
        <p className="text-sm text-gray-500 mt-1">
          Izvēlieties objektu un ierīci, ja zināma — tad aprakstiet problēmu.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {showClientPicker && (
          <div>
            <label className="block text-sm font-medium mb-1">Klients *</label>
            <select
              className="input-field"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Izvēlieties klientu</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(clientId || !showClientPicker) && (
          <div>
            <label className="block text-sm font-medium mb-1">Objekts *</label>
            {filteredObjects.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                Nav pieejamu objektu.
              </p>
            ) : filteredObjects.length === 1 && selectedObject ? (
              <div className="card bg-emerald-50 border-emerald-100">
                <p className="font-medium">{selectedObject.name}</p>
                {(selectedObject.city || selectedObject.address) && (
                  <p className="text-sm text-gray-500">
                    {[selectedObject.city, selectedObject.address].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <select
                className="input-field"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                required
              >
                <option value="">Izvēlieties objektu</option>
                {filteredObjects.map((obj: PortalObject) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                    {obj.city ? ` · ${obj.city}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {objectId && (
          <div>
            <label className="block text-sm font-medium mb-1">Ierīce (neobligāti)</label>
            <select
              className="input-field"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">— Nav norādīta —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitDisplayLabel(u)}
                </option>
              ))}
            </select>
            {units.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Šim objektam nav reģistrētu ierīču.
              </p>
            )}
          </div>
        )}

        {unitId && (
          <AssetComponentPicker
            unit={selectedUnit}
            value={assetComponentId}
            onChange={setAssetComponentId}
          />
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
            placeholder="Kad sākās, kas jau mēģināts..."
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
