import { pushApi } from '../api/push';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function syncPushSubscriptionIfGranted(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const config = await pushApi.getConfig();
  if (!config.enabled || !config.publicKey) return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await pushApi.subscribe({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });
}

export async function subscribePushNotifications(): Promise<
  'granted' | 'denied' | 'unsupported' | 'disabled'
> {
  if (!isPushSupported()) return 'unsupported';

  const config = await pushApi.getConfig();
  if (!config.enabled || !config.publicKey) return 'disabled';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  await syncPushSubscriptionIfGranted();
  return 'granted';
}

export async function unsubscribePushNotifications(): Promise<void> {
  const subscription = await getActiveSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  try {
    await pushApi.unsubscribe({ endpoint });
  } catch {
    // token var būt jau dzēsts
  }
  await subscription.unsubscribe();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}
