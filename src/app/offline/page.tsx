import type { Metadata } from 'next';
import { CloudOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

/**
 * Shown when a page is requested that the device has never loaded before and
 * there is no connection. Pages that were visited once come from the cache
 * instead of landing here.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <CloudOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold tracking-tight">Gerade offline</h1>
      <p className="text-sm text-muted-foreground">
        Diese Seite war noch nie geladen und lässt sich ohne Verbindung nicht anzeigen. Seiten,
        die du schon einmal geöffnet hast – zum Beispiel der Katalog – funktionieren weiter.
      </p>
      <p className="text-xs text-muted-foreground">
        Sobald wieder Netz da ist, aktualisiert sich alles von selbst.
      </p>
    </div>
  );
}
