'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { previewSetFromLink, type LinkPreview } from '@/app/(app)/katalog/link-actions';
import { SetForm, type SetPrefill } from '@/components/katalog/set-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function toPrefill(preview: LinkPreview): SetPrefill {
  return {
    manufacturerId: preview.manufacturerId ?? undefined,
    setNumber: preview.setNumber || undefined,
    name: preview.name || undefined,
    year: preview.year,
    pieceCount: preview.pieceCount,
    minifigCount: preview.minifigCount,
    ean: preview.ean || null,
    imageUrl: preview.imageUrl || null,
    cacheImage: Boolean(preview.imageUrl),
    notes: `Übernommen aus: ${preview.sourceUrl}`,
  };
}

/**
 * "Neues Set" with the link import on top: paste a link from a shop, a price
 * comparison or a set database, check the prefilled form, save.
 */
export function NewSetEntry({
  manufacturers,
  themes,
  defaultEan,
  children,
}: {
  manufacturers: Array<{ id: string; name: string }>;
  themes: Array<{ id: string; name: string; manufacturerId: string }>;
  defaultEan?: string;
  /** Shown instead of the form while there is no manufacturer yet. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [prefill, setPrefill] = useState<SetPrefill | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [existing, setExisting] = useState<{ id: string; label: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExisting(null);

    startTransition(async () => {
      const result = await previewSetFromLink({ url });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const preview = result.data;
      if (preview.existingSetId) {
        setExisting({
          id: preview.existingSetId,
          label: [preview.setNumber, preview.name].filter(Boolean).join(' · '),
        });
        return;
      }

      setPrefill(toPrefill(preview));
      setVersion((value) => value + 1);
      // A manufacturer may just have been created for the draft.
      router.refresh();

      const missing = [
        preview.manufacturerId ? null : 'Hersteller',
        preview.setNumber ? null : 'Setnummer',
        preview.name ? null : 'Name',
      ].filter(Boolean);

      toast.success(
        missing.length === 0
          ? `Übernommen aus ${preview.sources.join(', ')}. Bitte kurz prüfen und speichern.`
          : `Übernommen aus ${preview.sources.join(', ')} – ${missing.join(', ')} bitte ergänzen.`,
      );
      if (preview.pageBlocked) {
        toast.info('Die Seite selbst ließ sich nicht lesen – die Angaben stammen aus dem Link.');
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Aus einem Link übernehmen</CardTitle>
          <CardDescription>
            Link zu Amazon, idealo, geizhals, zum Shop des Herstellers oder zu einer Set-Datenbank
            einfügen. Die Angaben landen im Formular unten – gespeichert wird erst, wenn du es
            sagst.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={submit} className="flex items-end gap-2">
            <Field label="Link" htmlFor="import-link" className="flex-1">
              <Input
                id="import-link"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
                maxLength={2000}
              />
            </Field>
            <Button type="submit" size="lg" disabled={pending || url.trim().length === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
              Übernehmen
            </Button>
          </form>

          {existing ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              Das Set ist schon im Katalog:{' '}
              <Link href={`/katalog/${existing.id}`} className="font-semibold underline">
                {existing.label}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {prefill ? 'Bitte prüfen und speichern' : 'oder von Hand'}
        <span className="h-px flex-1 bg-border" />
      </div>

      {manufacturers.length === 0 ? (
        children
      ) : (
        <SetForm
          key={`${version}-${manufacturers.length}`}
          manufacturers={manufacturers}
          themes={themes}
          defaultEan={defaultEan}
          prefill={prefill}
        />
      )}
    </>
  );
}
