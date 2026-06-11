import { useState } from 'react';
import { aiApi } from '../../api/ai';

export function AiQueryBar() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await aiApi.query(query);
      setAnswer(res.data.answer);
    } catch {
      setAnswer('Neizdevās apstrādāt vaicājumu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Piem.: "Parādi gaidošos atgadījumus Rīgā"'
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary px-4" disabled={loading}>
          {loading ? '...' : '🔍'}
        </button>
      </form>
      {answer && (
        <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{answer}</p>
      )}
    </div>
  );
}
