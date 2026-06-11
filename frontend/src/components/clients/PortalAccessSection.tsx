import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { portalAccessApi, type CreatePortalAccessPayload } from '../../api/portalAccess';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';

type PortalAccessSectionProps = {
  clientId: string;
  objectId?: string;
  objectName?: string;
  canManage?: boolean;
};

export function PortalAccessSection({
  clientId,
  objectId,
  objectName,
  canManage: canManageProp = true,
}: PortalAccessSectionProps) {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canManageProp && (role === 'admin' || role === 'manager');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const queryKey = objectId
    ? ['portal-access', clientId, objectId]
    : ['portal-access', clientId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      objectId
        ? portalAccessApi.listForObject(clientId, objectId)
        : portalAccessApi.listForClient(clientId),
  });

  const rows = data?.data ?? [];

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPhone('');
    setPassword('');
    setError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Vārds un e-pasts ir obligāti');
      return;
    }
    if (password && password.length < 8) {
      setError('Parolei jābūt vismaz 8 rakstzīmēm');
      return;
    }

    const payload: CreatePortalAccessPayload = {
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      password: password.trim() || undefined,
    };

    setSaving(true);
    setError('');
    try {
      const res = objectId
        ? await portalAccessApi.createForObject(clientId, objectId, payload)
        : await portalAccessApi.createForClient(clientId, payload);

      if (res.temporary_password) {
        setTempPassword(res.temporary_password);
      } else {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['portal-access', clientId] });
      if (objectId) {
        await queryClient.invalidateQueries({ queryKey: ['portal-access', clientId, objectId] });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : 'Neizdevās piešķirt pieeju'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (accessId: string, name: string) => {
    if (!confirm(`Atslēgt pieeju lietotājam „${name}"?`)) return;
    try {
      await portalAccessApi.revoke(accessId);
      await queryClient.invalidateQueries({ queryKey: ['portal-access', clientId] });
      if (objectId) {
        await queryClient.invalidateQueries({ queryKey: ['portal-access', clientId, objectId] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neizdevās atslēgt pieeju');
    }
  };

  const title = objectId
    ? `Sistēmas pieeja — ${objectName || 'objekts'}`
    : 'Sistēmas pieeja — klients';

  const description = objectId
    ? 'Lietotājs redzēs tikai šī objekta datus klientu portālā.'
    : 'Lietotājs redzēs visus klienta objektus un izsaukumus klientu portālā.';

  return (
    <section className="card border-primary-100 bg-primary-50/30">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          <p className="text-xs text-gray-400 mt-1">
            Pieslēgšanās:{' '}
            <a href="/portal/login" className="text-primary-600 hover:underline">
              /portal/login
            </a>
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn-secondary !py-2 !px-4 !min-h-0 text-sm w-full sm:w-auto shrink-0"
            onClick={() => setShowForm(true)}
          >
            + Piešķirt pieeju
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-3">{error}</div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Ielādē...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 border border-dashed border-gray-200 rounded-xl text-center">
          Nav piešķirtas pieejas
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{row.full_name}</p>
                <p className="text-sm text-gray-500 truncate">{row.email}</p>
                {!objectId && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.scope === 'client'
                      ? 'Pieeja visam klientam'
                      : `Tikai objekts: ${row.object_name || '—'}`}
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-700 shrink-0 px-2 py-1"
                  onClick={() => handleRevoke(row.id, row.full_name)}
                >
                  Atslēgt
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={showForm}
        title="Piešķirt pieeju klientu portālam"
        onClose={resetForm}
        footer={
          <>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={resetForm}>
              Atcelt
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? 'Saglabā...' : 'Piešķirt'}
            </button>
          </>
        }
      >
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        <p className="text-sm text-gray-600 mb-4">
          {objectId
            ? 'Tiks izveidots vai piesaistīts klientu portāla konts ar pieeju tikai šim objektam.'
            : 'Tiks izveidots vai piesaistīts klientu portāla konts ar pieeju visam klientam.'}
        </p>
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
          <input
            type="password"
            className="input-field"
            placeholder="Parole (neobligāta — ģenerēs automātiski)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(tempPassword)}
        title="Konts izveidots"
        onClose={() => {
          setTempPassword(null);
          resetForm();
        }}
        footer={
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => {
              setTempPassword(null);
              resetForm();
            }}
          >
            Sapratu
          </button>
        }
      >
        <p className="text-sm text-gray-600 mb-3">
          Pagaidu parole klientu portālam (saglabājiet — vairs netiks rādīta):
        </p>
        <code className="block bg-gray-100 rounded-xl px-4 py-3 text-sm font-mono break-all">
          {tempPassword}
        </code>
      </Modal>
    </section>
  );
}
