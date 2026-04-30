import { registerSW } from 'virtual:pwa-register';

export function registerPwa() {
  if (typeof window === 'undefined') return;

  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info('[PWA] new content available; refresh to update.');
    },
    onOfflineReady() {
      console.info('[PWA] ready to work offline.');
    },
  });
}
