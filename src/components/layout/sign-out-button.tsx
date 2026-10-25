'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { clearOfflineCaches } from '@/components/layout/service-worker';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    // Cached pages must not stay readable on a shared device.
    await clearOfflineCaches();
    router.push('/anmelden');
    router.refresh();
  }

  return (
    <Button variant="outline" size="lg" onClick={() => void signOut()} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Abmelden
    </Button>
  );
}
