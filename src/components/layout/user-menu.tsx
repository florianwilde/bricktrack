'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { clearOfflineCaches } from '@/components/layout/service-worker';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SessionUser } from '@/lib/session';

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    // Cached pages must not stay readable on a shared device.
    await clearOfflineCaches();
    router.push('/anmelden');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Konto-Menü">
          <UserRound />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/konto">
            <UserRound />
            Konto und Passkeys
          </Link>
        </DropdownMenuItem>
        {user.role === 'admin' ? (
          <DropdownMenuItem asChild>
            <Link href="/verwaltung/hersteller">
              <Settings />
              Verwaltung
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
