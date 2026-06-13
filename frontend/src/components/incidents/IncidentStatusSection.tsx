import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentsApi } from '../../api/incidents';
import { useIncidentStatuses } from '../../hooks/useIncidentStatuses';

type IncidentStatusSectionProps = {
  incidentId: string;
  status: string;
  canEdit: boolean;
};

export function IncidentStatusSection({
  incidentId,
  status,
  canEdit,
}: IncidentStatusSectionProps) {
  const queryClient = useQueryClient();
  const { statuses, label, isClosed } = useIncidentStatuses();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  const statusMutation = useMutation({
    mutationFn: () =>
      incidentsApi.updateStatus(
        incidentId,
        selectedStatus,
        isClosed(selectedStatus) ? resolution.trim() || undefined : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['unit-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
      queryClient.invalidateQueries({ queryKey: ['unit-activity'] });
      setError('');
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Statusa maiņa neizdevās'
      );
    },
  });

  const handleSave = () => {
    if (selectedStatus === status && !resolution.trim()) return;
    if (isClosed(selectedStatus) && !resolution.trim()) {
      setError('Noslēdzot atgadījumu, norādiet risinājumu');
      return;
    }
    statusMutation.mutate();
  };

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-medium text-gray-800">Statuss</h3>
        <p className="text-sm text-gray-500 mt-0.5">{label(status)}</p>
      </div>

      {canEdit && (
        <div className="space-y-2">
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={statusMutation.isPending}
          >
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>

          {isClosed(selectedStatus) && (
            <textarea
              className="input-field min-h-[72px]"
              placeholder="Risinājums / apraksts (obligāts noslēdzot)"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
            />
          )}

          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleSave}
            disabled={
              statusMutation.isPending ||
              (selectedStatus === status && !isClosed(selectedStatus))
            }
          >
            {statusMutation.isPending ? 'Saglabā...' : 'Mainīt statusu'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
