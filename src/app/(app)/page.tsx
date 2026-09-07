import Link from 'next/link';
import { Boxes, Gift, LayoutGrid, PackageSearch } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/session';

const shortcuts = [
  {
    href: '/katalog',
    icon: LayoutGrid,
    title: 'Katalog',
    description: 'Alle bekannten Sets durchsuchen und neue anlegen.',
  },
  {
    href: '/katalog?besitz=fehlt',
    icon: PackageSearch,
    title: 'Fehlende Sets',
    description: 'Was noch nicht in der Sammlung ist – direkt auf die Wunschliste.',
  },
  {
    href: '/sammlung',
    icon: Boxes,
    title: 'Sammlung',
    description: 'Alles, was tatsächlich da ist – mit Standort und Zustand.',
  },
  {
    href: '/wunschlisten',
    icon: Gift,
    title: 'Wunschlisten',
    description: 'Listen anlegen und per Link mit Familie und Freunden teilen.',
  },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hallo {user.name}</h1>
        <p className="text-sm text-muted-foreground">Was möchtest du tun?</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <shortcut.icon className="size-6 text-primary" aria-hidden />
                <CardTitle>{shortcut.title}</CardTitle>
                <CardDescription>{shortcut.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
