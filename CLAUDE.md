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
- Datenbankspalten in `snake_case` - **ausser** in den Auth-Tabellen,
  die `camelCase` verwenden, weil das exakt der Ausgabe von
  `@better-auth/cli generate` entspricht.
- IDs sind Text-UUIDs (`crypto.randomUUID()`), Zeitstempel sind
  `integer(mode: 'timestamp')`.
- Routen sind deutsch (`/katalog`, `/sammlung`, `/wunschlisten`),
  API-Routen englisch (`/api/health`, `/api/files`).
- Commits: Conventional Commits, Betreff auf Deutsch, Imperativ,
  erste Zeile <= 72 Zeichen.

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
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm screenshots    # Screenshots fuer docs/ANLEITUNG.md erzeugen
```

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

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
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
   serverseitig.
5. Session-Cookies: `httpOnly`, `secure`, `sameSite=lax`.
   Rate-Limiting auf den Login-Endpunkten.

## Phasenplan

- **Phase 1 (MVP)** - Auth mit Passkeys, Stammdaten, Katalog, Sammlung,
  Wunschlisten inkl. oeffentlicher Ansicht, Docker-Stack.
- **Phase 2 (Komfort)** - Rebrickable-Import, Barcode-Scanner, Fehlteile,
  Einladungen, Export/Import, PWA.
- **Phase 3 (Nice to have)** - mehrere Sammler, Preisbeobachtung,
  E-Mail-Erinnerungen, Dublettenpruefung.

Details und Stand: `docs/ROADMAP.md`. Zeitaufwaende: `docs/DEVLOG.md`.

## Arbeitsweise

- Nie direkt auf `main` entwickeln; pro Phase ein Branch
  (`feat/phase-1`), Merge erst nach manuellem Test.
- Nach jedem abgeschlossenen Teilschritt committen.
- `pnpm lint` und `pnpm typecheck` muessen sauber sein, bevor eine Phase
  als fertig gilt.
