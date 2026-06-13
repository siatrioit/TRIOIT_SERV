import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { assetTypesApi, type AssetType, type AssetTypeComponent } from '../../api/assetTypes';
import { useAuthStore } from '../../store/authStore';

export function AssetTypesSetupPage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newComponentNames, setNewComponentNames] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['setup-asset-types'],
    queryFn: () => assetTypesApi.listAdmin(),
    enabled: isAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['setup-asset-types'] });
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
  };

  const createTypeMutation = useMutation({
    mutationFn: () => assetTypesApi.create({ name: newTypeName.trim() }),
    onSuccess: () => {
      setNewTypeName('');
      setError('');
      invalidate();
    },
    onError: (err) => setError(formatError(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      assetTypesApi.update(id, { is_active }),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => assetTypesApi.delete(id),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  const createComponentMutation = useMutation({
    mutationFn: ({ typeId, name }: { typeId: string; name: string }) =>
      assetTypesApi.createComponent(typeId, { name }),
    onSuccess: (_data, vars) => {
      setNewComponentNames((prev) => ({ ...prev, [vars.typeId]: '' }));
      setError('');
      invalidate();
    },
    onError: (err) => setError(formatError(err)),
  });

  const toggleComponentMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      assetTypesApi.updateComponent(id, { is_active }),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (id: string) => assetTypesApi.deleteComponent(id),
    onSuccess: invalidate,
    onError: (err) => setError(formatError(err)),
  });

  if (!isAdmin) {
    return <Navigate to="/setup/users" replace />;
  }

  const types = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-900">Aktīvu tipi</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Tipi tiek izmantoti klienta aktīvos un atgadījumos. Katram tipam var pievienot
          apakšsadaļas (piem., POS kasei — svari, printeris).
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Jauna tipa nosaukums"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={!newTypeName.trim() || createTypeMutation.isPending}
          onClick={() => createTypeMutation.mutate()}
        >
          + Tips
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-6">Ielādē...</p>
      ) : types.length === 0 ? (
        <p className="text-gray-500 text-center py-6">Nav definētu tipu</p>
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <AssetTypeCard
              key={type.id}
              type={type}
              expanded={expandedId === type.id}
              onToggleExpand={() =>
                setExpandedId((id) => (id === type.id ? null : type.id))
              }
              newComponentName={newComponentNames[type.id] ?? ''}
              onNewComponentNameChange={(name) =>
                setNewComponentNames((prev) => ({ ...prev, [type.id]: name }))
              }
              onToggleActive={() =>
                toggleActiveMutation.mutate({
                  id: type.id,
                  is_active: !Boolean(type.is_active),
                })
              }
              onDelete={() => {
                if (window.confirm(`Dzēst tipu „${type.name}”?`)) {
                  deleteTypeMutation.mutate(type.id);
                }
              }}
              onAddComponent={() => {
                const name = (newComponentNames[type.id] ?? '').trim();
                if (!name) return;
                createComponentMutation.mutate({ typeId: type.id, name });
              }}
              onToggleComponent={(component) =>
                toggleComponentMutation.mutate({
                  id: component.id,
                  is_active: !Boolean(component.is_active),
                })
              }
              onDeleteComponent={(component) => {
                if (window.confirm(`Dzēst apakšsadaļu „${component.name}”?`)) {
                  deleteComponentMutation.mutate(component.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatError(err: unknown): string {
  return err instanceof ApiError
    ? err.displayMessage
    : err instanceof Error
      ? err.message
      : 'Darbība neizdevās';
}

type AssetTypeCardProps = {
  type: AssetType;
  expanded: boolean;
  newComponentName: string;
  onToggleExpand: () => void;
  onNewComponentNameChange: (name: string) => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onAddComponent: () => void;
  onToggleComponent: (component: AssetTypeComponent) => void;
  onDeleteComponent: (component: AssetTypeComponent) => void;
};

function AssetTypeCard({
  type,
  expanded,
  newComponentName,
  onToggleExpand,
  onNewComponentNameChange,
  onToggleActive,
  onDelete,
  onAddComponent,
  onToggleComponent,
  onDeleteComponent,
}: AssetTypeCardProps) {
  const components = type.components ?? [];

  return (
    <div className={`card ${!type.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="text-left flex-1 min-w-0"
          onClick={onToggleExpand}
        >
          <p className="font-medium text-gray-900">{type.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Kods: {type.code} · Apakšsadaļas: {components.length}
          </p>
        </button>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700"
            onClick={onToggleActive}
          >
            {type.is_active ? 'Deaktivizēt' : 'Aktivizēt'}
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700"
            onClick={onDelete}
          >
            Dzēst
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <p className="text-sm font-medium text-gray-700">Apakšsadaļas</p>
          {components.length === 0 ? (
            <p className="text-sm text-gray-500">Nav apakšsadaļu</p>
          ) : (
            <ul className="space-y-2">
              {components.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between gap-2 text-sm ${
                    !c.is_active ? 'text-gray-400' : 'text-gray-800'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 rounded bg-gray-100"
                      onClick={() => onToggleComponent(c)}
                    >
                      {c.is_active ? 'Izslēgt' : 'Ieslēgt'}
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700"
                      onClick={() => onDeleteComponent(c)}
                    >
                      Dzēst
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Jauna apakšsadaļa"
              value={newComponentName}
              onChange={(e) => onNewComponentNameChange(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              disabled={!newComponentName.trim()}
              onClick={onAddComponent}
            >
              + Pievienot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
