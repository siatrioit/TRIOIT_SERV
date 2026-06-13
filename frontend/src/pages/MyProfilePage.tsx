import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { authApi } from '../api/auth';
import { StaffSignaturePad } from '../components/users/StaffSignaturePad';

export function MyProfilePage() {
  const queryClient = useQueryClient();
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authApi.me(),
  });

  useEffect(() => {
    if (data?.data) {
      setSignatureData(data.data.signature_data ?? null);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => authApi.updateSignature(signatureData),
    onSuccess: () => {
      setError('');
      setMessage('Paraksts saglabāts');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err) => {
      setMessage('');
      setError(err instanceof ApiError ? err.displayMessage : 'Saglabāšana neizdevās');
    },
  });

  if (isLoading) return <div className="text-center py-8 text-gray-400">Ielādē...</div>;

  const user = data?.data;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-semibold">Mans profils</h2>
        <p className="text-sm text-gray-500">{user?.full_name}</p>
      </div>

      <div className="card space-y-3">
        <div>
          <h3 className="font-medium text-gray-800">Paraksts PDF aktiem</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Saglabājiet parakstu vienreiz — tas automātiski tiks ievietots darbu izpildes aktos, ja esat
            norīkots izpildītājs.
          </p>
        </div>
        <StaffSignaturePad
          value={signatureData}
          onChange={setSignatureData}
          disabled={saveMutation.isPending}
        />
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saglabā...' : 'Saglabāt parakstu'}
        </button>
      </div>
    </div>
  );
}
