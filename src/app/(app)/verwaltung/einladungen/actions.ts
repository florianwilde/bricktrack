'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionData, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { createInvite, deleteInvite, INVITE_VALID_DAYS } from '@/lib/invites';
import { requireAdmin } from '@/lib/session';
import { optionalText } from '@/lib/validation';

const schema = z.object({
  // Optional: when set, the invitation only works for that address.
  email: optionalText(160),
  role: z.enum(['admin', 'member']).default('member'),
  validDays: z.coerce.number().int().min(1).max(90).default(INVITE_VALID_DAYS),
});

export async function createInviteAction(
  input: unknown,
): Promise<ActionResult<{ token: string }>> {
  const admin = await requireAdmin();

  const parsed = parseForm(schema, input);
  if (!parsed.ok) return parsed;

  const created = createInvite({
    createdByUserId: admin.id,
    email: parsed.data.email,
    role: parsed.data.role,
    validDays: parsed.data.validDays,
  });

  revalidatePath('/verwaltung/einladungen');
  // The plaintext token is returned once and never stored - only its hash is.
  return actionData({ token: created.token });
}

export async function deleteInviteAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  deleteInvite(id);

  revalidatePath('/verwaltung/einladungen');
  return actionOk();
}
