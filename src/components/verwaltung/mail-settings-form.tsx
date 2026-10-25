'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Save, Server, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteMailSettingsAction,
  saveMailSettingsAction,
} from '@/app/(app)/verwaltung/erinnerungen/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type MailSettingsFormView = {
  source: 'env' | 'app' | null;
  host: string;
  port: number;
  security: 'starttls' | 'tls' | 'none';
  user: string;
  from: string;
  hasPassword: boolean;
  passwordUnreadable: boolean;
};

const SECURITY_LABELS = {
  starttls: 'STARTTLS (meist Port 587)',
  tls: 'SSL/TLS (meist Port 465)',
  none: 'Unverschlüsselt (nur im eigenen Netz)',
} as const;

/** The SMTP server for reminders, set up right here instead of in the .env. */
export function MailSettingsForm({ view }: { view: MailSettingsFormView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [security, setSecurity] = useState(view.security);
  const [port, setPort] = useState(String(view.port));

  if (view.source === 'env') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5 text-primary" aria-hidden />
            Mailserver
          </CardTitle>
          <CardDescription>
            Kommt aus der .env und hat dort Vorrang. Ändern lässt er sich nur dort, danach den
            Container neu starten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Server:</span> {view.host}:{view.port} ·{' '}
            {SECURITY_LABELS[view.security].split(' (')[0]}
          </p>
          <p>
            <span className="text-muted-foreground">Absender:</span> {view.from}
          </p>
        </CardContent>
      </Card>
    );
  }

  function changeSecurity(next: 'starttls' | 'tls' | 'none') {
    setSecurity(next);
    // Follow the usual port while the user has not picked a special one.
    if (next === 'tls' && port === '587') setPort('465');
    if (next !== 'tls' && port === '465') setPort('587');
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await saveMailSettingsAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // The password never stays visible, not even as dots.
      const password = form.elements.namedItem('password');
      if (password instanceof HTMLInputElement) password.value = '';
      toast.success('Mailserver gespeichert. Prüf ihn gleich mit „Verbindung prüfen“.');
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMailSettingsAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Mailserver entfernt. Erinnerungen sind aus.');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="size-5 text-primary" aria-hidden />
          Mailserver
        </CardTitle>
        <CardDescription>
          Über diesen Server gehen die Erinnerungen raus. Die Angaben findest du bei deinem
          Mail-Anbieter unter „SMTP“ oder „Postausgangsserver“. Das Passwort wird verschlüsselt
          gespeichert und nie wieder angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="SMTP-Server" htmlFor="mail-host" required>
              <Input
                id="mail-host"
                name="host"
                defaultValue={view.host}
                placeholder="mail.example.de"
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Port" htmlFor="mail-port" required>
              <Input
                id="mail-port"
                name="port"
                inputMode="numeric"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Verschlüsselung" htmlFor="mail-security">
            <NativeSelect
              id="mail-security"
              name="security"
              value={security}
              onChange={(event) => changeSecurity(event.target.value as typeof security)}
            >
              {Object.entries(SECURITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Benutzername" htmlFor="mail-user">
              <Input
                id="mail-user"
                name="user"
                defaultValue={view.user}
                placeholder="bricktrack@example.de"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Passwort"
              htmlFor="mail-password"
             
              hint={
                view.passwordUnreadable
                  ? 'Das gespeicherte Passwort ist nicht mehr lesbar (BETTER_AUTH_SECRET wurde geändert). Bitte neu eingeben.'
                  : view.hasPassword
                    ? 'Gespeichert. Leer lassen, um es zu behalten.'
                    : undefined
              }
            >
              <Input
                id="mail-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={view.hasPassword ? '••••••••' : ''}
              />
            </Field>
          </div>

          {view.hasPassword ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="clearPassword" value="on" />
              Gespeichertes Passwort entfernen
            </label>
          ) : null}

          <Field
            label="Absender"
            htmlFor="mail-from"
            required
           
            hint="So steht es im Postfach, z. B. Bricktrack <bricktrack@example.de>."
          >
            <Input
              id="mail-from"
              name="from"
              defaultValue={view.from}
              placeholder="Bricktrack <bricktrack@example.de>"
              required
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              Speichern
            </Button>
            {view.source === 'app' ? (
              <Button type="button" variant="ghost" size="lg" onClick={remove} disabled={pending}>
                <Trash2 />
                Entfernen
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
