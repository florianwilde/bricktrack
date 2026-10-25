'use client';

import { useState, useTransition } from 'react';
import { BellRing, Loader2, Mail, PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import {
  runRemindersNow,
  sendTestMail,
  testMailConnection,
} from '@/app/(app)/verwaltung/erinnerungen/actions';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type ReminderListRow = {
  id: string;
  title: string;
  eventDate: Date | null;
  openItemCount: number;
  lastReminderAt: Date | null;
  daysLeft: number | null;
};

export function ReminderSettings({
  configured,
  daysBefore,
  lists,
}: {
  configured: boolean;
  daysBefore: number;
  lists: ReminderListRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'verify' | 'test' | 'run' | null>(null);

  function run(kind: 'verify' | 'test' | 'run') {
    setBusy(kind);
    startTransition(async () => {
      if (kind === 'verify') {
        const result = await testMailConnection();
        if (result.ok) toast.success('Der SMTP-Server antwortet.');
        else toast.error(result.error);
      }

      if (kind === 'test') {
        const result = await sendTestMail();
        if (result.ok) toast.success('Testnachricht verschickt. Schau in dein Postfach.');
        else toast.error(result.error);
      }

      if (kind === 'run') {
        const result = await runRemindersNow();
        if (!result.ok) {
          toast.error(result.error);
        } else if (result.data.sent === 0 && result.data.failures.length === 0) {
          toast.info('Nichts zu tun – gerade steht keine Erinnerung an.');
        } else {
          toast.success(
            `${result.data.sent} Erinnerung(en) verschickt, ${result.data.failures.length} fehlgeschlagen.`,
          );
        }
      }

      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" aria-hidden />
            Erinnerungen
          </CardTitle>
          <CardDescription>
            Rückt der Termin einer Wunschliste näher und stehen noch Wünsche offen, geht eine
            Nachricht an dich raus – {daysBefore} Tage vorher, höchstens einmal pro Woche je Liste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configured ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => run('verify')} disabled={pending}>
                {busy === 'verify' ? <Loader2 className="animate-spin" /> : <PlugZap />}
                Verbindung prüfen
              </Button>
              <Button variant="outline" onClick={() => run('test')} disabled={pending}>
                {busy === 'test' ? <Loader2 className="animate-spin" /> : <Mail />}
                Testnachricht an mich
              </Button>
              <Button onClick={() => run('run')} disabled={pending}>
                {busy === 'run' ? <Loader2 className="animate-spin" /> : <BellRing />}
                Jetzt prüfen
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p>
                Es ist noch kein Mailserver eingerichtet – Erinnerungen sind damit aus, alles andere
                funktioniert unverändert.
              </p>
              <p>Trag ihn unten unter „Mailserver“ ein. Ein Neustart ist nicht nötig.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wunschlisten mit Termin</CardTitle>
          <CardDescription>
            Nur Listen mit Termin können erinnert werden. Ist alles reserviert, bleibt es still.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Wunschliste hat bisher einen Termin.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {lists.map((list) => (
                <li key={list.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{list.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.eventDate ? formatDate(list.eventDate) : 'ohne Termin'}
                      {list.lastReminderAt
                        ? ` · zuletzt erinnert am ${formatDate(list.lastReminderAt)}`
                        : ''}
                    </p>
                  </div>

                  {list.openItemCount > 0 ? (
                    <Badge variant="outline">{list.openItemCount} offen</Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Alles vergeben
                    </Badge>
                  )}

                  {list.daysLeft !== null && list.daysLeft >= 0 ? (
                    <Badge variant="secondary">
                      {list.daysLeft === 0 ? 'heute' : `in ${list.daysLeft} Tagen`}
                    </Badge>
                  ) : (
                    <Badge variant="outline">vorbei</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
