'use client';

import {
  createManufacturer,
  deleteManufacturer,
  updateManufacturer,
} from '@/app/(app)/verwaltung/actions';
import { CrudSection, type CrudItem } from './crud-section';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type ManufacturerRow = CrudItem & {
  website: string | null;
  setCount: number;
};

export function ManufacturerList({ manufacturers }: { manufacturers: ManufacturerRow[] }) {
  return (
    <CrudSection<ManufacturerRow>
      items={manufacturers}
      emptyText="Noch kein Hersteller angelegt. Lego, Playmobil, Cobi – leg einfach los."
      createLabel="Hersteller anlegen"
      dialogTitle={(item) => (item ? 'Hersteller bearbeiten' : 'Neuer Hersteller')}
      dialogDescription="Der Name erscheint als Badge auf jeder Set-Kachel."
      onCreate={createManufacturer}
      onUpdate={updateManufacturer}
      onDelete={deleteManufacturer}
      deleteWarning={(item) =>
        `„${item.title}“ wird gelöscht. Das geht nur, solange kein Set diesen Hersteller nutzt.`
      }
      renderFields={(item) => (
        <>
          <Field label="Name" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={item?.title ?? ''} required maxLength={80} />
          </Field>
          <Field
            label="Website"
            htmlFor="website"
            hint="Optional. Wird auf der öffentlichen Wunschliste als Link zum Shop angeboten."
          >
            <Input
              id="website"
              name="website"
              type="url"
              inputMode="url"
              defaultValue={item?.website ?? ''}
              placeholder="https://www.lego.com"
            />
          </Field>
        </>
      )}
    />
  );
}
