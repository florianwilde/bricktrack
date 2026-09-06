'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Download, ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addInstructionPdf,
  addInstructionUrl,
  deleteInstruction,
} from '@/app/(app)/katalog/actions';
import { fileUrl } from '@/lib/images';
import { PdfViewer } from './pdf-viewer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type InstructionRow = {
  id: string;
  kind: 'pdf_upload' | 'external_url';
  filePath: string | null;
  url: string | null;
  label: string | null;
  fileSizeBytes: number | null;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function InstructionsSection({
  setId,
  instructions,
}: {
  setId: string;
  instructions: InstructionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [kind, setKind] = useState<'pdf_upload' | 'external_url'>('pdf_upload');
  const [viewing, setViewing] = useState<InstructionRow | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        kind === 'pdf_upload'
          ? await addInstructionPdf(setId, formData)
          : await addInstructionUrl(setId, Object.fromEntries(formData.entries()));

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Anleitung hinzugefügt.');
      setAddOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteInstruction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Anleitung entfernt.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {instructions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Anleitung hinterlegt. Lade das PDF hoch oder verlinke es beim Hersteller.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {instructions.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.label ?? (item.kind === 'pdf_upload' ? 'Anleitung' : 'Externe Anleitung')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.kind === 'pdf_upload' ? `PDF ${formatSize(item.fileSizeBytes)}` : 'Link'}
                </p>
              </div>

              {item.kind === 'pdf_upload' && item.filePath ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setViewing(item)}>
                    Ansehen
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm" aria-label="Herunterladen">
                    <a href={fileUrl(item.filePath)} download>
                      <Download />
                    </a>
                  </Button>
                </>
              ) : item.url ? (
                <Button asChild variant="outline" size="sm">
                  <a href={item.url} target="_blank" rel="noreferrer noopener">
                    Öffnen
                    <ExternalLink />
                  </a>
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Anleitung entfernen"
                onClick={() => remove(item.id)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" onClick={() => setAddOpen(true)}>
        <Plus />
        Anleitung hinzufügen
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anleitung hinzufügen</DialogTitle>
            <DialogDescription>
              Ein Set kann mehrere Anleitungen haben – zum Beispiel „Buch 1 von 3“.
            </DialogDescription>
          </DialogHeader>

          <form id="instruction-form" onSubmit={submit} className="space-y-4">
            <Field label="Art" htmlFor="instruction-kind">
              <NativeSelect
                id="instruction-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                <option value="pdf_upload">PDF hochladen</option>
                <option value="external_url">Link zur Anleitung</option>
              </NativeSelect>
            </Field>

            <Field label="Bezeichnung" htmlFor="label" hint="Optional, z. B. „Buch 1 von 3“.">
              <Input id="label" name="label" maxLength={80} />
            </Field>

            {kind === 'pdf_upload' ? (
              <Field label="PDF-Datei" htmlFor="file" required>
                <Input id="file" name="file" type="file" accept="application/pdf" required />
              </Field>
            ) : (
              <Field label="Adresse" htmlFor="url" required>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  inputMode="url"
                  required
                  placeholder="https://www.lego.com/…"
                />
              </Field>
            )}
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="instruction-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing?.label ?? 'Anleitung'}</DialogTitle>
          </DialogHeader>
          {viewing?.filePath ? (
            <PdfViewer url={fileUrl(viewing.filePath)} label={viewing.label ?? 'Anleitung'} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
