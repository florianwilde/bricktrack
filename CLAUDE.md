# Bricktrack

Self-hosted Webanwendung zur Verwaltung einer Spielzeug-Set-Sammlung
(Lego, Playmobil, Cobi, BlueBrixx, Mega Bloks und beliebige weitere
Hersteller). Sie beantwortet zwei Fragen sofort: **Welche Sets hat er?**
und **Welche Sets hat er noch nicht?** Aus den fehlenden Sets entstehen
teilbare Wunschlisten.

## Stack

| Bereich | Wahl | Anmerkung |
|---|---|---|
| Framework | Next.js 15, App Router, Server Actions | `output: 'standalone'` |
| Sprache | TypeScript strict | |
| UI | Tailwind CSS 4, shadcn/ui (radix-nova), lucide | mobile first |
| Datenbank | SQLite via better-sqlite3, WAL | Datei unter `DATA_DIR/db` |
| ORM | Drizzle ORM + drizzle-kit | Migrationen in `drizzle/` |
| Auth | better-auth + `@better-auth/passkey` | E-Mail/Passwort und WebAuthn |
| Validierung | zod (serverseitig, immer) | |
| Bilder | sharp (nur serverseitig, Thumbnails) | |
| Tests | Vitest (Unit), Playwright (E2E, Screenshots) | |
| PDF | pdfjs-dist, lokal gebuendelt | kein CDN |
| Barcode | @zxing/browser, lazy geladen | nur beim Scannen |
| Archive | fflate | Export/Import als ZIP |
| Paketmanager | pnpm 10 | |

Bewusst **kein** Prisma (Standalone-Build im Container), **keine**
Cloud-Dienste, **keine** externen Requests aus dem Browser ausser zu
Bild-URLs, die der Nutzer selbst hinterlegt hat.

## Konventionen

- **UI-Texte auf Deutsch**, **Code und Kommentare auf Englisch**.
- Datum `dd.MM.yyyy`, Waehrung EUR, Zeitzone `Europe/Berlin`.
- **Geldbetraege liegen als Integer in Cent** in der Datenbank
  (`retail_price_cents`, `acquired_price_cents`). SQLite hat keinen
  Decimal-Typ; Float-Summen waeren ungenau. Umrechnung ausschliesslich
  in `src/lib/money.ts`.
- Alle Datenbankspalten in `snake_case`. Auch in den Auth-Tabellen -
  der Drizzle-Adapter von better-auth loest Modelle ueber die
  TypeScript-Property-Namen auf, nicht ueber die Spaltennamen.
- IDs sind Text-UUIDs (`crypto.randomUUID()`), Zeitstempel sind
  `integer(mode: 'timestamp')`.
- Routen sind deutsch (`/katalog`, `/sammlung`, `/wunschlisten`),
  API-Routen englisch (`/api/health`, `/api/files`).
- Commits: Conventional Commits, Betreff auf Deutsch, Imperativ,
  erste Zeile <= 72 Zeichen.

## Wichtige Module

| Datei | Zustaendig fuer |
|---|---|
| `src/lib/ownership.ts` | die eine Definition von "hat er" / "hat er nicht" |
| `src/lib/wishlist-logic.ts` | Mehrfachauswahl, Dubletten, Prioritaeten (rein, testbar) |
| `src/lib/tokens.ts` | Share-, Storno- und Einladungs-Token |
| `src/lib/invites.ts` | Einladungen inklusive der Freigabe fuer die Registrierung |
| `src/lib/rebrickable.ts` | Lego-Import, ausschliesslich serverseitig |
| `src/lib/set-number.ts`, `src/lib/ean.ts` | Setnummern und Barcodes (rein, testbar) |
| `src/lib/uploads.ts` | Datei-Uploads, Magic Bytes, Thumbnails |
| `src/lib/similarity.ts` | Namensvergleich fuer die Dublettenpruefung (rein) |
| `src/lib/prices.ts` | Wertentwicklung aus notierten Preisen (rein) |
| `src/lib/reminders.ts` | Regeln, wann eine Erinnerung faellig ist (rein) |
| `src/lib/timeline.ts` | Verlauf der Sammlung nach Jahren/Monaten (rein) |
| `src/lib/pdf-search.ts` | Textsuche in Anleitungs-PDFs (rein) |
| `src/lib/reminder-job.ts`, `src/lib/mailer.ts` | Versand und Zeitplan |
| `src/lib/mail-settings.ts`, `src/lib/secret-box.ts` | SMTP aus .env oder App (`app_setting`), Passwort verschluesselt |
| `src/lib/export.ts` | Export und Import des gesamten Bestands |
| `src/lib/money.ts`, `src/lib/format.ts` | Cent-Umrechnung, dd.MM.yyyy |
| `src/components/layout/more-items.ts` | Eintraege der Seite „Mehr" (Konto, Design, Stammdaten), auch Titel der Verwaltungsseiten |
| `src/lib/collector-choice.ts` | Aktiver Sammler: `?sammler=` vor Cookie aus dem Umschalter „Fuer wen?" |
| `src/lib/link-import.ts` | Set-Daten aus Link und Seite lesen (rein, testbar) |
| `src/lib/safe-fetch.ts`, `src/lib/net-guard.ts` | Abruf fremder URLs nur an oeffentliche Adressen |
| `src/lib/design.ts`, `src/app/designs.css` | Designs: Namen und Cookie bzw. Tokens je `data-design` |
| `src/components/brick/` | Noppen, Logo, Platzhalter fuer Sets ohne Bild |

