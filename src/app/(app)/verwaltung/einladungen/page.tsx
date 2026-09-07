import type { Metadata } from 'next';
import { InviteList, type InviteListRow } from '@/components/verwaltung/invite-list';
import { inviteState, listInvites } from '@/lib/invites';
import { requireAdmin } from '@/lib/session';

export const metadata: Metadata = { title: 'Einladungen' };

export default async function EinladungenPage() {
  await requireAdmin();

  const invites: InviteListRow[] = listInvites().map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    usedByName: row.usedByName,
    state: inviteState(row),
  }));

  return <InviteList invites={invites} />;
}
