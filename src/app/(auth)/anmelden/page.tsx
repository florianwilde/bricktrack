import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { isFirstRun } from '@/lib/auth';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Anmelden' };

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  // Nobody registered yet: send the very first visitor straight to sign-up.
  if (isFirstRun()) redirect('/registrieren');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <CardDescription>Melde dich an, um die Sammlung zu verwalten.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          Noch kein Konto?{' '}
          <Link href="/registrieren" className="underline underline-offset-4">
            Registrierung
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
