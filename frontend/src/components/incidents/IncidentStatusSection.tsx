import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentsApi } from '../../api/incidents';
import { useIncidentStatuses } from '../../hooks/useIncidentStatuses';

type IncidentStatusSectionProps = {
  incidentId: string;
  status: string;
  savedResolution?: string | null;
  canEdit: boolean;
};

export function IncidentStatusSection({
  incidentId,
  status,
  savedResolution,
  canEdit,
}: IncidentStatusSectionProps) {
  const queryClient = useQueryClient();
  const { statuses, label, isClosed } = useIncidentStatuses();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [draftResolution, setDraftResolution] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedStatus(status);
    setDraftResolution('');
    setError('');
  }, [status, savedResolution]);

  const isDirty = selectedStatus !== status;
  const showResolutionInput = isDirty && isClosed(selectedStatus);
  const showSavedResolution = isClosed(status) && !isDirty && Boolean(savedResolution?.trim());
  const canSave =
    isDirty && (!isClosed(selectedStatus) || draftResolution.trim().length > 0);

  const statusMutation = useMutation({
    mutationFn: () =>
      incidentsApi.updateStatus(
        incidentId,
        selectedStatus,
        isClosed(selectedStatus) ? draftResolution.trim() : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-activity', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-completion', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['unit-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
      queryClient.invalidateQueries({ queryKey: ['object-units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-activity'] });
      setDraftResolution('');
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

  const handleStatusChange = (nextStatus: string) => {
    setSelectedStatus(nextStatus);
    setError('');
    if (isClosed(nextStatus) && !isClosed(status)) {
      setDraftResolution('');
    } else if (isClosed(nextStatus)) {
      setDraftResolution(savedResolution?.trim() ?? '');
    } else {
      setDraftResolution('');
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isClosed(selectedStatus) && !draftResolution.trim()) {
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

      {showSavedResolution && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-3 space-y-1 text-sm">
          <p className="font-medium text-green-900">Risinājums</p>
          <p className="text-green-900 whitespace-pre-wrap">{savedResolution}</p>
        </div>
      )}

      {canEdit && (
        <div className="space-y-2">
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusMutation.isPending}
          >
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>

          {showResolutionInput && (
            <textarea
              className="input-field min-h-[72px]"
              placeholder="Risinājums / apraksts (obligāts noslēdzot)"
              value={draftResolution}
              onChange={(e) => setDraftResolution(e.target.value)}
              rows={3}
            />
          )}

          <button
            type="button"
            className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={statusMutation.isPending || !canSave}
          >
            {statusMutation.isPending ? 'Saglabā...' : 'Mainīt statusu'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
