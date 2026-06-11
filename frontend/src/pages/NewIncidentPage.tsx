import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { VoiceInputButton } from '../components/ai/VoiceInputButton';
import { IncidentLocationPicker } from '../components/incidents/IncidentLocationPicker';
import { aiApi } from '../api/ai';
import { clientsApi } from '../api/clients';
import { incidentsApi } from '../api/incidents';

export function NewIncidentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({
    clientId: searchParams.get('clientId') || '',
    objectId: searchParams.get('objectId') || '',
    unitId: searchParams.get('unitId') || '',
  });
  const [priority, setPriority] = useState('medium');
  const [needsReview, setNeedsReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: clientDetail } = useQuery({
    queryKey: ['client', location.clientId, 'validate'],
    queryFn: () => clientsApi.get(location.clientId),
    enabled: Boolean(location.clientId),
  });

  useEffect(() => {
    if (!clientDetail?.data || location.objectId) return;
    const objs = (clientDetail.data.objects || []).filter((o) => o.status !== 'closed');
    if (objs.length === 1 && objs[0].id) {
      setLocation((prev) => ({ ...prev, objectId: objs[0].id! }));
    }
  }, [clientDetail, location.objectId]);

  const hasActiveObjects = useMemo(() => {
    if (!clientDetail?.data.objects) return null;
    return clientDetail.data.objects.some((o) => o.status !== 'closed');
  }, [clientDetail]);

  const handleVoiceResult = (
    transcript: string,
    extraction?: Awaited<ReturnType<typeof aiApi.voiceToIncident>>['data']
  ) => {
    if (extraction) {
      const s = extraction.suggested_incident;
      setTitle((s.title as string) || '');
      setDescription((s.description as string) || transcript);
      if (s.client_id) {
        setLocation((prev) => ({
          ...prev,
          clientId: s.client_id as string,
          objectId: '',
          unitId: '',
        }));
      }
      setPriority((s.priority as string) || 'medium');
      setNeedsReview(extraction.needs_review);
    } else {
      setDescription(transcript);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!location.clientId) {
      setError('Izvēlieties klientu');
      return;
    }

    if (hasActiveObjects !== false && !location.objectId) {
      setError('Izvēlieties objektu');
      return;
    }

    setLoading(true);
    try {
      const res = await incidentsApi.create({
        client_id: location.clientId,
        object_id: location.objectId || undefined,
        unit_id: location.unitId || undefined,
        title,
        description,
        priority,
      });
      navigate(`/incidents/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neizdevās izveidot atgadījumu');
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
          AI ieteikums prasa pārbaudi — lūdzu apstipriniet klientu, objektu un ierīci
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <IncidentLocationPicker value={location} onChange={setLocation} />

        <div>
          <label className="block text-sm font-medium mb-1">Virsraksts *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            required
            placeholder="Problēmas īss apraksts"
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
