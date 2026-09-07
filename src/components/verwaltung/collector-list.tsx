'use client';

import {
  createCollector,
  deleteCollector,
  updateCollector,
} from '@/app/(app)/verwaltung/sammler/actions';
import { COLLECTOR_COLOR_LABELS } from '@/lib/collector-colors';
import { toDateInputValue } from '@/lib/format';
import { CrudSection, type CrudItem } from './crud-section';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export type CollectorRowItem = CrudItem & {
  color: string;
  birthday: Date | null;
  notes: string | null;
  itemCount: number;
};

export function CollectorList({ collectors }: { collectors: CollectorRowItem[] }) {
  return (
    <CrudSection<CollectorRowItem>
      items={collectors}
      emptyText="Noch kein Sammler angelegt."
      createLabel="Sammler anlegen"
      dialogTitle={(item) => (item ? 'Sammler bearbeiten' : 'Neuer Sammler')}
      dialogDescription="Der Katalog bleibt gemeinsam – Sammlung und Wunschlisten gehören je einem Sammler."
      onCreate={createCollector}
      onUpdate={updateCollector}
      onDelete={deleteCollector}
      deleteWarning={(item) =>
        item.itemCount > 0
          ? `„${item.title}“ hat ${item.itemCount} Sets in der Sammlung. Ordne sie erst jemand anderem zu – erst dann lässt sich der Sammler löschen.`
          : `„${item.title}“ wird gelöscht. Der Katalog bleibt unverändert.`
      }
      renderFields={(item) => (
        <>
          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              defaultValue={item?.title ?? ''}
              required
              maxLength={60}
              placeholder="Max"
            />
          </Field>

          <Field
            label="Farbe"
            htmlFor="color"
            hint="Nur zur Unterscheidung auf einen Blick."
          >
            <NativeSelect id="color" name="color" defaultValue={item?.color ?? 'blue'}>
              {Object.entries(COLLECTOR_COLOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Geburtstag" htmlFor="birthday" hint="Optional.">
            <Input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={toDateInputValue(item?.birthday)}
            />
          </Field>

          <Field label="Notizen" htmlFor="collector-notes">
            <Textarea
              id="collector-notes"
              name="notes"
              defaultValue={item?.notes ?? ''}
              rows={3}
            />
          </Field>
        </>
      )}
    />
  );
}
