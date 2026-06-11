import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { portalAuthApi } from '../../api/portalAuth';
import { usePortalAuthStore } from '../../store/portalAuthStore';

export function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = usePortalAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await portalAuthApi.login(email, password);
      setAuth(res.data.token, res.data.user, res.data.access, res.data.objects);
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Pieslēgšanās neizdevās'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-emerald-700">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-700">TRIO Klientu portāls</h1>
          <p className="text-sm text-gray-500 mt-1">Izsaukumu reģistrācija un uzraudzība</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <input
          type="email"
          placeholder="E-pasts"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Parole"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="w-full bg-emerald-600 text-white font-medium rounded-xl px-6 py-3 min-h-[48px] hover:bg-emerald-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Ielādē...' : 'Pieslēgties'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Darbinieks?{' '}
          <Link to="/login" className="text-emerald-700 font-medium">
            Mūsu panelis →
          </Link>
        </p>
      </form>
    </div>
  );
}
