import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentsApi } from '../../api/incidents';
import { ROLE_LABELS, usersApi } from '../../api/users';

type IncidentAssigneeSectionProps = {
  incidentId: string;
  assignedTo?: string | null;
  assignedUserName?: string | null;
  canEdit: boolean;
};

export function IncidentAssigneeSection({
  incidentId,
  assignedTo,
  assignedUserName,
  canEdit,
}: IncidentAssigneeSectionProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(assignedTo ?? '');
  const [error, setError] = useState('');

  const { data: assignableData, isLoading } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: () => usersApi.listAssignable(),
    enabled: canEdit,
  });

  const assignable = assignableData?.data ?? [];

  useEffect(() => {
    setSelectedId(assignedTo ?? '');
  }, [assignedTo]);

  const assignMutation = useMutation({
    mutationFn: (userId: string) => incidentsApi.assign(incidentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-messages', incidentId] });
      setError('');
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Pārvirzīšana neizdevās'
      );
    },
  });

  const handleAssign = () => {
    if (!selectedId || selectedId === assignedTo) return;
    assignMutation.mutate(selectedId);
  };

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-medium text-gray-800">Atbildīgais</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {assignedUserName
            ? assignedUserName
            : 'Nav piešķirts — paziņojumi (drīzumā) dosies visiem'}
        </p>
      </div>

      {canEdit && (
        <div className="space-y-2">
          <select
            className="input-field"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isLoading || assignMutation.isPending}
          >
            <option value="">Izvēlieties darbinieku...</option>
            {assignable.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({ROLE_LABELS[user.role]})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleAssign}
            disabled={
              !selectedId ||
              selectedId === assignedTo ||
              assignMutation.isPending ||
              isLoading
            }
          >
            {assignMutation.isPending ? 'Pārvirza...' : 'Pārvirzīt'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
