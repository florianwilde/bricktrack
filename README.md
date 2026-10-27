# Bricktrack

Self-hosted Verwaltung für die Spielzeug-Set-Sammlung deines Kindes – Lego,
Playmobil, Cobi, BlueBrixx, Mega Bloks und jeden weiteren Hersteller, den du
selbst anlegst.

Die App beantwortet zwei Fragen sofort:

- **Welche Sets hat er?** → die Sammlung, mit Standort, Zustand und Statistik.
- **Welche Sets hat er noch nicht?** → alles im Katalog ohne Sammlungseintrag.

Aus den fehlenden Sets entsteht in wenigen Handgriffen eine Wunschliste, die
du per Link mit Familie und Freunden teilst. Die reservieren dort ihr Geschenk
– **ohne sich zu registrieren**, und ohne dass jemand doppelt kauft.

> **Neu hier?** → [QUICKSTART.md](QUICKSTART.md) führt dich in 15 Minuten von
> null zur laufenden Instanz, inklusive Nginx Proxy Manager.
> **Bedienung?** → [docs/ANLEITUNG.md](docs/ANLEITUNG.md), bebildert.

---

## Was drin ist

| | |
|---|---|
| **Katalog** | Sets aller Hersteller, Suche nach Nummer, Name oder EAN, Filter nach Hersteller, Thema, Jahr und Besitzstatus |
| **Sammlung** | Was tatsächlich da ist: Status, Vollständigkeit, Zustand, Standort, Kaufpreis, „geschenkt von" |
| **Anleitungen** | PDFs hochladen und im Browser blättern (pdf.js, ohne externe Dienste) oder auf die Hersteller-Seite verlinken |
| **Fotos** | Eigene Bilder je Set und je Exemplar – direkt aus der Handykamera |
| **Wunschlisten** | Mehrfachauswahl aus den fehlenden Sets, Priorität, Reihenfolge, Termin |
| **Teilen** | Öffentlicher Link ohne Anmeldung, Reservierung mit Namen, Storno-Link, Überraschungsmodus |
| **Mehrere Kinder** | Gemeinsamer Katalog, getrennte Sammlungen und Wunschlisten – sichtbar erst ab dem zweiten Sammler |
| **Preise** | Notierte Preise je Set, Wertentwicklung gegen die UVP |
| **Erinnerungen** | E-Mail, wenn ein Termin näher rückt und noch Wünsche offen sind (SMTP optional) |
| **Anmeldung** | E-Mail und Passwort oder Passkey (WebAuthn), mehrere Geräte je Konto |

Mobil zuerst gebaut: Die App wird im Laden und im Kinderzimmer benutzt, nicht
am Schreibtisch.

## Technik

Next.js 15 (App Router, Server Actions, TypeScript strict) · Tailwind CSS 4 ·
shadcn/ui · SQLite über Drizzle ORM und better-sqlite3 · better-auth mit
Passkey-Plugin · alles in **einem** Docker-Container.

Keine Cloud, keine externen Dienste, keine Telemetrie. Der Browser lädt nichts
von fremden Servern außer den Bild-URLs, die du selbst hinterlegt hast.

Details zu Stack, Konventionen und Datenmodell: [CLAUDE.md](CLAUDE.md).

---

## Installation

Ausführlich in [QUICKSTART.md](QUICKSTART.md). Die Kurzfassung:

```bash
git clone https://github.com/florianwilde/bricktrack.git
cd bricktrack

cp .env.example .env
# BASE_URL und BETTER_AUTH_SECRET setzen:
#   openssl rand -base64 48

mkdir -p ./data
sudo chown -R 1000:1000 ./data     # der Container laeuft als UID 1000

docker compose up -d --build
```

Danach `https://deine-domain` aufrufen. **Der erste registrierte Nutzer wird
Administrator**, danach ist die Registrierung geschlossen.

### Konfiguration

Alle Werte kommen aus `.env` (Vorlage: `.env.example`).

