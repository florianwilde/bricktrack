'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Hash, Link2, PencilLine, Plus, ScanLine, type LucideIcon } from 'lucide-react';
import { cn } from 'cn';
import { Studs } from '@/components/brick/studs';
import { BarcodeScannerDialog } from '@/components/katalog/barcode-scanner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type Action = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  href?: string;
};

/**
 * The plus in the middle of the navigation: every way a set gets into the
 * catalog, in one place. Opens as a sheet from the bottom.
 */
export function AddMenu({
  legoImport,
  variant = 'nav',
}: {
  /** Rebrickable is configured. */
  legoImport: boolean;
  variant?: 'nav' | 'button';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const actions: Action[] = [
    { id: 'scan', label: 'Scannen', hint: 'Strichcode der Packung', icon: ScanLine, tone: 'bg-tone-1' },
    {
      id: 'link',
      label: 'Aus Link',
      hint: 'Amazon, idealo, Shop',
      icon: Link2,
      tone: 'bg-tone-2',
      href: '/katalog/neu?weg=link',
    },
    ...(legoImport
      ? [
          {
            id: 'lego',
            label: 'Lego-Nummer',
            hint: 'über Rebrickable',
            icon: Hash,
            tone: 'bg-tone-3',
            href: '/katalog/neu?weg=lego',
          },
        ]
      : []),
    {
      id: 'hand',
      label: 'Von Hand',
      hint: 'alles selbst eintragen',
      icon: PencilLine,
      tone: 'bg-card',
      href: '/katalog/neu?weg=hand',
    },
  ];

  function run(action: Action) {
    setOpen(false);
    if (action.id === 'scan') {
      setScanning(true);
      return;
    }
    if (action.href) router.push(action.href);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {variant === 'nav' ? (
            <button
              type="button"
              aria-label="Neues Set"
              className="relative -mt-7 flex h-14 w-16 items-center justify-center rounded-[calc(var(--radius)*0.9)] border-[length:var(--edge-w)] border-edge bg-primary text-primary-foreground shadow-(--lift) outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0.5"
            >
              <Studs count={2} className="left-2.5 gap-3 [&>.stud]:w-3.5 [&>.stud]:bg-primary" />
              <Plus className={cn('size-7 transition-transform', open && 'rotate-45')} strokeWidth={3} />
            </button>
          ) : (
            <Button size="lg">
              <Plus />
              Neu
            </Button>
          )}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-[calc(var(--radius)*1.6)] border-t-[length:max(1px,var(--edge-w))] border-edge bg-background pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        >
          <SheetHeader>
            <SheetTitle className="text-xl">Was kommt dazu?</SheetTitle>
            <SheetDescription>Ein Set in den Katalog bringen – auf dem schnellsten Weg.</SheetDescription>
          </SheetHeader>
          <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-x-3 gap-y-5 px-4 pt-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => run(action)}
                className="relative text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Studs studClassName={action.tone} />
                <span
                  className={cn(
                    'brick flex h-full flex-col gap-1 rounded-xl p-3.5 text-foreground',
                    action.tone,
                    action.tone !== 'bg-card' && 'text-tone-ink',
                  )}
                >
                  <action.icon className="size-6" aria-hidden />
                  <span className="text-base font-bold">{action.label}</span>
                  <span className="text-xs font-semibold opacity-80">{action.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <BarcodeScannerDialog open={scanning} onOpenChange={setScanning} />
    </>
  );
}
