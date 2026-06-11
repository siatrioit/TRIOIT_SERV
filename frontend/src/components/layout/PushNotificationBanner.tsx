import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pushApi } from '../../api/push';
import {
  getNotificationPermission,
  isPushSupported,
  subscribePushNotifications,
  syncPushSubscriptionIfGranted,
} from '../../utils/pushNotifications';

const DISMISS_KEY = 'trio-serv-push-banner-dismissed';

type PushNotificationBannerProps = {
  role?: string;
};

export function PushNotificationBanner({ role }: PushNotificationBannerProps) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [permission, setPermission] = useState(getNotificationPermission());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canUsePush = role === 'admin' || role === 'manager' || role === 'technician';

  const { data: config } = useQuery({
    queryKey: ['push-config'],
    queryFn: () => pushApi.getConfig(),
    enabled: canUsePush,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!canUsePush) return;
    syncPushSubscriptionIfGranted().catch(() => {});
  }, [canUsePush]);

  if (
    !canUsePush ||
    dismissed ||
    !isPushSupported() ||
    !config?.enabled ||
    permission === 'granted' ||
    permission === 'denied'
  ) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await subscribePushNotifications();
      setPermission(getNotificationPermission());
      if (result === 'denied') {
        setError('Pārlūkprogramma noraidīja paziņojumus.');
      } else if (result === 'disabled') {
        setError('Push serverī vēl nav konfigurēts.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neizdevās ieslēgt paziņojumus');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-950">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium">Ieslēgt push paziņojumus?</p>
          <p className="text-primary-800 mt-0.5">
            Saņemsiet brīdinājumus par jauniem izsaukumiem un klientu čata ziņām.
          </p>
          {error && <p className="text-red-700 mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            className="btn-primary !py-2 !px-3 !min-h-0 text-sm"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? 'Ieslēdz...' : 'Ieslēgt'}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2 !px-3 !min-h-0 text-sm"
            onClick={handleDismiss}
            disabled={loading}
          >
            Vēlāk
          </button>
        </div>
      </div>
    </div>
  );
}
