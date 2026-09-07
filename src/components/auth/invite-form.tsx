'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { registerWithInvite } from '@/app/(auth)/einladung/[token]/actions';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const MIN_PASSWORD_LENGTH = 10;

export function InviteForm({ token, email }: { token: string; email: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget).entries());

    startTransition(async () => {
      const result = await registerWithInvite({ ...input, token });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Konto angelegt. Willkommen bei Bricktrack!');
      router.push('/');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name" htmlFor="name" required>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} />
      </Field>

      <Field
        label="E-Mail"
        htmlFor="email"
        required
        hint={email ? 'Diese Einladung gilt für genau diese Adresse.' : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          defaultValue={email ?? ''}
          readOnly={Boolean(email)}
        />
      </Field>

      <Field
        label="Passwort"
        htmlFor="password"
        required
        hint={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen. Einen Passkey kannst du danach unter „Konto“ hinterlegen.`}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Konto anlegen
      </Button>
    </form>
  );
}
