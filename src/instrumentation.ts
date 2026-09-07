/**
 * Runs once when the server starts.
 *
 * Next calls this before handling the first request, which is the one place a
 * long-lived background task can be started from.
 */
export async function register() {
  // Only in the Node runtime - the edge runtime has no timers that survive,
  // and the dev server would start a second scheduler on every reload.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;

  const { startReminderScheduler } = await import('@/lib/reminder-job');
  startReminderScheduler();
}
