'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { OWNERSHIP_FILTERS, OWNERSHIP_FILTER_LABELS } from '@/lib/ownership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { FilterTabs } from './filter-tabs';

export type FilterOptions = {
  manufacturers: Array<{ id: string; name: string }>;
  themes: Array<{ id: string; name: string; manufacturerId: string }>;
  years: number[];
};

/**
 * Filters live in the URL, so every state of the catalog is a shareable link
 * and the back button behaves the way people expect.
 *
 * Ownership and manufacturer are tabs: few options, picked often. Themes and
 * years can run into the dozens and stay selects. `showOwnership={false}` for
 * lists that are already narrowed to one ownership state.
 */
export function CatalogFilters({
  options,
  showOwnership = true,
}: {
  options: FilterOptions;
  showOwnership?: boolean;
}) {
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

      {showOwnership ? (
        <FilterTabs
          label="Besitzstatus"
          options={OWNERSHIP_FILTERS.map((value) => ({
            value,
            label: OWNERSHIP_FILTER_LABELS[value],
          }))}
          value={ownership}
          onChange={(value) => apply({ besitz: value === 'alle' ? null : value })}
        />
      ) : null}

      {options.manufacturers.length > 1 ? (
        <FilterTabs
          label="Hersteller"
          options={[
            { value: '', label: 'Alle Hersteller' },
            ...options.manufacturers.map((manufacturer) => ({
              value: manufacturer.id,
              label: manufacturer.name,
            })),
          ]}
          value={manufacturerId}
          onChange={(value) => apply({ hersteller: value || null, thema: null })}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
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
