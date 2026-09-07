'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { COMPLETENESS_LABELS, STATUS_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export function CollectionFilters({
  locations,
  manufacturers,
}: {
  locations: Array<{ id: string; name: string }>;
  manufacturers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query === current) return;
    const timer = setTimeout(() => apply({ q: query || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = [...searchParams.keys()].length > 0;

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
          placeholder="Setnummer oder Name"
          aria-label="Sammlung durchsuchen"
          className="pl-9"
        />
        {pending ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NativeSelect
          aria-label="Status"
          value={searchParams.get('status') ?? ''}
          onChange={(event) => apply({ status: event.target.value || null })}
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Vollständigkeit"
          value={searchParams.get('zustand') ?? ''}
          onChange={(event) => apply({ zustand: event.target.value || null })}
        >
          <option value="">Alle Vollständigkeiten</option>
          {Object.entries(COMPLETENESS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Standort"
          value={searchParams.get('standort') ?? ''}
          onChange={(event) => apply({ standort: event.target.value || null })}
        >
          <option value="">Alle Standorte</option>
          {locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Hersteller"
          value={searchParams.get('hersteller') ?? ''}
          onChange={(event) => apply({ hersteller: event.target.value || null })}
        >
          <option value="">Alle Hersteller</option>
          {manufacturers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
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