| Variable | Pflicht | Standard | Bedeutung |
|---|---|---|---|
| `BASE_URL` | ja | `http://localhost:3000` | Öffentliche Adresse. Bestimmt die Passkey-Domain (RP-ID). |
| `BETTER_AUTH_SECRET` | ja | – | Signiergeheimnis, mindestens 32 Zeichen. |
| `DATA_DIR` | nein | `/data` | Datenverzeichnis im Container. Nicht ändern. |
| `MAX_UPLOAD_MB` | nein | `25` | Größenlimit je Datei. Muss zum Proxy passen. |
| `TZ` | nein | `Europe/Berlin` | Zeitzone des Containers. |
| `BIND_ADDRESS` | nein | `127.0.0.1` | Auf welcher Host-Adresse der Container lauscht. `0.0.0.0`, wenn der Proxy auf einem anderen Host läuft. |
| `HOST_PORT` | nein | `3000` | Port auf dem Host, falls 3000 belegt ist. |
| `REBRICKABLE_API_KEY` | nein | – | Lego-Import. Ohne Key läuft alles manuell. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | nein | – | Mailversand für Wunschlisten-Erinnerungen. Ohne `SMTP_HOST` und `SMTP_FROM` ist die Funktion aus. |
| `REMINDER_DAYS_BEFORE` | nein | `14` | Wie viele Tage vor dem Termin erinnert wird. |

### Reverse Proxy

TLS wird außerhalb terminiert, der Container spricht nur HTTP auf Port 3000.
Drei Dinge sind wichtig:

1. **HTTPS mit Force-SSL** – ohne das keine Passkeys.
2. **`client_max_body_size`** mindestens so groß wie `MAX_UPLOAD_MB`, sonst
   scheitern große Anleitungs-PDFs mit „413".
3. **`X-Forwarded-For`** durchreichen, damit das Rate-Limit auf dem
   Login-Endpunkt die echte Client-IP sieht.

