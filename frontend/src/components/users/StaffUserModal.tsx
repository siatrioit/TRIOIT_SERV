import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  ROLE_LABELS,
  type CreateStaffUserPayload,
  type StaffRole,
  type StaffUser,
  type UpdateStaffUserPayload,
} from '../../api/users';
import { Modal } from '../ui/Modal';

const ROLES: StaffRole[] = ['admin', 'manager', 'technician', 'viewer'];

type StaffUserModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: StaffUser | null;
  onClose: () => void;
  onSave: (data: CreateStaffUserPayload | UpdateStaffUserPayload) => Promise<void>;
};

export function StaffUserModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: StaffUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('technician');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setEmail(initial.email);
      setFullName(initial.full_name);
      setPhone(initial.phone || '');
      setRole(initial.role);
      setIsActive(Boolean(initial.is_active));
    } else {
      setEmail('');
      setFullName('');
      setPhone('');
      setRole('technician');
      setIsActive(true);
    }
    setPassword('');
    setError('');
  }, [open, initial]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Vārds ir obligāts');
      return;
    }
    if (!email.trim()) {
      setError('E-pasts ir obligāts');
      return;
    }
    if (mode === 'create' && password.length < 8) {
      setError('Parolei jābūt vismaz 8 rakstzīmēm');
      return;
    }
    if (mode === 'edit' && password && password.length < 8) {
      setError('Parolei jābūt vismaz 8 rakstzīmēm');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await onSave({
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
          password,
        });
      } else {
        const payload: UpdateStaffUserPayload = {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
          is_active: isActive,
        };
        if (password) payload.password = password;
        await onSave(payload);
      }
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

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Jauns lietotājs' : 'Lietotājs'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving}
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
          placeholder="Vārds, uzvārds *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoFocus
        />
        <input
          type="email"
          className="input-field"
          placeholder="E-pasts *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Tālrunis"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Loma</label>
          <select
            className="input-field"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <input
          type="password"
          className="input-field"
          placeholder={mode === 'create' ? 'Parole * (min. 8)' : 'Jauna parole (atstāt tukšu, lai nemainītu)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Konts aktīvs
          </label>
        )}
      </div>
    </Modal>
  );
}
