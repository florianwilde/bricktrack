import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { InviteForm } from '@/components/auth/invite-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { findUsableInvite } from '@/lib/invites';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Einladung',
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  if (await getSession()) redirect('/');

  const { token } = await params;
  const invitation = findUsableInvite(token);

  if (!invitation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einladung ungültig</CardTitle>
          <CardDescription>
            Dieser Link ist abgelaufen oder wurde schon benutzt. Lass dir einfach einen neuen
            schicken.
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
        <CardTitle>Konto anlegen</CardTitle>
        <CardDescription>
          Du wurdest zu Bricktrack eingeladen. Der Link gilt noch bis zum{' '}
          {formatDate(invitation.expiresAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteForm token={token} email={invitation.email} />
      </CardContent>
    </Card>
  );
}
