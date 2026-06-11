import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appVersion = JSON.parse(
  readFileSync(resolve(__dirname, '../version.json'), 'utf8')
).version as string;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-app-version',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: { name: 'app-version', content: appVersion },
            injectTo: 'head',
          },
        ];
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TRIO-SERV',
        short_name: 'TRIO-SERV',
        description: 'Lauka servisa pārvaldība',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api/, /^\/health$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
          {
            urlPattern: ({ url }) => url.pathname === '/health',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname === '/app-version.json',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
