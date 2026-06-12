import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  PORTAL_ROLE_LABELS,
  portalUsersApi,
  type PortalRole,
  type PortalUserAdmin,
} from '../../api/portalUsers';
import { Modal } from '../ui/Modal';

type PortalUserModalProps = {
  open: boolean;
  user: PortalUserAdmin | null;
  onClose: () => void;
};

function generatePassword(): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function PortalUserModal({ open, user, onClose }: PortalUserModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [shownPassword, setShownPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setEmail(user.email);
    setFullName(user.full_name);
    setPhone(user.phone || '');
    setIsActive(Boolean(user.is_active));
    setNewPassword('');
    setError('');
    setShownPassword(null);
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await portalUsersApi.update(user.id, {
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        is_active: isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ['portal-users'] });
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

  const handleResetPassword = async (useCustom: boolean) => {
    if (!user) return;
    if (useCustom && newPassword.length < 8) {
      setError('Parolei jābūt vismaz 8 rakstzīmēm');
      return;
    }
    setResetting(true);
    setError('');
    try {
      const res = await portalUsersApi.resetPassword(
        user.id,
        useCustom ? newPassword : undefined
      );
      setShownPassword(res.data.password);
      setNewPassword('');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Paroles maiņa neizdevās'
      );
    } finally {
      setResetting(false);
    }
  };

  const handleRoleChange = async (accessId: string, role: PortalRole) => {
    try {
      await portalUsersApi.updateAccessRole(accessId, role);
      await queryClient.invalidateQueries({ queryKey: ['portal-users'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neizdevās mainīt lomu');
    }
  };

  if (!user) return null;

  return (
    <>
      <Modal
        open={open && !shownPassword}
        title="Klienta portāla lietotājs"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
              Aizvērt
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleSave}
              disabled={saving || resetting}
            >
              {saving ? 'Saglabā...' : 'Saglabāt'}
            </button>
          </>
        }
      >
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          Esošo paroli nevar parādīt — tā ir šifrēta. Varat iestatīt jaunu paroli zemāk.
        </p>

        <div className="space-y-3 mb-6">
          <input
            className="input-field"
            placeholder="Vārds, uzvārds *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Konts aktīvs
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-6">
          <h4 className="font-medium text-gray-800 mb-2">Jauna parole</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Jauna parole (min. 8) vai ģenerēt"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary !py-2 !px-3 !min-h-0 text-sm shrink-0"
              onClick={() => setNewPassword(generatePassword())}
            >
              Ģenerēt
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              className="btn-primary !py-2 !px-3 !min-h-0 text-sm"
              disabled={resetting}
              onClick={() => handleResetPassword(Boolean(newPassword))}
            >
              {resetting ? 'Maina...' : newPassword ? 'Iestatīt paroli' : 'Ģenerēt un iestatīt'}
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-2">Pieejas un lomas</h4>
          {user.access.length === 0 ? (
            <p className="text-sm text-gray-500">Nav aktīvu piekļuves ierakstu</p>
          ) : (
            <ul className="space-y-2">
              {user.access.map((row) => (
                <li key={row.id} className="bg-gray-50 rounded-xl px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {row.client_name}
                    {row.scope === 'object' && row.object_name
                      ? ` · ${row.object_name}`
                      : row.scope === 'client'
                        ? ' · viss klients'
                        : ''}
                  </p>
                  <select
                    className="input-field mt-2 !py-1.5 text-sm"
                    value={row.portal_role}
                    onChange={(e) =>
                      handleRoleChange(row.id, e.target.value as PortalRole)
                    }
                  >
                    {(Object.keys(PORTAL_ROLE_LABELS) as PortalRole[]).map((role) => (
                      <option key={role} value={role}>
                        {PORTAL_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(shownPassword)}
        title="Jaunā parole"
        onClose={() => setShownPassword(null)}
        footer={
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => setShownPassword(null)}
          >
            Sapratu
          </button>
        }
      >
        <p className="text-sm text-gray-600 mb-3">
          Saglabājiet paroli — vairs netiks rādīta:
        </p>
        <code className="block bg-gray-100 rounded-xl px-4 py-3 text-sm font-mono break-all">
          {shownPassword}
        </code>
      </Modal>
    </>
  );
}
