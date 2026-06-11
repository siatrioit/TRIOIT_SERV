import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { portalAuthApi } from '../../api/portalAuth';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import {
  clearRememberedLogin,
  loadRememberedLogin,
  saveRememberedLogin,
} from '../../utils/portalRemember';

export function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const autoLoginAttempted = useRef(false);
  const setAuth = usePortalAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const login = async (
    loginEmail: string,
    loginPassword: string,
    options?: { silent?: boolean; remember?: boolean }
  ) => {
    const shouldRemember = options?.remember ?? rememberMe;
    if (!options?.silent) setLoading(true);
    setError('');
    try {
      const res = await portalAuthApi.login(loginEmail, loginPassword);
      if (shouldRemember) {
        saveRememberedLogin(loginEmail, loginPassword);
      } else {
        clearRememberedLogin();
      }
      setAuth(res.data.token, res.data.user, res.data.access, res.data.objects);
      navigate('/portal', { replace: true });
      return true;
    } catch (err) {
      if (shouldRemember && options?.silent) {
        clearRememberedLogin();
        setRememberMe(false);
      }
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Pieslēgšanās neizdevās'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = loadRememberedLogin();
    if (!saved) return;

    setEmail(saved.email);
    setPassword(saved.password);
    setRememberMe(true);

    if (autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;
    setLoading(true);
    void login(saved.email, saved.password, { silent: true, remember: true });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
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

        {loading && !error && (
          <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl text-sm text-center">
            Pieslēdzas...
          </div>
        )}

        <input
          type="email"
          placeholder="E-pasts"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          autoComplete="username"
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Parole"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
          autoComplete="current-password"
          disabled={loading}
        />

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => {
              const checked = e.target.checked;
              setRememberMe(checked);
              if (!checked) clearRememberedLogin();
            }}
            disabled={loading}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
          />
          <span>
            Atcerēties pieteikšanos
            <span className="block text-xs text-gray-500 mt-0.5">
              Nākamreiz e-pasts un parole tiks ievadīti automātiski šajā ierīcē.
            </span>
          </span>
        </label>

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
