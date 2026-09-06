'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Check, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelReservation } from '@/app/w/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CancelReservation({
  shareToken,
  itemId,
  token,
  setName,
  setNumber,
  isReserved,
  listTitle,
}: {
  shareToken: string;
  itemId: string;
  token: string;
  setName: string;
  setNumber: string;
  isReserved: boolean;
  listTitle: string;
}) {
  const [done, setDone] = useState(!isReserved);
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelReservation(shareToken, itemId, token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone(true);
      toast.success('Reservierung aufgehoben.');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{done ? 'Nicht mehr reserviert' : 'Reservierung aufheben?'}</CardTitle>
        <CardDescription>
          {setNumber} · {setName} – aus der Liste „{listTitle}“.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <p className="flex items-center gap-2 text-sm text-emerald-600">
            <Check className="size-4" aria-hidden />
            Dieser Wunsch ist wieder für alle offen.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Danach kann jemand anderes das Geschenk übernehmen.
          </p>
        )}

        <div className="flex gap-2">
          {done ? null : (
            <Button onClick={cancel} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Undo2 />}
              Reservierung aufheben
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/w/${shareToken}`}>Zur Wunschliste</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
