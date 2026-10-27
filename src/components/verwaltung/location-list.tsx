'use client';

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLocation, deleteLocation, updateLocation } from '@/app/(app)/verwaltung/actions';
import { CrudSection, type CrudItem } from './crud-section';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type LocationRow = CrudItem & {
  parentLocationId: string | null;
};

export function LocationList({ locations }: { locations: LocationRow[] }) {
  return (
    <CrudSection<LocationRow>
      items={locations}
      emptyText="Noch kein Standort angelegt – zum Beispiel „Regal Kinderzimmer“ oder „Kiste Keller 3“."
      createLabel="Standort anlegen"
      dialogTitle={(item) => (item ? 'Standort bearbeiten' : 'Neuer Standort')}
      onCreate={createLocation}
      onUpdate={updateLocation}
      onDelete={deleteLocation}
      toolbar={
        locations.length > 0 ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/etiketten">
              <QrCode />
              Alle Etiketten drucken
            </Link>
          </Button>
        ) : null
      }
      renderActions={(item) => (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={`Etikett für ${item.title}`}
          title="Etikett mit QR-Code"
        >
          <Link href={`/etiketten?standort=${encodeURIComponent(item.id)}`}>
            <QrCode />
          </Link>
        </Button>
      )}
      deleteWarning={(item) =>
        `„${item.title}“ wird gelöscht. Sets an diesem Standort bleiben erhalten und haben danach keinen Standort mehr.`
      }
      renderFields={(item) => (
        <>
          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              defaultValue={item?.title ?? ''}
              required
              maxLength={80}
              placeholder="Regal Kinderzimmer"
            />
          </Field>
          <Field
            label="Liegt in"
            htmlFor="parentLocationId"
            hint="Optional, für Schachtelungen wie „Keller → Kiste 3“."
          >
            <NativeSelect
              id="parentLocationId"
              name="parentLocationId"
              defaultValue={item?.parentLocationId ?? 'none'}
            >
              <option value="none">– kein übergeordneter Standort –</option>
              {locations
                .filter((candidate) => candidate.id !== item?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        </>
      )}
    />
  );
}
