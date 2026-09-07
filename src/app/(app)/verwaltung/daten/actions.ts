'use server';

import { revalidatePath } from 'next/cache';
import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import { importArchive, ImportError, type ImportSummary } from '@/lib/export';
import { requireAdmin } from '@/lib/session';

const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;

/** Typed by hand before anything is deleted. */
const CONFIRMATION = 'ERSETZEN';

export async function importArchiveAction(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const admin = await requireAdmin();

  if (formData.get('confirmation') !== CONFIRMATION) {
    return actionError(`Bitte tipp ${CONFIRMATION} ein, um den Austausch zu bestätigen.`);
  }

  const file = formData.get('archive');
  if (!(file instanceof File) || file.size === 0) {
    return actionError('Bitte wähle ein Bricktrack-Archiv (.zip) aus.');
  }
  if (file.size > MAX_ARCHIVE_BYTES) {
    return actionError('Das Archiv ist größer als 512 MB und wird nicht eingelesen.');
  }

  try {
    const summary = importArchive(
      new Uint8Array(await file.arrayBuffer()),
      admin.id,
    );

    revalidatePath('/', 'layout');
    return actionData(summary);
  } catch (error) {
    if (error instanceof ImportError) return actionError(error.message);
    console.error('[import] Archiv konnte nicht eingelesen werden', error);
    return actionError(
      'Das Archiv konnte nicht eingelesen werden. Die vorhandenen Daten wurden nicht verändert.',
    );
  }
}
