import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  emptyObject,
  sanitizeClientObject,
  type ClientObjectInput,
} from '../../api/clients';
import { Modal } from '../ui/Modal';

type ClientObjectModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ClientObjectInput | null;
  onClose: () => void;
  onSave: (data: ClientObjectInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function ClientObjectModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: ClientObjectModalProps) {
  const [form, setForm] = useState<ClientObjectInput>(emptyObject());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...emptyObject(), ...initial } : emptyObject(false));
    setError('');
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
    if (!onDelete || !confirm('Dzēst šo objektu?')) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dzēšana neizdevās');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Jauns objekts' : 'Objekts'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Aizvērt
          </button>
          {onDelete && (
            <button
              type="button"
              className="btn-danger w-full sm:w-auto"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? 'Dzēš...' : 'Dzēst'}
            </button>
          )}
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving || deleting}
          >
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}

      <div className="space-y-3">
        <input
          className="input-field"
          placeholder="Objekta nosaukums *"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          autoFocus
        />
        <input
          className="input-field"
          placeholder="Objekta kods (iekšējais)"
          value={form.object_code || ''}
          onChange={(e) => patch({ object_code: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Adrese"
          value={form.address || ''}
          onChange={(e) => patch({ address: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Pilsēta"
            value={form.city || ''}
            onChange={(e) => patch({ city: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Indekss"
            value={form.postal_code || ''}
            onChange={(e) => patch({ postal_code: e.target.value })}
          />
        </div>
        <input
          className="input-field"
          placeholder="Kontaktpersona objektā"
          value={form.contact_name || ''}
          onChange={(e) => patch({ contact_name: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Tālrunis objektā"
          value={form.contact_phone || ''}
          onChange={(e) => patch({ contact_phone: e.target.value })}
        />
        <input
          type="email"
          className="input-field"
          placeholder="E-pasts objektā"
          value={form.contact_email || ''}
          onChange={(e) => patch({ contact_email: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Piekļuves info (kods, darba laiks u.c.)"
          value={form.access_notes || ''}
          onChange={(e) => patch({ access_notes: e.target.value })}
        />
        <textarea
          className="input-field min-h-[72px]"
          placeholder="Piezīmes par objektu"
          value={form.notes || ''}
          onChange={(e) => patch({ notes: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={Boolean(form.is_primary)}
            onChange={(e) => patch({ is_primary: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Galvenais objekts
        </label>
      </div>
    </Modal>
  );
}
