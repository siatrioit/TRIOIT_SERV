import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { companySettingsApi, type CompanySettings } from '../../api/companySettings';
import { useAuthStore } from '../../store/authStore';

function formatError(err: unknown) {
  return err instanceof ApiError ? err.displayMessage : 'Kļūda';
}

export function CompanySettingsSetupPage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanySettings | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettingsApi.get(),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (data?.data) setForm(data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => companySettingsApi.update(form!),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
    onError: (err) => setError(formatError(err)),
  });

  if (!isAdmin) return <Navigate to="/setup/users" replace />;
  if (isLoading || !form) return <div className="text-sm text-gray-400">Ielādē...</div>;

  const setField = (key: keyof CompanySettings, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-800">Uzņēmuma rekvizīti</h3>
        <p className="text-sm text-gray-500 mt-1">
          Izmantoti PDF darbu izpildes aktu galvenē. Uzņēmuma nosaukums tiek izcelts treknrakstā.
        </p>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

      <div className="card space-y-3">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Uzņēmuma nosaukums (treknraksts) *</label>
          <input
            className="input-field"
            value={form.company_name}
            onChange={(e) => setField('company_name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Galvas rinda 1</label>
          <input
            className="input-field"
            value={form.header_line1 ?? ''}
            onChange={(e) => setField('header_line1', e.target.value)}
            placeholder="Piem., juridiskā adrese vai reģ. nr."
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Galvas rinda 2</label>
          <input
            className="input-field"
            value={form.header_line2 ?? ''}
            onChange={(e) => setField('header_line2', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Galvas rinda 3</label>
          <input
            className="input-field"
            value={form.header_line3 ?? ''}
            onChange={(e) => setField('header_line3', e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Reģistrācijas nr.</label>
            <input
              className="input-field"
              value={form.registration_number ?? ''}
              onChange={(e) => setField('registration_number', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">PVN nr.</label>
            <input
              className="input-field"
              value={form.vat_number ?? ''}
              onChange={(e) => setField('vat_number', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Adrese</label>
          <textarea
            className="input-field min-h-[72px]"
            value={form.address ?? ''}
            onChange={(e) => setField('address', e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Tālrunis</label>
            <input
              className="input-field"
              value={form.phone ?? ''}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">E-pasts</label>
            <input
              className="input-field"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Banka</label>
            <input
              className="input-field"
              value={form.bank_name ?? ''}
              onChange={(e) => setField('bank_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Bankas konts</label>
            <input
              className="input-field"
              value={form.bank_account ?? ''}
              onChange={(e) => setField('bank_account', e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.company_name.trim()}
        >
          {saveMutation.isPending ? 'Saglabā...' : 'Saglabāt'}
        </button>
      </div>
    </div>
  );
}
