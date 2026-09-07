'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createSet, updateSet } from '@/app/(app)/katalog/actions';
import {
  findDuplicateCandidates,
  type DuplicateCandidate,
} from '@/app/(app)/katalog/duplicate-actions';
import { centsToInput } from '@/lib/money';
import { setImageSrc } from '@/lib/images';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export type SetFormValues = {
  id: string;
  manufacturerId: string;
  themeId: string | null;
  setNumber: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  minifigCount: number | null;
  ean: string | null;
  ageRange: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  retailPriceCents: number | null;
  notes: string | null;
};

type Props = {
  manufacturers: Array<{ id: string; name: string }>;
  themes: Array<{ id: string; name: string; manufacturerId: string }>;
  set?: SetFormValues;
  /** Prefilled EAN coming from the barcode scanner (phase 2). */
  defaultEan?: string;
};

export function SetForm({ manufacturers, themes, set, defaultEan }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [manufacturerId, setManufacturerId] = useState(
    set?.manufacturerId ?? manufacturers[0]?.id ?? '',
  );
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const pendingForm = useRef<FormData | null>(null);

  const existingImage = set ? setImageSrc(set) : null;
  const availableThemes = themes.filter((theme) => theme.manufacturerId === manufacturerId);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Ask before creating something that already exists. Editing skips this:
    // there the entry is the one we would be warning about.
    if (!set) {
      startTransition(async () => {
        const check = await findDuplicateCandidates({
          manufacturerId: String(formData.get('manufacturerId') ?? ''),
          setNumber: String(formData.get('setNumber') ?? ''),
          name: String(formData.get('name') ?? ''),
        });

        if (check.ok && check.data.candidates.length > 0) {
          pendingForm.current = formData;
          setDuplicates(check.data.candidates);
          return;
        }

        await save(formData);
      });
      return;
    }

    startTransition(() => save(formData));
  }

  async function save(formData: FormData) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        if (set) {
          const result = await updateSet(set.id, formData);
          if (!result.ok) {
            toast.error(result.error);
            resolve();
            return;
          }
          toast.success('Set gespeichert.');
          router.push(`/katalog/${set.id}`);
          router.refresh();
          resolve();
          return;
        }

        const result = await createSet(formData);
        if (!result.ok) {
          toast.error(result.error);
          resolve();
          return;
        }
        toast.success('Set angelegt.');
        router.push(`/katalog/${result.data.id}`);
        router.refresh();
        resolve();
      });
    });
  }

  const REASON_LABELS: Record<DuplicateCandidate['reason'], string> = {
    'same-number': 'Gleiche Setnummer beim gleichen Hersteller',
    'similar-name': 'Sehr ähnlicher Name',
    'number-elsewhere': 'Gleiche Setnummer bei einem anderen Hersteller',
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hersteller" htmlFor="manufacturerId" required>
          <NativeSelect
            id="manufacturerId"
            name="manufacturerId"
            value={manufacturerId}
            onChange={(event) => setManufacturerId(event.target.value)}
            required
          >
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Thema" htmlFor="themeId" hint="Optional.">
          <NativeSelect id="themeId" name="themeId" defaultValue={set?.themeId ?? 'none'}>
            <option value="none">– kein Thema –</option>
            {availableThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Setnummer" htmlFor="setNumber" required hint="Die Nummer des Herstellers.">
          <Input
            id="setNumber"
            name="setNumber"
            defaultValue={set?.setNumber ?? ''}
            required
            maxLength={40}
            placeholder="60398"
            className="font-mono"
          />
        </Field>

        <Field label="Name" htmlFor="name" required className="sm:col-span-1">
          <Input
            id="name"
            name="name"
            defaultValue={set?.name ?? ''}
            required
            maxLength={160}
            placeholder="Familienhaus und Elektroauto"
          />
        </Field>

        <Field label="Jahr" htmlFor="year">
          <Input
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            defaultValue={set?.year ?? ''}
            min={1930}
            max={new Date().getFullYear() + 5}
          />
        </Field>

        <Field label="Teile" htmlFor="pieceCount">
          <Input
            id="pieceCount"
            name="pieceCount"
            type="number"
            inputMode="numeric"
            defaultValue={set?.pieceCount ?? ''}
            min={0}
          />
        </Field>

        <Field label="Minifiguren" htmlFor="minifigCount">
          <Input
            id="minifigCount"
            name="minifigCount"
            type="number"
            inputMode="numeric"
            defaultValue={set?.minifigCount ?? ''}
            min={0}
          />
        </Field>

        <Field label="UVP" htmlFor="retailPriceCents" hint="In Euro, z. B. 89,99.">
          <Input
            id="retailPriceCents"
            name="retailPriceCents"
            inputMode="decimal"
            defaultValue={centsToInput(set?.retailPriceCents)}
            placeholder="89,99"
          />
        </Field>

        <Field label="EAN" htmlFor="ean" hint="Der Strichcode auf der Verpackung.">
          <Input
            id="ean"
            name="ean"
            inputMode="numeric"
            defaultValue={set?.ean ?? defaultEan ?? ''}
            maxLength={20}
            className="font-mono"
          />
        </Field>

        <Field label="Alter" htmlFor="ageRange" hint="Zum Beispiel 6-12.">
          <Input id="ageRange" name="ageRange" defaultValue={set?.ageRange ?? ''} maxLength={20} />
        </Field>
      </div>

      <Field
        label="Bild-URL"
        htmlFor="imageUrl"
        hint="Wird nur verwendet, wenn kein Bild hochgeladen ist."
      >
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          inputMode="url"
          defaultValue={set?.imageUrl ?? ''}
          placeholder="https://…"
        />
      </Field>

      <div className="space-y-2">
        <Label htmlFor="image">Bild hochladen</Label>
        {existingImage ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingImage}
              alt=""
              className="size-20 rounded-lg border border-border object-contain"
            />
            {set?.imagePath ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="removeImage" value="on" />
                Hochgeladenes Bild entfernen
              </label>
            ) : null}
          </div>
        ) : null}
        <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG oder WebP. Das Bild wird beim Speichern verkleinert und lokal abgelegt.
        </p>
      </div>

      <Field label="Notizen" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={set?.notes ?? ''} rows={4} />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {set ? 'Speichern' : 'Set anlegen'}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Abbrechen
        </Button>
      </div>
      </form>

      <AlertDialog
        open={duplicates !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicates(null);
            pendingForm.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gibt es das vielleicht schon?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Einträge sehen ähnlich aus. Schau kurz nach, bevor der Katalog zwei Mal
              dasselbe Set enthält.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {(duplicates ?? []).map((candidate) => (
              <li key={candidate.id} className="p-3">
                <Link
                  href={`/katalog/${candidate.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {candidate.setNumber} · {candidate.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {candidate.manufacturerName} — {REASON_LABELS[candidate.reason]}
                </p>
              </li>
            ))}
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel>Zurück zum Formular</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const formData = pendingForm.current;
                setDuplicates(null);
                pendingForm.current = null;
                if (formData) void save(formData);
              }}
            >
              Trotzdem anlegen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
