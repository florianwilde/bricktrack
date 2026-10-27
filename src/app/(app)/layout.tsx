import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { storedCollectorId } from '@/lib/collector-choice';
import { listCollectors } from '@/lib/queries/collectors';
import { isRebrickableEnabled } from '@/lib/rebrickable';
import { ensureReminderScheduler } from '@/lib/reminder-job';
import { requireUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Second entry point besides the healthcheck, in case someone turns that
  // off. The call is idempotent.
  ensureReminderScheduler();

  const user = await requireUser();
  const collectors = listCollectors().map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
  const legoImport = isRebrickableEnabled();

  return (
    <div className="flex min-h-dvh flex-col print:bg-white">
      <AppHeader
        user={user}
        collectors={collectors}
        storedCollectorId={(await storedCollectorId()) ?? null}
        legoImport={legoImport}
      />
      {/* Bottom padding keeps the mobile nav from covering the last row. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:pb-10 print:max-w-none print:p-0">{children}</main>
      <BottomNav legoImport={legoImport} />
    </div>
  );
}
