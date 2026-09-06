'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Minimal pdf.js viewer for building instructions.
 *
 * The library and its worker are bundled with the app - no CDN, no external
 * request. One page at a time, because that is how you actually build a set,
 * and because rendering 200 pages at once would stall a phone.
 */
export function PdfViewer({ url, label }: { url: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentRef = useRef<any>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const loadingTask = pdfjs.getDocument({ url });
        const document = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        loadingTaskRef.current = loadingTask;
        documentRef.current = document;
        setPageCount(document.numPages);
        setPage(1);
      } catch (cause) {
        console.error('[pdf] konnte nicht geladen werden', cause);
        if (!cancelled) setError('Die Anleitung konnte nicht geladen werden.');
      }
    }

    void load();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      documentRef.current = null;
    };
  }, [url]);

  const renderPage = useCallback(async (pageNumber: number) => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!document || !canvas || !container) return;

    setLoading(true);
    renderTaskRef.current?.cancel();

    try {
      const pdfPage = await document.getPage(pageNumber);
      const unscaled = pdfPage.getViewport({ scale: 1 });
      // Fit the width of the container, but stay sharp on high-DPI screens.
      const scale = (container.clientWidth || 600) / unscaled.width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * ratio });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      const context = canvas.getContext('2d');
      if (!context) return;

      const task = pdfPage.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = task;
      await task.promise;
    } catch (cause) {
      if ((cause as { name?: string })?.name !== 'RenderingCancelledException') {
        console.error('[pdf] Seite konnte nicht gezeichnet werden', cause);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pageCount > 0) void renderPage(page);
  }, [page, pageCount, renderPage]);

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            PDF direkt öffnen
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative rounded-lg border border-border bg-muted/30 p-2">
        <canvas ref={canvasRef} aria-label={`${label}, Seite ${page}`} className="mx-auto block" />
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1 || loading}
        >
          <ChevronLeft />
          Zurück
        </Button>
        <span className="text-sm text-muted-foreground">
          Seite {page} von {pageCount || '…'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          disabled={page >= pageCount || loading}
        >
          Weiter
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