### Designs

Das Design steht als `data-design` am `<html>` (Cookie `bricktrack-design`,
pro Geraet, Standard `klemmbaustein`). Komponenten benutzen nur Tokens
(`bg-primary`, `border-edge`, `--edge-w`, `--lift`, `bg-tone-1` ...), nie feste
Farben - sonst stimmt ein Design nicht mehr. Karten mit Noppen: `<Studs />`
neben die Karte in einen `relative`-Wrapper, die Karte selbst mit `brick`.

## Befehle

```bash
pnpm dev            # Entwicklungsserver auf http://localhost:3000
pnpm build          # Produktionsbuild (standalone)
pnpm start          # Produktionsserver
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm db:generate    # SQL-Migration aus dem Schema erzeugen
pnpm db:migrate     # Migrationen anwenden (auch im Container-Start)
pnpm db:seed        # Beispieldaten einspielen
pnpm db:studio      # Drizzle Studio
pnpm pruefe:umgebung # Node, pnpm, .env und DATA_DIR pruefen
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm screenshots    # Screenshots fuer docs/ANLEITUNG.md erzeugen

node scripts/generate-icons.mjs   # PWA-Icons aus der SVG-Quelle rendern
```

### Testkonventionen

- Unit-Tests liegen in `tests/unit`, laufen unter Node und duerfen auch
  Server-Module laden: `server-only` ist in `vitest.config.mts` auf einen
  leeren Stub gemappt.
- `tests/setup-env.ts` setzt Platzhalter fuer die Umgebung. `BASE_URL` wird
  dort **immer** ueberschrieben, weil Vite denselben Namen fuer seinen
  Public-Base-Path benutzt und ihn auf `/` setzt.
- Der Playwright-Smoke-Test nutzt `./data-e2e`, der Screenshot-Lauf
  `./data-shots` gegen das Produktions-Image. Beide Verzeichnisse werden vor
  jedem Lauf geleert und liegen nie im Git.

## Datenmodell

Kernregel: Ein **`set`** ist ein *Katalogeintrag* - es existiert,
unabhaengig davon ob wir es besitzen. Ein **`collection_item`**
verknuepft ein Set mit dem *tatsaechlichen Besitz*.

> **"Hat er nicht"** = Sets im Katalog, zu denen kein `collection_item`
> mit einem Status ungleich `sold` existiert.

Diese Bedingung steht an genau einer Stelle: `src/lib/ownership.ts`.

### Katalog

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `manufacturer` | Hersteller | `name`, `slug` (unique), `website` |
| `theme` | Thema/Serie, hierarchisch | `manufacturer_id`, `parent_theme_id`, unique je (Hersteller, Name) |
| `set` | Katalogeintrag | unique `(manufacturer_id, set_number)`, `year`, `piece_count`, `minifig_count`, `ean`, `image_url` oder `image_path`, `retail_price_cents`, `external_ids` (JSON) |
| `tag`, `set_tag` | freie Verschlagwortung (n:m) | |
| `instruction` | Anleitung | `kind` = `pdf_upload` (dann `file_path`) oder `external_url` (dann `url`), per CHECK erzwungen |

### Besitz

Mehrere **Sammler** teilen sich den Katalog, nicht den Besitz: `collector`
haelt Name und Farbe, `collection_item.collector_id` und
`wishlist.collector_id` ordnen zu. Solange nur ein Sammler existiert, blendet
die Oberflaeche das Thema vollstaendig aus - Umschalter, Abfragen und Badges
erscheinen erst ab dem zweiten.

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `collector` | ein Kind | `name`, `color`, `birthday`, `sort_order` |
| `price_point` | beobachteter Preis je Set | `price_cents`, `condition`, `observed_at`, `source` |
| `collection_item` | ein besessenes Exemplar | `status` = `owned` / `built` / `disassembled` / `lent_out` / `sold`, `completeness`, `condition`, `location_id`, `acquired_*`, `gifted_by` |
| `location` | Aufbewahrungsort, hierarchisch | `parent_location_id` |
| `missing_part` | Fehlteile je Exemplar | `part_number`, `color_name`, `quantity`, `resolved` |
| `photo` | eigene Fotos | gehoert entweder zu `set_id` **oder** `collection_item_id` (CHECK) |

### Wunschlisten

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `wishlist` | eine Liste | `share_token` (32 Zufallsbytes, unique), `is_public`, `surprise_mode`, `occasion`, `event_date`, `note` |
| `wishlist_item` | ein Wunsch | unique `(wishlist_id, set_id)`, `priority` 1-3 (CHECK), `sort_order`, `reserved_by_name`, `reserved_at`, `reservation_token_hash`, `fulfilled_at` |

