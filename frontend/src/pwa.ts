import { registerSW } from 'virtual:pwa-register';

/** Jaunā SW versija — automātiski pārlādē, lai nepaliek vecs kešs (piem. v0.4.0 UI) */
export function setupPwaUpdates(): void {
  if (!import.meta.env.PROD) return;

  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
  });
}
