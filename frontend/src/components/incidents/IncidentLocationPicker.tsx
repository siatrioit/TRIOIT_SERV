import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients';
import { unitDisplayLabel, unitsApi } from '../../api/units';

export type IncidentLocationValue = {
  clientId: string;
  objectId: string;
  unitId: string;
};

type IncidentLocationPickerProps = {
  value: IncidentLocationValue;
  onChange: (value: IncidentLocationValue) => void;
  requireObject?: boolean;
};

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}

export function IncidentLocationPicker({
  value,
  onChange,
  requireObject = true,
}: IncidentLocationPickerProps) {
  const [clientSearch, setClientSearch] = useState('');

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', 'picker'],
    queryFn: () => clientsApi.list({ limit: '500' }),
  });

  const { data: clientData, isLoading: objectsLoading } = useQuery({
    queryKey: ['client', value.clientId],
    queryFn: () => clientsApi.get(value.clientId),
    enabled: Boolean(value.clientId),
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['object-units', value.clientId, value.objectId],
    queryFn: () => unitsApi.listForObject(value.clientId, value.objectId),
    enabled: Boolean(value.clientId && value.objectId),
  });

  const clients = clientsData?.data ?? [];
  const selectedClient = clients.find((c) => c.id === value.clientId);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const list = sortByName(clients);
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [clients, clientSearch]);

  const activeObjects = useMemo(
    () => sortByName((clientData?.data.objects || []).filter((o) => o.status !== 'closed')),
    [clientData]
  );

  const selectableUnits = useMemo(
    () =>
      (unitsData?.data || []).filter((u) => u.status === 'active' || u.status === 'repair'),
    [unitsData]
  );

  useEffect(() => {
    if (selectedClient) {
      setClientSearch(selectedClient.name);
    }
  }, [selectedClient?.id, selectedClient?.name]);

  useEffect(() => {
    if (!value.clientId || activeObjects.length !== 1) return;
    const only = activeObjects[0];
    if (only.id && value.objectId !== only.id) {
      onChange({ clientId: value.clientId, objectId: only.id, unitId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-select tikai klienta maiņai
  }, [value.clientId, activeObjects.length, activeObjects[0]?.id]);

  const patch = (partial: Partial<IncidentLocationValue>) => {
    onChange({ ...value, ...partial });
  };

  const handleClientPick = (clientId: string, clientName: string) => {
    setClientSearch(clientName);
    patch({ clientId, objectId: '', unitId: '' });
  };

  const handleClientSearchChange = (text: string) => {
    setClientSearch(text);
    if (selectedClient && text !== selectedClient.name) {
      patch({ clientId: '', objectId: '', unitId: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Klients *</label>
        <input
          className="input-field"
          placeholder="Meklēt klientu pēc nosaukuma, pilsētas..."
          value={clientSearch}
          onChange={(e) => handleClientSearchChange(e.target.value)}
          autoComplete="off"
        />
        {clientsLoading ? (
          <p className="text-xs text-gray-400 mt-2">Ielādē klientus...</p>
        ) : !value.clientId && clientSearch.trim() ? (
          <ul className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-sm">
            {filteredClients.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Nav atrasts klients</li>
            ) : (
              filteredClients.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => handleClientPick(c.id, c.name)}
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.city && <span className="text-gray-500"> · {c.city}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : value.clientId && selectedClient ? (
          <p className="text-xs text-green-700 mt-1">Izvēlēts: {selectedClient.name}</p>
        ) : null}
      </div>

      {value.clientId && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Objekts{requireObject && activeObjects.length > 0 ? ' *' : ''}
          </label>
          {objectsLoading ? (
            <p className="text-sm text-gray-400">Ielādē objektus...</p>
          ) : activeObjects.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
              Klientam nav aktīvu objektu — pievienojiet klienta kartē.
            </p>
          ) : (
            <select
              className="input-field"
              value={value.objectId}
              onChange={(e) => patch({ objectId: e.target.value, unitId: '' })}
              required={requireObject && activeObjects.length > 0}
            >
              <option value="">Izvēlieties objektu</option>
              {activeObjects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.city ? ` · ${o.city}` : ''}
                  {o.address ? ` · ${o.address}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {value.objectId && (
        <div>
          <label className="block text-sm font-medium mb-1">Ierīce (neobligāti)</label>
          {unitsLoading ? (
            <p className="text-sm text-gray-400">Ielādē ierīces...</p>
          ) : (
            <>
              <select
                className="input-field"
                value={value.unitId}
                onChange={(e) => patch({ unitId: e.target.value })}
              >
                <option value="">— Nav norādīta —</option>
                {selectableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitDisplayLabel(u)}
                  </option>
                ))}
              </select>
              {selectableUnits.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Šim objektam nav reģistrētu ierīču — var pievienot objekta kartē.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
