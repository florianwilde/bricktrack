'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Search } from 'lucide-react';
import { cn } from 'cn';
import { fragmentsToHighlight, nextHitPage, searchPages, type PageHit } from '@/lib/pdf-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PageText = { text: string; fragments: string[] };
type Highlight = { left: number; top: number; width: number; height: number };

/**
 * Minimal pdf.js viewer for building instructions.
 *
 * The library and its worker are bundled with the app - no CDN, no external
 * request. One page at a time, because that is how you actually build a set,
 * and because rendering 200 pages at once would stall a phone.
 *
 * Search reads the text layer of every page once, on the first query, and
 * keeps it for the lifetime of the viewer. Hits are marked on the page.
 */
export function PdfViewer({ url, label }: { url: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsRef = useRef<any>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);
  const textRef = useRef<PageText[] | null>(null);

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hits, setHits] = useState<PageHit[]>([]);
  const [indexing, setIndexing] = useState<{ done: number } | null>(null);
  const [hasText, setHasText] = useState(true);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

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
        pdfjsRef.current = pdfjs;
        loadingTaskRef.current = loadingTask;
        documentRef.current = document;
        textRef.current = null;
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
      textRef.current = null;
    };
  }, [url]);

  useEffect(() => setPageInput(String(page)), [page]);

  /** Reads the text of every page once; later searches reuse it. */
  const pageTexts = useCallback(async (): Promise<PageText[]> => {
    if (textRef.current) return textRef.current;
    const document = documentRef.current;
    if (!document) return [];

    const texts: PageText[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const pdfPage = await document.getPage(number);
      const content = await pdfPage.getTextContent();
      const fragments = (content.items as Array<{ str?: string }>)
        .map((item) => item.str ?? '')
        .filter((text) => text.length > 0);
      texts.push({ text: fragments.join(' '), fragments });
      setIndexing({ done: number });
    }
    setIndexing(null);
    textRef.current = texts;
    setHasText(texts.some((entry) => entry.text.trim().length > 0));
    return texts;
  }, []);

  // Debounced, so typing a part number does not search after every digit.
  useEffect(() => {
    if (pageCount === 0) return;
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setActiveQuery('');
        setHits([]);
        return;
      }
      const texts = await pageTexts();
      const found = searchPages(
        texts.map((entry) => entry.text),
        trimmed,
      );
      setActiveQuery(trimmed);
      setHits(found);
      const first = found.find((hit) => hit.page >= page) ?? found[0];
      if (first && !found.some((hit) => hit.page === page)) setPage(first.page);
    }, 300);
    return () => clearTimeout(timer);
    // `page` is read only to pick where to jump; a page change must not re-run the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pageCount, pageTexts]);

  const renderPage = useCallback(async (pageNumber: number, search: string) => {
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

      setHighlights(search ? await highlightsFor(pdfPage, search) : []);
    } catch (cause) {
      if ((cause as { name?: string })?.name !== 'RenderingCancelledException') {
        console.error('[pdf] Seite konnte nicht gezeichnet werden', cause);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Boxes over the matching text fragments, in percent of the page so they
   * stay in place however wide the canvas is drawn.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function highlightsFor(pdfPage: any, search: string): Promise<Highlight[]> {
    const pdfjs = pdfjsRef.current;
    if (!pdfjs) return [];
    const viewport = pdfPage.getViewport({ scale: 1 });
    const content = await pdfPage.getTextContent();
    const items = (
      content.items as Array<{ str?: string; transform?: number[]; width?: number }>
    ).filter((item) => item.str && item.transform);

    return fragmentsToHighlight(
      items.map((item) => item.str ?? ''),
      search,
    ).flatMap((index) => {
      const item = items[index];
      if (!item?.transform) return [];
      const [, , c = 0, d = 0, x = 0, y = 0] = pdfjs.Util.transform(
        viewport.transform,
        item.transform,
      ) as number[];
      const height = Math.hypot(c, d);
      const width = (item.width ?? 0) * viewport.scale;
      return [
        {
          left: (x / viewport.width) * 100,
          top: ((y - height) / viewport.height) * 100,
          width: (Math.max(width, height * 0.6) / viewport.width) * 100,
          height: ((height * 1.2) / viewport.height) * 100,
        },
      ];
    });
  }

  useEffect(() => {
    if (pageCount > 0) void renderPage(page, activeQuery);
  }, [page, pageCount, activeQuery, renderPage]);

  function goToTypedPage() {
    const number = Number(pageInput);
    if (Number.isInteger(number) && number >= 1 && number <= pageCount) setPage(number);
    else setPageInput(String(page));
  }

  function jump(direction: 1 | -1) {
    const target = nextHitPage(hits, page, direction);
    if (target !== null) setPage(target);
  }

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

  const hitIndex = hits.findIndex((hit) => hit.page === page);
  const totalHits = hits.reduce((sum, hit) => sum + hit.count, 0);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  jump(event.shiftKey ? -1 : 1);
                }
              }}
              placeholder="In der Anleitung suchen, z. B. Teilenummer"
              aria-label="In der Anleitung suchen"
              className="pl-9"
              disabled={pageCount === 0}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Vorheriger Treffer"
            onClick={() => jump(-1)}
            disabled={hits.length === 0}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Nächster Treffer"
            onClick={() => jump(1)}
            disabled={hits.length === 0}
          >
            <ChevronDown />
          </Button>
        </div>

        <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {indexing
            ? `Lese Text … Seite ${indexing.done} von ${pageCount}`
            : !activeQuery
              ? null
              : !hasText
                ? 'Diese Anleitung enthält nur Bilder, keinen durchsuchbaren Text.'
                : hits.length === 0
                  ? `„${activeQuery}“ kommt nicht vor.`
                  : `${totalHits} Treffer auf ${hits.length} ${hits.length === 1 ? 'Seite' : 'Seiten'}${hitIndex >= 0 ? ` · hier ${hits[hitIndex]?.count}` : ''}`}
        </p>

        {hits.length > 1 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Seiten mit Treffern">
            {hits.map((hit) => (
              <button
                key={hit.page}
                type="button"
                role="listitem"
                title={hit.snippet}
                onClick={() => setPage(hit.page)}
                className={cn(
                  'shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums',
                  hit.page === page
                    ? 'border-edge bg-secondary text-secondary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                S. {hit.page}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="relative rounded-lg border border-border bg-muted/30 p-2">
        <div className="relative mx-auto">
          <canvas ref={canvasRef} aria-label={`${label}, Seite ${page}`} className="block" />
          {!loading
            ? highlights.map((box, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="pointer-events-none absolute rounded-sm bg-secondary/45 ring-2 ring-secondary"
                  style={{
                    left: `${box.left}%`,
                    top: `${box.top}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                />
              ))
            : null}
        </div>
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
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Seite
          <Input
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))}
            onBlur={goToTypedPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') goToTypedPage();
            }}
            inputMode="numeric"
            aria-label="Seitenzahl"
            className="h-8 w-14 px-1 text-center tabular-nums"
            disabled={pageCount === 0}
          />
          von {pageCount || '…'}
        </label>
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
