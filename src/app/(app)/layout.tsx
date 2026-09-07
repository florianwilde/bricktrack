import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ensureReminderScheduler } from '@/lib/reminder-job';
import { requireUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Second entry point besides the healthcheck, in case someone turns that
  // off. The call is idempotent.
  ensureReminderScheduler();

  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      {/* Bottom padding keeps the mobile nav from covering the last row. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