Die vollständige Nginx-Proxy-Manager-Konfiguration steht in
[QUICKSTART.md, Schritt 5](QUICKSTART.md#5-reverse-proxy-einrichten-nginx-proxy-manager).

---

## Backup und Restore

**Ein Verzeichnis reicht.** `./data` enthält die Datenbank *und* alle
hochgeladenen Dateien:

```
data/
  db/bricktrack.db          SQLite (dazu -wal und -shm)
  files/images/sets/…       Set-Bilder
  files/photos/…            eigene Fotos
  files/instructions/…      Anleitungs-PDFs
```

**Sichern** (Container kurz anhalten, damit die Datenbank nicht mitten im
Schreiben eingepackt wird):

```bash
docker compose stop app
tar czf bricktrack-$(date +%F).tar.gz data .env
docker compose start app
```

**Zurückspielen:**

```bash
docker compose down
rm -rf data
tar xzf bricktrack-2026-09-06.tar.gz
sudo chown -R 1000:1000 ./data
docker compose up -d
```

Migrationen laufen bei jedem Start automatisch – ein altes Backup wird beim
Zurückspielen also auf den aktuellen Schemastand gehoben.

## Aktualisieren

```bash
./update.sh
```

Das Skript sichert `./data` und `.env`, holt den neuen Stand, baut das Image,
startet neu und wartet auf den Healthcheck. Wird der Container nicht gesund,
rollt es Code **und** Container automatisch auf den vorherigen Commit zurück
und sagt dir, wo die Sicherung liegt.

```bash
./update.sh --no-pull      # nur neu bauen, ohne git pull
./update.sh --no-backup    # ohne Sicherung (nicht empfohlen)
```

Die letzten zehn Sicherungen bleiben unter `./backups` liegen.

---

## Entwicklung

```bash
corepack enable pnpm       # pnpm 10
pnpm install

cp .env.example .env       # DATA_DIR=./data, BASE_URL=http://localhost:3000
pnpm pruefe:umgebung       # Node, pnpm, .env und DATA_DIR prüfen
pnpm db:migrate            # Datenbank anlegen
pnpm db:seed               # Beispieldaten: 3 Hersteller, 10 Sets, 1 Wunschliste
pnpm dev                   # http://localhost:3000
```

| Befehl | Wirkung |
|---|---|
| `pnpm dev` | Entwicklungsserver |
| `pnpm pruefe:umgebung` | Node, pnpm, Abhängigkeiten, `.env` und `DATA_DIR` prüfen; Exit-Code 1 bei Fehlern |
| `pnpm build` | Produktionsbuild (standalone) |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript – beide müssen sauber sein |
| `pnpm test` | Unit-Tests (Vitest) |
| `pnpm test:e2e` | Playwright-Smoke-Test gegen das Docker-Image (eigenes `./data-e2e`) |
| `pnpm db:generate` | SQL-Migration aus dem Drizzle-Schema erzeugen |
| `pnpm db:migrate` | Migrationen anwenden |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm screenshots` | Bilder für `docs/ANLEITUNG.md` neu erzeugen |

`pnpm test:e2e` und `pnpm screenshots` bauen jeweils das Docker-Image und
fahren es hoch. Sie brauchen also einen laufenden Docker-Daemon, testen dafür
aber genau das Artefakt, das später auch deployt wird – der Dev-Server hat
unter der Last eines ganzen Durchlaufs reproduzierbar Chunks verloren.

> **Unter Windows** schlägt `pnpm build` mit `EPERM … symlink` fehl: der
> Standalone-Output legt Symlinks an, wofür Windows den Entwicklermodus oder
> administrative Rechte braucht. Der Docker-Build unter Linux ist davon nicht
> betroffen. Zum Prüfen lokal: `docker build -t bricktrack:test .`

Die Passkey-Anmeldung funktioniert lokal auch über `http://localhost` –
WebAuthn behandelt localhost als sicheren Kontext. Auf jeder anderen Adresse
braucht es HTTPS.

---

## Datenmodell in einem Absatz

Ein **`set`** ist ein Katalogeintrag: Das Set existiert in der Welt,
unabhängig davon, ob wir es besitzen. Ein **`collection_item`** verknüpft ein
Set mit einem tatsächlich vorhandenen Exemplar – dasselbe Set zweimal im Regal
sind zwei Einträge. Daraus folgt die zentrale Regel:

> „Hat er nicht" = Sets im Katalog, zu denen kein `collection_item` mit einem
> Status ungleich `sold` existiert.

Ein verkauftes Exemplar zählt also nicht mehr als Besitz – das Set taucht
wieder unter „fehlt noch" auf und darf zurück auf eine Wunschliste. Diese
Regel steht an genau einer Stelle im Code: `src/lib/ownership.ts`.

Gibt es mehrere **Sammler**, bekommt die Frage ein „für wen": Der Katalog ist
gemeinsam, der Besitz nicht. Ein Set, das nur das Geschwisterkind hat, fehlt
dem anderen weiterhin.

Das vollständige Modell inklusive aller Tabellen: [CLAUDE.md](CLAUDE.md#datenmodell).

## Sicherheit

- Jede Eingabe wird serverseitig mit zod validiert.
- Uploads sind auf PDF, JPEG, PNG und WebP begrenzt – geprüft an den **Magic
  Bytes**, nicht am gemeldeten MIME-Typ. Dateinamen erzeugt immer der Server.
- Die öffentliche Wunschliste nutzt ausschließlich den Share-Token als
  Schlüssel und gibt nichts außer den Wunschlisten-Daten preis. Sie ist
  `noindex`.
- Storno- und Einladungs-Token liegen nur als SHA-256-Hash in der Datenbank.
- Session-Cookies sind `httpOnly`, `sameSite=lax` und im Betrieb `secure`.
  Auf den Login-Endpunkten liegt ein Rate-Limit (5 Versuche pro Minute).
- Set-Bilder sind ohne Anmeldung abrufbar – die geteilte Wunschliste braucht
  sie. Anleitungs-PDFs und eigene Fotos **nie**.

## Stand und Pläne

Aktuelle Version und Änderungen: [CHANGELOG.md](CHANGELOG.md).
Was als Nächstes kommt: [docs/ROADMAP.md](docs/ROADMAP.md).
Wie lange was gedauert hat: [docs/DEVLOG.md](docs/DEVLOG.md).

## Lizenz

Privates Projekt, keine Lizenz vergeben.