Der Unique-Index auf `(wishlist_id, set_id)` macht das Ueberspringen von
Dubletten bei der Mehrfachauswahl zu einer **Datenbankgarantie**, nicht
nur zu einer UI-Regel: Der Bulk-Insert laeuft mit
`onConflictDoNothing()` und meldet die uebersprungenen Sets zurueck.

`fulfilled_at` wird gesetzt, sobald das Set in der Sammlung auftaucht.

### Auth

`user` (mit `role` = `admin` | `member`), `session`, `account`,
`verification`, `passkey`, `rateLimit` kommen von better-auth.
`invite` ist selbst gebaut: Der Klartext-Token steht nur im Link, in der
Datenbank liegt sein SHA-256-Hash. Gleiches gilt fuer
`wishlist_item.reservation_token_hash`. Der `wishlist.share_token`
bleibt im Klartext, weil er im Dashboard erneut angezeigt werden muss.

## Verzeichnisse zur Laufzeit

Ein einziges `./data` reicht fuer ein vollstaendiges Backup.

```
DATA_DIR/
  db/bricktrack.db              SQLite (+ -wal, -shm)
  files/
    images/sets/<setId>/...     Set-Bilder (oeffentlich lesbar)
    photos/...                  eigene Fotos (nur mit Session)
    instructions/<setId>/...    Anleitungs-PDFs (nur mit Session)
```

Set-**Bilder** sind ohne Login abrufbar, weil die oeffentliche
Wunschliste sie braucht. Fotos und Anleitungen erfordern zwingend eine
Session.

## Sicherheitsregeln

1. Jede Eingabe wird **serverseitig** mit zod validiert. Clientseitige
   Validierung ist Komfort, nie Schutz.
2. Uploads: nur PDF, JPEG, PNG, WebP. Pruefung ueber MIME **und**
   Magic Bytes. Groessenlimit aus `MAX_UPLOAD_MB`. Dateinamen werden
   **immer** serverseitig erzeugt, nie vom Client uebernommen.
3. Oeffentliche Wunschlisten-Routen (`/w/[shareToken]`) nutzen
   ausschliesslich den Share-Token als Zugriffsschluessel und geben
   nichts preis ausser den Wunschlisten-Daten - keine Nutzernamen,
   keine Sammlungsdaten, keine IDs anderer Objekte.
4. Externe API-Aufrufe (Rebrickable, ab Phase 2) laufen ausschliesslich
   serverseitig. URLs, die ein Nutzer eingibt (Link-Import, Bild-Uebernahme),
   werden nur ueber `safeFetch` abgerufen - nie mit `fetch` direkt, sonst
   erreicht der Server auch Geraete im Heimnetz.
5. Session-Cookies: `httpOnly`, `secure`, `sameSite=lax`.
   Rate-Limiting auf den Login-Endpunkten.
6. Der Export enthaelt **keine** Konten, Passwoerter oder Passkeys - und
   keine Reservierungen, Teilen-Token oder `app_setting` (SMTP-Zugang). Das Backup ist `./data`, nicht der
   Export.
7. Der Service Worker beantwortet nur GET-Anfragen aus dem Cache und niemals
   `/api/auth`, `/api/export` oder den Healthcheck. Beim Abmelden wird der
   Cache geleert.

## Phasenplan

- **Phase 1 (MVP)** - Auth mit Passkeys, Stammdaten, Katalog, Sammlung,
  Wunschlisten inkl. oeffentlicher Ansicht, Docker-Stack. *Fertig in 0.1.0.*
- **Phase 2 (Komfort)** - Rebrickable-Import, Barcode-Scanner, Fehlteile,
  Einladungen, Export/Import, PWA. *Fertig in 0.2.0.*
- **Phase 3 (Nice to have)** - mehrere Sammler, Preisbeobachtung,
  E-Mail-Erinnerungen, Dublettenpruefung. *Fertig in 0.3.0.*
- **Design und Sicherheit** - Designauswahl (Standard Klemmbaustein),
  Abhaengigkeiten ohne bekannte Luecken. *Fertig in 0.4.0.*
- **Alltag** - Set aus einem Link, neue Navigation mit „Mehr" und „Fuer
  wen?", Mailserver in der App, `pnpm pruefe:umgebung`. *Fertig in 0.5.0.*
- **Katalog-Reiter** - Besitzstatus und Hersteller als Reiter statt
  Auswahlfeld. *Fertig in 0.6.0.*
- **Fotos, Suche und Verlauf** - Fotos je Sammlungseintrag, Suche in
  Anleitungs-PDFs, Verlauf der Sammlung. *Fertig in 0.7.0.*

Details und Stand: `docs/ROADMAP.md`. Zeitaufwaende: `docs/DEVLOG.md`.

## Arbeitsweise

- Nie direkt auf `main` entwickeln; pro Phase ein Branch
  (`feat/phase-1`), Merge erst nach manuellem Test.
- Nach jedem abgeschlossenen Teilschritt committen.
- `pnpm lint` und `pnpm typecheck` muessen sauber sein, bevor eine Phase
  als fertig gilt.
