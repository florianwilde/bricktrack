'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Check, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import {
  addInventoryToCollection,
  lookupInventoryCodes,
} from '@/app/(app)/sammlung/inventory-actions';
import { formatEan, isValidEan, normalizeEan } from '@/lib/ean';
import {
  applyLookups,
  isCameraRepeat,
  markAdded,
  parseStoredInventory,
  pendingEans,
  readyToAdd,
  registerScan,
  setCount,
  unknownEntries,
  type InventoryEntry,
  type LastScan,
} from '@/lib/inventory';
import { parseLocationLabel } from '@/lib/locations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

const STORAGE_KEY = 'bricktrack-inventur';

type Controls = { stop: () => void };
type CameraState = 'off' | 'starting' | 'scanning' | 'error';

/**
 * Inventory: scan box after box, decide afterwards.
 *
 * The camera stays on while you work through a shelf; every code lands in a
 * list that survives a reload, so creating a missing set in between costs
 * nothing. Scanning a box label sets the storage place for what follows.
 */
export function InventoryScanner({
  collectors,
  locations,
  initialCollectorId,
}: {
  collectors: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; label: string }>;
  initialCollectorId: string | null;
}) {
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collectorId, setCollectorId] = useState(initialCollectorId ?? collectors[0]?.id ?? '');
  const [locationId, setLocationId] = useState('');
  const [manual, setManual] = useState('');
  const [camera, setCamera] = useState<CameraState>('off');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const lastRef = useRef<LastScan>(null);

  // The list lives in this browser only - an inventory is one person's job.
  useEffect(() => {
    try {
      // Unknown codes are asked again: the set may have been created meanwhile.
      setEntries(
        parseStoredInventory(window.localStorage.getItem(STORAGE_KEY)).map((entry) =>
          entry.status === 'unknown' ? { ...entry, status: 'pending' } : entry,
        ),
      );
    } catch {
      // Storage blocked: the list simply starts empty.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Not fatal; the list just does not survive a reload.
    }
  }, [entries, loaded]);

  // Ask the catalog about every new code, a few at a time.
  const pending = pendingEans(entries).join(',');
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(async () => {
      const result = await lookupInventoryCodes({
        eans: pending.split(','),
        collectorId: collectorId || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntries((current) => applyLookups(current, result.data));
    }, 250);
    return () => clearTimeout(timer);
  }, [pending, collectorId]);

  const handleCode = useCallback(
    (raw: string) => {
      const label = parseLocationLabel(raw, window.location.origin);
      if (label) {
        const id = new URL(label, window.location.origin).searchParams.get('standort');
        const place = locations.find((entry) => entry.id === id);
        if (place && place.id !== locationId) {
          setLocationId(place.id);
          toast.success(`Standort: ${place.label}`);
        }
        return;
      }

      const ean = normalizeEan(raw);
      if (!isValidEan(ean)) return; // a misread - keep scanning

      // The cooldown is decided here, once per detection; the state update
      // itself stays pure (React may run it twice).
      const now = Date.now();
      const repeat = isCameraRepeat(lastRef.current, ean, now);
      lastRef.current = { ean, at: now };
      if (repeat) return;
      navigator.vibrate?.(40);
      setEntries((current) => registerScan(current, ean, now, null).entries);
    },
    [locations, locationId],
  );

  // The decoder calls back on every frame; it reads the latest handler from here.
  const handleRef = useRef(handleCode);
  useEffect(() => {
    handleRef.current = handleCode;
  }, [handleCode]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamera('off');
  }, []);

  async function startCamera() {
    if (!window.isSecureContext) {
      setCamera('error');
      setCameraMessage('Die Kamera funktioniert nur über HTTPS. Ruf Bricktrack über deine Domain auf.');
      return;
    }
    setCamera('starting');
    setCameraMessage(null);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const video = videoRef.current;
      if (!video) return;
      const controls = await new BrowserMultiFormatReader().decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result) => {
          if (result) handleRef.current(result.getText());
        },
      );
      controlsRef.current = controls;
      setCamera('scanning');
    } catch (error) {
      const name = (error as { name?: string })?.name;
      setCamera('error');
      setCameraMessage(
        name === 'NotAllowedError'
          ? 'Der Zugriff auf die Kamera wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen.'
          : name === 'NotFoundError'
            ? 'Dieses Gerät hat keine nutzbare Kamera. Die Nummer lässt sich unten auch eintippen.'
            : 'Die Kamera lässt sich nicht starten.',
      );
    }
  }

  useEffect(() => stopCamera, [stopCamera]);

  function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ean = normalizeEan(manual);
    if (!isValidEan(ean)) {
      toast.error('Das ist keine gültige EAN – bitte die Ziffern unter dem Strichcode prüfen.');
      return;
    }
    // Typed codes are always deliberate, so the camera cooldown does not apply.
    lastRef.current = null;
    handleCode(ean);
    setManual('');
  }

  async function add(selection: InventoryEntry[]) {
    if (selection.length === 0) return;
    setBusy(true);
    const result = await addInventoryToCollection({
      items: selection.map((entry) => ({ setId: entry.setId ?? '', quantity: entry.count })),
      collectorId: collectorId || undefined,
      locationId: locationId || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEntries((current) => markAdded(current, selection.map((entry) => entry.ean)));
    toast.success(
      result.data.added === 1 ? 'Ein Set in die Sammlung übernommen.' : `${result.data.added} Sets in die Sammlung übernommen.`,
    );
  }

  const ready = readyToAdd(entries);
  const unknown = unknownEntries(entries);
  const readyCount = ready.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {collectors.length > 1 ? (
          <Field label="Für wen?" htmlFor="inventory-collector">
            <NativeSelect
              id="inventory-collector"
              value={collectorId}
              onChange={(event) => setCollectorId(event.target.value)}
            >
              {collectors.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field
          label="Standort"
          htmlFor="inventory-location"
          hint="Oder das QR-Etikett der Kiste scannen."
        >
          <NativeSelect
            id="inventory-location"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">– kein Standort –</option>
            {locations.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="space-y-3">
        <div className={cn('relative overflow-hidden rounded-lg bg-black', camera === 'off' || camera === 'error' ? 'hidden' : '')}>
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
            aria-label="Kamerabild"
          />
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
          {camera === 'starting' ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
              <Loader2 className="size-4 animate-spin" />
              Kamera startet …
            </div>
          ) : null}
        </div>
        {cameraMessage ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {cameraMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {camera === 'scanning' || camera === 'starting' ? (
            <Button variant="outline" onClick={stopCamera}>
              <CameraOff />
              Kamera aus
            </Button>
          ) : (
            <Button onClick={() => void startCamera()}>
              <Camera />
              Kamera an
            </Button>
          )}
          <form onSubmit={submitManual} className="flex min-w-0 flex-1 gap-2">
            <Input
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              inputMode="numeric"
              placeholder="EAN eintippen"
              aria-label="EAN eintippen"
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline">
              Hinzufügen
            </Button>
          </form>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch nichts gescannt. Kamera an und Kiste für Kiste den Strichcode ins Bild halten –
          jeder Treffer landet hier.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void add(ready)} disabled={busy || ready.length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              {readyCount > 0
                ? `${readyCount} ${readyCount === 1 ? 'Set' : 'Sets'} übernehmen`
                : 'Nichts zu übernehmen'}
            </Button>
            <Button variant="ghost" onClick={() => setEntries([])} disabled={busy}>
              <Trash2 />
              Liste leeren
            </Button>
            {unknown.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {unknown.length} unbekannt – erst im Katalog anlegen
              </span>
            ) : null}
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {entries.map((entry) => (
              <li key={entry.ean} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-48 flex-1">
                  {entry.status === 'known' || entry.status === 'added' ? (
                    <Link href={`/katalog/${entry.setId}`} className="text-sm font-medium hover:underline">
                      {entry.setNumber} · {entry.name}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">
                      {entry.status === 'pending' ? 'Im Katalog nachsehen …' : 'Nicht im Katalog'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground tabular-nums">
                    EAN {formatEan(entry.ean)}
                    {entry.ownedCopies
                      ? ` · ${entry.status === 'added' ? 'jetzt' : 'schon'} ${entry.ownedCopies}× in der Sammlung`
                      : ''}
                  </p>
                </div>

                {entry.status === 'added' ? (
                  <Badge className="bg-owned text-owned-foreground">Übernommen</Badge>
                ) : entry.status === 'unknown' ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/katalog/neu?ean=${encodeURIComponent(entry.ean)}`}>Anlegen</Link>
                  </Button>
                ) : null}

                {entry.status !== 'added' ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Eins weniger"
                      onClick={() => setEntries((current) => setCount(current, entry.ean, entry.count - 1))}
                    >
                      {entry.count > 1 ? <Minus /> : <Trash2 className="text-destructive" />}
                    </Button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{entry.count}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Eins mehr"
                      onClick={() => setEntries((current) => setCount(current, entry.ean, entry.count + 1))}
                    >
                      <Plus />
                    </Button>
                    {entry.status === 'known' ? (
                      <Button size="sm" onClick={() => void add([entry])} disabled={busy}>
                        Übernehmen
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
