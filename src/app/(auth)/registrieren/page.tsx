import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isFirstRun } from '@/lib/auth';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Registrieren' };

export default async function RegisterPage() {
  if (await getSession()) redirect('/');

  // After the first user, accounts only come from an invitation link.
  if (!isFirstRun()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrierung geschlossen</CardTitle>
          <CardDescription>
            Diese Bricktrack-Instanz hat bereits einen Administrator. Weitere Konten entstehen nur
            über einen Einladungslink.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/anmelden" className="text-sm underline underline-offset-4">
            Zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Erstes Konto anlegen</CardTitle>
        <CardDescription>
          Du bist der erste Nutzer und wirst damit automatisch Administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
