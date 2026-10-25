import 'server-only';
import { cookies } from 'next/headers';
import { resolveCollectorId } from '@/lib/queries/collectors';

/**
 * Which collector the app is looking at.
 *
 * The switch in the header remembers the choice per device (cookie), so Max's
 * tablet opens on Max. A `?sammler=` in the URL still wins - shared links and
 * the back button keep working - and `?sammler=alle` shows everybody.
 */

export const COLLECTOR_COOKIE = 'bricktrack-sammler';
export const ALL_COLLECTORS = 'alle';

export async function storedCollectorId(): Promise<string | undefined> {
  return resolveCollectorId((await cookies()).get(COLLECTOR_COOKIE)?.value);
}

export async function activeCollectorId(param: string | undefined): Promise<string | undefined> {
  if (param === ALL_COLLECTORS) return undefined;
  if (param) return resolveCollectorId(param);
  return storedCollectorId();
}
