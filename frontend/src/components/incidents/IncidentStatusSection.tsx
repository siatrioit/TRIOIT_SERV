import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentsApi } from '../../api/incidents';
import {
  ALL_INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  isClosedIncidentStatus,
} from '../../utils/incidentStatus';

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
        isClosedIncidentStatus(selectedStatus) ? resolution.trim() || undefined : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
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
    if (isClosedIncidentStatus(selectedStatus) && !resolution.trim()) {
      setError('Noslēdzot atgadījumu, norādiet risinājumu');
      return;
    }
    statusMutation.mutate();
  };

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-medium text-gray-800">Statuss</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {INCIDENT_STATUS_LABELS[status] || status}
        </p>
      </div>

      {canEdit && (
        <div className="space-y-2">
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={statusMutation.isPending}
          >
            {ALL_INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INCIDENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {isClosedIncidentStatus(selectedStatus) && (
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
              (selectedStatus === status && !isClosedIncidentStatus(selectedStatus))
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
