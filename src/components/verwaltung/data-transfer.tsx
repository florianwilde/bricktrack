'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { importArchiveAction } from '@/app/(app)/verwaltung/daten/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const CONFIRMATION = 'ERSETZEN';

export function DataTransfer() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      const result = await importArchiveAction(new FormData(form));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Eingelesen: ${result.data.sets} Sets, ${result.data.collectionItems} Sammlungseinträge, ${result.data.wishlists} Wunschlisten, ${result.data.files} Dateien.`,
      );
      form.reset();
      setConfirmation('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exportieren</CardTitle>
          <CardDescription>
            Zum Umziehen, zum Nachsehen außerhalb der App oder als zweites Netz. Das eigentliche
            Backup bleibt das Verzeichnis <code className="font-mono text-xs">./data</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <a href="/api/export/zip" download>
              <Download />
              Alles als ZIP
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/api/export/json" download>
              <FileText />
              Nur Daten (JSON)
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/api/export/csv" download>
              <FileSpreadsheet />
              Sammlung als CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Was im Export steckt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Dabei:</span> Hersteller, Themen, Sets,
            Anleitungen, Standorte, Sammlungseinträge, Fehlteile, Fotos und Wunschlisten – im ZIP
            zusätzlich alle hochgeladenen Dateien.
          </p>
          <p>
            <span className="font-medium text-foreground">Nicht dabei:</span> Konten, Passwörter
            und Passkeys. Ein Export voller Passwort-Hashes im Download-Ordner wäre ein Risiko,
            kein Backup. Ebenfalls draußen: Reservierungen und Teilen-Links – die gehören zu der
            Instanz, auf der sie entstanden sind.
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            Importieren
          </CardTitle>
          <CardDescription>
            Ein Import <strong>ersetzt</strong> alle vorhandenen Daten – Katalog, Sammlung und
            Wunschlisten. Zusammenführen ist nicht möglich. Wunschlisten gehören danach dir und
            sind zunächst nicht geteilt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Archiv" htmlFor="archive" required>
              <Input id="archive" name="archive" type="file" accept=".zip,application/zip" required />
            </Field>

            <Field
              label={`Zum Bestätigen ${CONFIRMATION} eintippen`}
              htmlFor="confirmation"
              required
            >
              <Input
                id="confirmation"
                name="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={CONFIRMATION}
                autoComplete="off"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              variant="destructive"
              disabled={pending || confirmation !== CONFIRMATION}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Upload />}
              Daten ersetzen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
