'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const idSchema = z.object({ id: z.string().min(1) });
const renameSchema = idSchema.extend({ name: z.string().trim().min(1).max(60) });

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deletePasskeyAction(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Ungültige Anfrage.' };

  try {
    await auth.api.deletePasskey({
      body: { id: parsed.data.id },
      headers: await headers(),
    });
  } catch {
    return { ok: false, error: 'Der Passkey konnte nicht gelöscht werden.' };
  }

  revalidatePath('/konto');
  return { ok: true };
}

export async function renamePasskeyAction(input: unknown): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Bitte gib einen Namen an (max. 60 Zeichen).' };

  try {
    await auth.api.updatePasskey({
      body: { id: parsed.data.id, name: parsed.data.name },
      headers: await headers(),
    });
  } catch {
    return { ok: false, error: 'Der Passkey konnte nicht umbenannt werden.' };
  }

  revalidatePath('/konto');
  return { ok: true };
}
