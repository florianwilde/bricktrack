'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { lookupScannedEan } from '@/app/(app)/katalog/scan-actions';
import { formatEan, isValidEan } from '@/lib/ean';
import { parseLocationLabel } from '@/lib/locations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Controls = { stop: () => void };

/**
 * Scans the barcode on a box with the phone camera.
 *
 * Decoding runs in the browser with zxing, which is bundled with the app and
 * loaded only when the scanner is opened - nothing leaves the device, and the
 * catalog pages stay light for everyone who never scans.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange: setOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const handledRef = useRef(false);

  const [status, setStatus] = useState<'starting' | 'scanning' | 'checking' | 'error'>('starting');
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const onDetected = useCallback(
    (raw: string) => {
      if (handledRef.current) return;

      // A box label of this instance: straight to what is inside.
      const label = parseLocationLabel(raw, window.location.origin);
      if (label) {
        handledRef.current = true;
        stop();
        setOpen(false);
        router.push(label);
        return;
      }

      if (!isValidEan(raw)) return; // keep scanning on a misread

      handledRef.current = true;
      stop();
      setStatus('checking');

      void lookupScannedEan(raw).then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          setOpen(false);
          return;
        }

        setOpen(false);

        if (result.data.found) {
          toast.success(`${result.data.setNumber} · ${result.data.name}`);
          router.push(`/katalog/${result.data.setId}`);
        } else {
          toast.info(`${formatEan(result.data.ean)} ist noch nicht im Katalog.`);
          router.push(`/katalog/neu?ean=${encodeURIComponent(result.data.ean)}`);
        }
        router.refresh();
      });
    },
    [router, setOpen, stop],
  );

  useEffect(() => {
    if (!open) return;

    handledRef.current = false;
    setStatus('starting');
    setMessage(null);

    // The camera needs a secure context - same rule as for passkeys.
    if (!window.isSecureContext) {
      setStatus('error');
      setMessage(
        'Die Kamera funktioniert nur über HTTPS. Ruf Bricktrack über deine Domain auf, nicht über die IP-Adresse.',
      );
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (!video || cancelled) return;

        const controls = await reader.decodeFromConstraints(
          // The rear camera is the one pointing at the box.
          { video: { facingMode: 'environment' } },
          video,
          (result) => {
            if (result) onDetected(result.getText());
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setStatus('scanning');
      } catch (error) {
        if (cancelled) return;
        console.error('[scan] Kamera konnte nicht gestartet werden', error);
        setStatus('error');

        const name = (error as { name?: string })?.name;
        setMessage(
          name === 'NotAllowedError'
            ? 'Der Zugriff auf die Kamera wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen und versuch es noch einmal.'
            : name === 'NotFoundError'
              ? 'Dieses Gerät hat keine nutzbare Kamera.'
              : 'Die Kamera lässt sich nicht starten.',
        );
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onDetected, stop]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stop();
        setOpen(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Barcode scannen</DialogTitle>
          <DialogDescription>
            Halte den Strichcode auf der Packung ins Bild. Kennt der Katalog das Set schon,
            landest du direkt darauf – sonst im Formular mit ausgefüllter EAN. Auch das
            QR-Etikett einer Kiste geht: dann siehst du, was darin liegt.
          </DialogDescription>
        </DialogHeader>

        {status === 'error' ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {message}
          </p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="aspect-[3/4] w-full object-cover"
              muted
              playsInline
              aria-label="Kamerabild"
            />
            {/* A guide line makes people hold the box the right way round. */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />

            {status !== 'scanning' ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
                <Loader2 className="size-4 animate-spin" />
                {status === 'checking' ? 'Im Katalog nachsehen …' : 'Kamera startet …'}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BarcodeScannerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Barcode scannen"
        title="Barcode scannen"
        onClick={() => setOpen(true)}
      >
        <ScanLine />
      </Button>
      <BarcodeScannerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
