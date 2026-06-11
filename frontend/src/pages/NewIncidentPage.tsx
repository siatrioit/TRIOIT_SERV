import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceInputButton } from '../components/ai/VoiceInputButton';
import { aiApi } from '../api/ai';
import { incidentsApi } from '../api/incidents';

export function NewIncidentPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [needsReview, setNeedsReview] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVoiceResult = (
    transcript: string,
    extraction?: Awaited<ReturnType<typeof aiApi.voiceToIncident>>['data']
  ) => {
    if (extraction) {
      const s = extraction.suggested_incident;
      setTitle((s.title as string) || '');
      setDescription((s.description as string) || transcript);
      setClientId((s.client_id as string) || '');
      setPriority((s.priority as string) || 'medium');
      setNeedsReview(extraction.needs_review);
    } else {
      setDescription(transcript);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await incidentsApi.create({
        client_id: clientId,
        title,
        description,
        priority,
      });
      navigate(`/incidents/${res.data.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Jauns atgadījums</h2>

      <div className="flex justify-center">
        <VoiceInputButton onResult={handleVoiceResult} />
      </div>
      <p className="text-center text-sm text-gray-500">
        Nospiediet mikrofonu un aprakstiet problēmu
      </p>

      {needsReview && (
        <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl text-sm">
          AI ieteikums prasa pārbaudi — lūdzu apstipriniet datus
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Klienta ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input-field"
            required
            placeholder="Klienta UUID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Virsraksts</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Apraksts</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[120px]"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prioritāte</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input-field"
          >
            <option value="low">Zema</option>
            <option value="medium">Vidēja</option>
            <option value="high">Augsta</option>
            <option value="critical">Kritiska</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saglabā...' : 'Izveidot atgadījumu'}
        </button>
      </form>
    </div>
  );
}
