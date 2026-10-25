import type { Metadata } from 'next';
import Link from 'next/link';
import { cn } from 'cn';
import { Studs } from '@/components/brick/studs';
import { MORE_GROUPS, moreItemsFor } from '@/components/layout/more-items';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Mehr' };

const GROUP_TONES: Record<string, string> = {
  ich: 'bg-tone-1',
  familie: 'bg-tone-2',
  katalog: 'bg-tone-3',
  daten: 'bg-tone-4',
};

export default async function MehrPage() {
  const user = await requireUser();
  const items = moreItemsFor(user.role);

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · {user.role === 'admin' ? 'Administrator' : 'Mitglied'}
          </p>
        </div>
      </div>

      {MORE_GROUPS.map((group) => {
        const entries = items.filter((item) => item.group === group.id);
        if (entries.length === 0) return null;
        return (
          <section key={group.id} className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              {group.label}
            </h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
              {entries.map((item) => (
                <li key={item.href} className="relative">
                  <Studs studClassName={GROUP_TONES[group.id]} />
                  <Link
                    href={item.href}
                    className={cn(
                      'brick flex h-full flex-col gap-1 rounded-xl p-3.5 text-tone-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      GROUP_TONES[group.id],
                    )}
                  >
                    <item.icon className="size-6" aria-hidden />
                    <span className="font-bold">{item.label}</span>
                    <span className="text-xs leading-snug opacity-80">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <SignOutButton />
    </div>
  );
}
