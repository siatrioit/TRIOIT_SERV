import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{
        data: { token: string; user: { id: string; email: string; full_name: string; role: string } };
      }>('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pieslēgšanās neizdevās');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-primary-700">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-primary-700">TRIO-SERV</h1>
        <p className="text-center text-gray-500 text-sm">Lauka servisa pārvaldība</p>

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
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Ielādē...' : 'Pieslēgties'}
        </button>
      </form>
    </div>
  );
}
