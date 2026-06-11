import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  WORK_TYPE_LABELS,
  formatDuration,
  incidentWorkApi,
  todayIsoDate,
  type WorkType,
} from '../../api/incidentWork';
import { Modal } from '../ui/Modal';

type Props = {
  incidentId: string;
  canEdit: boolean;
  incidentClosed: boolean;
};

const WORK_TYPES = Object.keys(WORK_TYPE_LABELS) as WorkType[];

export function IncidentWorkLogSection({ incidentId, canEdit, incidentClosed }: Props) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [workDate, setWorkDate] = useState(todayIsoDate());
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<WorkType>('remonts');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['incident-work-logs', incidentId],
    queryFn: () => incidentWorkApi.listWorkLogs(incidentId),
  });

  const logs = data?.data ?? [];
  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incident-work-logs', incidentId] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentWorkApi.deleteWorkLog(incidentId, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setWorkDate(todayIsoDate());
    setHours('0');
    setMinutes('30');
    setDescription('');
    setWorkType('remonts');
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const duration = h * 60 + m;
    if (duration < 1) {
      setError('Norādiet laiku (vismaz 1 min)');
      return;
    }
    if (!description.trim()) {
      setError('Aprakstiet paveikto darbu');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await incidentWorkApi.addWorkLog(incidentId, {
        work_date: workDate,
        duration_minutes: duration,
        description: description.trim(),
        work_type: workType,
      });
      invalidate();
      setModalOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Saglabāšana neizdevās'
      );
    } finally {
      setSaving(false);
    }
  };

  const readOnly = incidentClosed || !canEdit;

  return (
    <section className="card border-gray-200 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-800">Darbi / laiks</h3>
          <p className="text-sm text-gray-500">
            {totalMinutes > 0
              ? `Kopā: ${formatDuration(totalMinutes)}`
              : 'Reģistrējiet pavadīto laiku remontā'}
          </p>
        </div>
        {!readOnly && (
          <button type="button" className="btn-secondary !py-2 !px-4 !min-h-0 text-sm" onClick={openAdd}>
            + Pievienot
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Nav darba ierakstu</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="bg-white rounded-xl border border-gray-100 px-3 py-3">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{formatDuration(log.duration_minutes)}</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{log.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {log.work_date}
                    {log.work_type && WORK_TYPE_LABELS[log.work_type as WorkType]
                      ? ` · ${WORK_TYPE_LABELS[log.work_type as WorkType]}`
                      : log.work_type
                        ? ` · ${log.work_type}`
                        : ''}
                    {log.user_name ? ` · ${log.user_name}` : ''}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-xs text-red-600 shrink-0 px-2 py-1"
                    onClick={() => {
                      if (confirm('Dzēst darba ierakstu?')) {
                        deleteMutation.mutate(log.id);
                      }
                    }}
                  >
                    Dzēst
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title="Jauns darba ieraksts"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>
              Atcelt
            </button>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving ? 'Saglabā...' : 'Saglabāt'}
            </button>
          </>
        }
      >
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Datums</label>
            <input
              type="date"
              className="input-field"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Ilgtspēja</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={24}
                className="input-field"
                placeholder="St"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <input
                type="number"
                min={0}
                max={59}
                className="input-field"
                placeholder="Min"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Darba veids</label>
            <select
              className="input-field"
              value={workType}
              onChange={(e) => setWorkType(e.target.value as WorkType)}
            >
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Apraksts *</label>
            <textarea
              className="input-field min-h-[100px]"
              placeholder="Ko paveica, kas tika salabots..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </section>
  );
}
