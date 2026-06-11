/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/, /^\/health$/],
  })
);

registerRoute(
  /^https:\/\/api\./,
  new NetworkFirst({ cacheName: 'api-cache' }),
  'GET'
);

registerRoute(
  ({ url }) => url.pathname === '/health',
  new NetworkOnly(),
  'GET'
);

registerRoute(
  ({ url }) => url.pathname === '/app-version.json',
  new NetworkOnly(),
  'GET'
);

type PushMessage = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return (event.data?.json() ?? {}) as PushMessage;
    } catch {
      return { body: event.data?.text() } as PushMessage;
    }
  })();

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'TRIO-SERV', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? '/incidents' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data?.url as string | undefined) ?? '/incidents';
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if (typeof client.navigate === 'function') {
            await client.navigate(targetUrl);
            return;
          }
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
