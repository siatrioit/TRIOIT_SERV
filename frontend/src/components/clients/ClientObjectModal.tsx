import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  emptyObject,
  sanitizeClientObject,
  type ClientObjectInput,
} from '../../api/clients';
import { PortalAccessSection } from './PortalAccessSection';
import { ObjectUnitsSection } from './ObjectUnitsSection';
import { Modal } from '../ui/Modal';
import { ROLE_LABELS, usersApi } from '../../api/users';

type ClientObjectModalProps = {
  open: boolean;
  clientId?: string;
  mode: 'create' | 'edit' | 'closed';
  initial?: ClientObjectInput | null;
  incidentCount?: number;
  onClose: () => void;
  onSave: (data: ClientObjectInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCloseObject?: () => Promise<void>;
  onReopen?: () => Promise<void>;
};

export function ClientObjectModal({
  open,
  clientId,
  mode,
  initial,
  incidentCount = 0,
  onClose,
  onSave,
  onDelete,
  onCloseObject,
  onReopen,
}: ClientObjectModalProps) {
  const [form, setForm] = useState<ClientObjectInput>(emptyObject());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const readOnly = mode === 'closed';
  const canDelete = mode === 'edit' && incidentCount === 0 && onDelete;
  const canClose = mode === 'edit' && onCloseObject;

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...emptyObject(), ...initial } : emptyObject(false));
    setError('');
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  }, [open, initial]);

  const patch = (p: Partial<ClientObjectInput>) => setForm((f) => ({ ...f, ...p }));

  const handleSave = async () => {
    const data = sanitizeClientObject(form);
    if (!data.name) {
      setError('Objekta nosaukums ir obligāts');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(data);
      onClose();
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

  const handleDelete = async () => {
    if (!onDelete || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === 'HAS_INCIDENTS'
            ? 'Objektu nevar dzēst — ir saistīti izsaukumi. Slēdziet objektu.'
            : err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Dzēšana neizdevās'
      );
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseObject = async () => {
    if (!onCloseObject || !confirm('Slēgt šo objektu? Tas paliks arhīvā un to varēs atvērt vēlāk.')) {
      return;
    }
    setClosing(true);
    setError('');
    try {
      await onCloseObject();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Slēgšana neizdevās');
    } finally {
      setClosing(false);
    }
  };

  const handleReopen = async () => {
    if (!onReopen) return;
    setReopening(true);
    setError('');
    try {
      await onReopen();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Atvēršana neizdevās');
    } finally {
      setReopening(false);
    }
  };

  const busy = saving || deleting || closing || reopening;

  const { data: assignableData } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: () => usersApi.listAssignable(),
    enabled: open && !readOnly,
  });

  const assignableUsers = assignableData?.data ?? [];

  const title =
    mode === 'create' ? 'Jauns objekts' : mode === 'closed' ? 'Slēgts objekts' : 'Objekts';

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Aizvērt
          </button>
          {mode === 'closed' && onReopen && (
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleReopen}
              disabled={busy}
            >
              {reopening ? 'Atver...' : 'Atvērt atpakaļ'}
            </button>
          )}
          {canClose && (
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto border-amber-300 text-amber-800 hover:bg-amber-50"
              onClick={handleCloseObject}
              disabled={busy}
            >
              {closing ? 'Slēdz...' : 'Slēgt objektu'}
            </button>
          )}
          {canDelete && !showDeleteConfirm && (
            <button
              type="button"
              className="btn-danger w-full sm:w-auto"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={busy}
            >
              Dzēst
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleSave}
              disabled={busy}
            >
              {saving ? 'Saglabā...' : 'Saglabāt'}
            </button>
          )}
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}

      {mode === 'edit' && incidentCount > 0 && (
        <div className="bg-amber-50 text-amber-900 px-4 py-3 rounded-xl text-sm mb-4">
          Objektam ir {incidentCount} izsaukums{incidentCount === 1 ? '' : 'i'}. To nevar dzēst —
          var tikai slēgt.
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm text-red-800 font-medium">
            Objekts tiks neatgriezeniski dzēsts. Ierakstiet <strong>DELETE</strong>, lai
            apstiprinātu.
          </p>
          <input
            className="input-field bg-white"
            placeholder="Ierakstiet DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="btn-danger w-full sm:w-auto"
              onClick={handleDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
            >
              {deleting ? 'Dzēš...' : 'Apstiprināt dzēšanu'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
              }}
              disabled={deleting}
            >
              Atcelt
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <input
          className="input-field"
          placeholder="Objekta nosaukums *"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          autoFocus={!showDeleteConfirm}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <input
          className="input-field"
          placeholder="Objekta kods (iekšējais)"
          value={form.object_code || ''}
          onChange={(e) => patch({ object_code: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <input
          className="input-field"
          placeholder="Adrese"
          value={form.address || ''}
          onChange={(e) => patch({ address: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Pilsēta"
            value={form.city || ''}
            onChange={(e) => patch({ city: e.target.value })}
            readOnly={readOnly}
            disabled={readOnly}
          />
          <input
            className="input-field"
            placeholder="Indekss"
            value={form.postal_code || ''}
            onChange={(e) => patch({ postal_code: e.target.value })}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
        <input
          className="input-field"
          placeholder="Kontaktpersona objektā"
          value={form.contact_name || ''}
          onChange={(e) => patch({ contact_name: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <input
          className="input-field"
          placeholder="Tālrunis objektā"
          value={form.contact_phone || ''}
          onChange={(e) => patch({ contact_phone: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <input
          type="email"
          className="input-field"
          placeholder="E-pasts objektā"
          value={form.contact_email || ''}
          onChange={(e) => patch({ contact_email: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <input
          className="input-field"
          placeholder="Piekļuves info (kods, darba laiks u.c.)"
          value={form.access_notes || ''}
          onChange={(e) => patch({ access_notes: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <textarea
          className="input-field min-h-[72px]"
          placeholder="Piezīmes par objektu"
          value={form.notes || ''}
          onChange={(e) => patch({ notes: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
        {!readOnly && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atbildīgais
            </label>
            <select
              className="input-field"
              value={form.assigned_user_id ?? ''}
              onChange={(e) =>
                patch({ assigned_user_id: e.target.value || null })
              }
            >
              <option value="">Nav norādīts (paziņojumi visiem)</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({ROLE_LABELS[user.role]})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Jauns izsaukums šim objektam automātiski tiek piešķirts šim darbiniekam.
            </p>
          </div>
        )}
        {readOnly && form.assigned_user_name && (
          <p className="text-sm text-gray-600">
            Atbildīgais: <span className="font-medium">{form.assigned_user_name}</span>
          </p>
        )}
        {!readOnly && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={Boolean(form.is_primary)}
              onChange={(e) => patch({ is_primary: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Galvenais objekts
          </label>
        )}
      </div>

      {mode === 'edit' && clientId && initial?.id && (
        <div className="mt-6 -mx-1 space-y-4">
          <ObjectUnitsSection clientId={clientId} objectId={initial.id} />
          <PortalAccessSection
            clientId={clientId}
            objectId={initial.id}
            objectName={form.name}
          />
        </div>
      )}

      {mode === 'closed' && clientId && initial?.id && (
        <div className="mt-6 -mx-1">
          <ObjectUnitsSection clientId={clientId} objectId={initial.id} readOnly />
        </div>
      )}
    </Modal>
  );
}
