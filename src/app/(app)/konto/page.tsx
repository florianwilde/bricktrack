import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { PasskeyManager, type PasskeyRow } from '@/components/auth/passkey-manager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Konto' };

export default async function AccountPage() {
  const user = await requireUser();

  const passkeys = await auth.api.listPasskeys({ headers: await headers() });
  const rows: PasskeyRow[] = passkeys.map((passkey) => ({
    id: passkey.id,
    name: passkey.name ?? null,
    createdAt: passkey.createdAt ? new Date(passkey.createdAt) : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Konto</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Diese Angaben stammen aus deiner Registrierung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">E-Mail</span>
            <span className="truncate font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Rolle</span>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {user.role === 'admin' ? 'Administrator' : 'Mitglied'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Passkeys sind an diese Domain gebunden und funktionieren nur über HTTPS. Du kannst
            beliebig viele Geräte hinterlegen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasskeyManager passkeys={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
