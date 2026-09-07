'use client';

import { createTheme, deleteTheme, updateTheme } from '@/app/(app)/verwaltung/actions';
import { CrudSection, type CrudItem } from './crud-section';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type ThemeRow = CrudItem & {
  manufacturerId: string;
  parentThemeId: string | null;
};

export function ThemeList({
  themes,
  manufacturers,
}: {
  themes: ThemeRow[];
  manufacturers: Array<{ id: string; name: string }>;
}) {
  return (
    <CrudSection<ThemeRow>
      items={themes}
      emptyText="Noch kein Thema angelegt. Themen sind Serien wie „City“, „Technic“ oder „Novelmore“."
      createLabel="Thema anlegen"
      dialogTitle={(item) => (item ? 'Thema bearbeiten' : 'Neues Thema')}
      onCreate={createTheme}
      onUpdate={updateTheme}
      onDelete={deleteTheme}
      deleteWarning={(item) =>
        `„${item.title}“ wird gelöscht. Das geht nur, solange dem Thema kein Set zugeordnet ist.`
      }
      renderFields={(item) => (
        <>
          <Field label="Hersteller" htmlFor="manufacturerId" required>
            <NativeSelect
              id="manufacturerId"
              name="manufacturerId"
              defaultValue={item?.manufacturerId ?? manufacturers[0]?.id ?? ''}
              required
            >
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Name" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={item?.title ?? ''} required maxLength={80} />
          </Field>
          <Field
            label="Oberthema"
            htmlFor="parentThemeId"
            hint="Optional, für Unterthemen wie „City → Feuerwehr“."
          >
            <NativeSelect
              id="parentThemeId"
              name="parentThemeId"
              defaultValue={item?.parentThemeId ?? 'none'}
            >
              <option value="none">– kein Oberthema –</option>
              {themes
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
