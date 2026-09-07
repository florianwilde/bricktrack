'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { actionError, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { auth } from '@/lib/auth';
import { findUsableInvite, markInviteUsed, withInviteGrant } from '@/lib/invites';

const schema = z.object({
  token: z.string().trim().min(1),
  name: z.string().trim().min(1, 'Bitte gib deinen Namen an.').max(80),
  email: z.email('Bitte gib eine gültige E-Mail-Adresse an.'),
  password: z.string().min(10, 'Das Passwort braucht mindestens 10 Zeichen.'),
});

/**
 * Registration through an invitation link.
 *
 * The token is checked here, on the server, and only then is the sign-up
 * wrapped in a grant that the user-create hook can see. The role comes from
 * the invitation, never from the submitted form.
 */
export async function registerWithInvite(input: unknown): Promise<ActionResult> {
  const parsed = parseForm(schema, input);
  if (!parsed.ok) return parsed;

  const invitation = findUsableInvite(parsed.data.token);
  if (!invitation) {
    return actionError('Diese Einladung ist abgelaufen oder wurde bereits verwendet.');
  }

  if (invitation.email && invitation.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return actionError(`Diese Einladung gilt für ${invitation.email}.`);
  }

  const requestHeaders = await headers();

  try {
    const result = await withInviteGrant(
      { inviteId: invitation.id, role: invitation.role },
      () =>
        auth.api.signUpEmail({
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            password: parsed.data.password,
          },
          headers: requestHeaders,
        }),
    );

    markInviteUsed(invitation.id, result.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.toLowerCase().includes('exist')) {
      return actionError('Zu dieser E-Mail-Adresse gibt es schon ein Konto.');
    }
    console.error('[invite] Registrierung fehlgeschlagen', error);
    return actionError('Die Registrierung hat nicht geklappt. Bitte versuch es noch einmal.');
  }

  return actionOk();
}
