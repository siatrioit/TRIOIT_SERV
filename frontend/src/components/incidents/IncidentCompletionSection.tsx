import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentCompletionApi } from '../../api/incidentCompletion';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { Modal } from '../ui/Modal';
import { isSignatureReady, SignatureCapture } from './SignatureCapture';

type IncidentCompletionSectionProps = {
  incidentId: string;
  variant: 'staff' | 'portal';
  canEdit: boolean;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function IncidentCompletionSection({
  incidentId,
  variant,
  canEdit,
}: IncidentCompletionSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signature, setSignature] = useState<{ type: 'typed' | 'drawn'; data: string }>({
    type: 'typed',
    data: '',
  });
  const [error, setError] = useState('');

  const queryKey = ['incident-completion', incidentId, variant];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      variant === 'portal'
        ? portalIncidentsApi.getCompletion(incidentId)
        : incidentCompletionApi.get(incidentId),
  });

  const completion = data?.data ?? null;

  const signMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        signer_name: signerName.trim(),
        signature_type: signature.type,
        signature_data: signature.type === 'typed' ? signerName.trim() : signature.data,
      };
      if (variant === 'portal') {
        return portalIncidentsApi.signCompletion(incidentId, payload);
      }
      await incidentCompletionApi.request(incidentId);
      return incidentCompletionApi.sign(incidentId, payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      setError('');
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['incident-activity', incidentId] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Apstiprināšana neizdevās');
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => incidentCompletionApi.generateAct(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['incident-activity', incidentId] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Neizdevās izveidot aktu');
    },
  });

  const openSignModal = () => {
    setSignerName(completion?.client_signer_name ?? '');
    setSignature({ type: 'typed', data: completion?.client_signer_name ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleDownload = async () => {
    try {
      await incidentCompletionApi.downloadAct(
        incidentId,
        `${completion?.act_number ?? 'darbu-akts'}.pdf`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lejupielāde neizdevās');
    }
  };

  const canSign = canEdit && !completion?.has_signature;
  const canGenerateAct = variant === 'staff' && canEdit && completion?.has_signature && !completion?.has_act;
  const canDownload = variant === 'staff' && completion?.has_act;

  return (
    <section className="card space-y-3">
      <div>
        <h3 className="font-medium text-gray-800">Darba izpildes apstiprinājums</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Klienta paraksts un remonta darbu izpildes akts
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : completion?.has_signature ? (
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-3 space-y-1 text-sm">
          <p className="font-medium text-green-900">
            Apstiprināts: {completion.client_signer_name}
          </p>
          {completion.client_signed_at && (
            <p className="text-green-800">{formatWhen(completion.client_signed_at)}</p>
          )}
          {completion.has_act && completion.act_number && (
            <p className="text-green-800">Akts: {completion.act_number}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Pēc darba pabeigšanas lūdziet klientam apstiprināt izpildi ar parakstu.
        </p>
      )}

      {error && !modalOpen && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {canSign && (
          <button type="button" className="btn-primary !py-2 !px-4 !min-h-0 text-sm" onClick={openSignModal}>
            Apstiprināt izpildi
          </button>
        )}
        {canGenerateAct && (
          <button
            type="button"
            className="btn-secondary !py-2 !px-4 !min-h-0 text-sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Veido aktu...' : 'Izveidot aktu'}
          </button>
        )}
        {canDownload && (
          <button type="button" className="btn-secondary !py-2 !px-4 !min-h-0 text-sm" onClick={handleDownload}>
            Lejupielādēt PDF aktu
          </button>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Apstiprināt darba izpildi"
        onClose={() => !signMutation.isPending && setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setModalOpen(false)}
              disabled={signMutation.isPending}
            >
              Atcelt
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={signMutation.isPending || !isSignatureReady(signerName, signature)}
              onClick={() => signMutation.mutate()}
            >
              {signMutation.isPending ? 'Saglabā...' : 'Apstiprināt'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {variant === 'portal'
              ? 'Apstipriniet, ka remonta darbi ir veikti un pieņemti.'
              : 'Nododiet ierīci klientam — viņš var parakstīties ar pirkstu vai ierakstīt vārdu.'}
          </p>
          <SignatureCapture
            signerName={signerName}
            onSignerNameChange={setSignerName}
            onSignatureChange={setSignature}
            disabled={signMutation.isPending}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </section>
  );
}
