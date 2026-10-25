'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importSetFromRebrickable } from '@/app/(app)/katalog/import-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * One-field Lego import: type the number from the box, get a finished catalog
 * entry. Hidden entirely when no API key is configured.
 */
export function RebrickableImport({ enabled, autoFocus }: { enabled: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [setNumber, setSetNumber] = useState('');
  const [pending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Lego-Import</CardTitle>
          <CardDescription>
            Mit einem Rebrickable-API-Key füllt sich das Formular von selbst: Setnummer eingeben,
            und Name, Jahr, Teile, Thema und Bild kommen automatisch. Dafür{' '}
            <code className="font-mono text-xs">REBRICKABLE_API_KEY</code> in die{' '}
            <code className="font-mono text-xs">.env</code> eintragen und den Container neu
            starten.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await importSetFromRebrickable(setNumber);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const missing = [
        result.data.imported.image ? null : 'Bild',
        result.data.imported.theme ? null : 'Thema',
      ].filter(Boolean);

      toast.success(
        missing.length === 0
          ? `${result.data.setNumber} „${result.data.name}“ übernommen.`
          : `${result.data.setNumber} übernommen – ohne ${missing.join(' und ')}.`,
      );

      router.push(`/katalog/${result.data.setId}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lego-Import</CardTitle>
        <CardDescription>
          Setnummer von der Packung eintippen – Name, Jahr, Teile, Minifiguren, Thema und Bild
          werden übernommen. Das Bild wird lokal gespeichert.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex items-end gap-2">
          <Field label="Setnummer" htmlFor="import-number" className="flex-1">
            <Input
              id="import-number"
              value={setNumber}
              onChange={(event) => setSetNumber(event.target.value)}
              placeholder="60398"
              inputMode="numeric"
              autoFocus={autoFocus}
              maxLength={40}
              className="font-mono"
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending || setNumber.trim().length === 0}>
            {pending ? <Loader2 className="animate-spin" /> : <Download />}
            Holen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
