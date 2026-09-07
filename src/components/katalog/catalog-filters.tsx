'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { OWNERSHIP_FILTERS, OWNERSHIP_FILTER_LABELS } from '@/lib/ownership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type FilterOptions = {
  manufacturers: Array<{ id: string; name: string }>;
  themes: Array<{ id: string; name: string; manufacturerId: string }>;
  years: number[];
};

/**
 * Filters live in the URL, so every state of the catalog is a shareable link
 * and the back button behaves the way people expect.
 */
export function CatalogFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const manufacturerId = searchParams.get('hersteller') ?? '';
  const themeId = searchParams.get('thema') ?? '';
  const year = searchParams.get('jahr') ?? '';
  const ownership = searchParams.get('besitz') ?? 'alle';

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    // Any filter change starts over at page one.
    params.delete('seite');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // Debounced search so typing on a phone does not fire a request per keystroke.
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query === current) return;

    const timer = setTimeout(() => apply({ q: query || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const visibleThemes = manufacturerId
    ? options.themes.filter((theme) => theme.manufacturerId === manufacturerId)
    : options.themes;

  const hasFilters = Boolean(manufacturerId || themeId || year || query) || ownership !== 'alle';

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Setnummer, Name oder EAN"
          aria-label="Sets durchsuchen"
          className="pl-9"
        />
        {pending ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NativeSelect
          aria-label="Besitzstatus"
          value={ownership}
          onChange={(event) => apply({ besitz: event.target.value })}
        >
          {OWNERSHIP_FILTERS.map((value) => (
            <option key={value} value={value}>
              {OWNERSHIP_FILTER_LABELS[value]}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Hersteller"
          value={manufacturerId}
          onChange={(event) => apply({ hersteller: event.target.value || null, thema: null })}
        >
          <option value="">Alle Hersteller</option>
          {options.manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Thema"
          value={themeId}
          onChange={(event) => apply({ thema: event.target.value || null })}
        >
          <option value="">Alle Themen</option>
          {visibleThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Jahr"
          value={year}
          onChange={(event) => apply({ jahr: event.target.value || null })}
        >
          <option value="">Alle Jahre</option>
          {options.years.map((value) => (
            <option key={value} value={String(value)}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery('');
            startTransition(() => router.push(pathname));
          }}
        >
          <X />
          Filter zurücksetzen
        </Button>
      ) : null}
    </div>
  );
}
