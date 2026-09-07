'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker.
 *
 * Only in production: in development the worker would serve stale chunks and
 * turn every edit into a puzzle.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[pwa] Service Worker konnte nicht registriert werden', error);
      });
    };

    // Waiting for load keeps the worker from competing with the first render.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}

/** Drops every cached page - called on sign-out. */
export async function clearOfflineCaches(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage('bricktrack:clear-cache');
}
