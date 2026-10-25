'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { env } from '@/env';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';
import { COLLECTOR_COOKIE } from '@/lib/collector-choice';
import { resolveCollectorId } from '@/lib/queries/collectors';
import { requireUser } from '@/lib/session';

const schema = z.object({ id: z.string().max(64) });

/** Remembers the collector chosen in the header; an empty id means "alle". */
export async function chooseCollectorAction(input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError('Ungültige Auswahl.');

  const store = await cookies();
  if (parsed.data.id === '') {
    store.delete(COLLECTOR_COOKIE);
  } else {
    const id = resolveCollectorId(parsed.data.id);
    if (!id) return actionError('Diesen Sammler gibt es nicht mehr.');
    store.set(COLLECTOR_COOKIE, id, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath('/', 'layout');
  return actionOk();
}
