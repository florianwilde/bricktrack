'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 10;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
      return;
    }

    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setPending(false);

    if (error) {
      toast.error(error.message ?? 'Registrierung fehlgeschlagen.');
      return;
    }

    toast.success('Konto angelegt. Willkommen bei Bricktrack!');
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vorname"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="du@example.de"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Mindestens {MIN_PASSWORD_LENGTH} Zeichen. Einen Passkey kannst du direkt nach der
          Anmeldung unter „Konto“ hinterlegen.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Konto anlegen
      </Button>
    </form>
  );
}
