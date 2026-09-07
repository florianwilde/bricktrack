'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = searchParams.get('weiter') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'password' | 'passkey' | null>(null);

  useEffect(() => {
    // Conditional UI: offers matching passkeys straight from the browser's
    // autofill, where supported. Silently ignored everywhere else.
    if (!window.PublicKeyCredential?.isConditionalMediationAvailable) return;

    let cancelled = false;
    void window.PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
      if (!available || cancelled) return;
      void authClient.signIn
        .passkey({ autoFill: true })
        .then((result) => {
          if (cancelled || result?.error) return;
          router.push(target);
          router.refresh();
        })
        .catch(() => {
          /* user dismissed the autofill prompt */
        });
    });

    return () => {
      cancelled = true;
    };
  }, [router, target]);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('password');
    const { error } = await authClient.signIn.email({ email, password });
    setPending(null);

    if (error) {
      toast.error(
        error.status === 429
          ? 'Zu viele Versuche. Bitte warte einen Moment.'
          : 'E-Mail-Adresse oder Passwort stimmt nicht.',
      );
      return;
    }
    router.push(target);
    router.refresh();
  }

  async function signInWithPasskey() {
    setPending('passkey');
    const result = await authClient.signIn.passkey();
    setPending(null);

    if (!result || result.error) {
      toast.error('Anmeldung mit Passkey hat nicht geklappt.');
      return;
    }
    router.push(target);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={signInWithPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username webauthn"
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
            name="password"
            type="password"
            autoComplete="current-password webauthn"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending !== null}>
          {pending === 'password' ? <Loader2 className="animate-spin" /> : null}
          Anmelden
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        oder
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={signInWithPasskey}
        disabled={pending !== null}
      >
        {pending === 'passkey' ? <Loader2 className="animate-spin" /> : <Fingerprint />}
        Mit Passkey anmelden
      </Button>
    </div>
  );
}
