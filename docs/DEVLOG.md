# Devlog

Zeiterfassung und Nachvollziehbarkeit der Entwicklung. Eine Zeile je
abgeschlossenem Arbeitsschritt, Zeiten in `HH:mm` (Europe/Berlin). Die
Commit-Spalte verweist auf den Stand am Ende des Schritts.

## Phase 1 – MVP (v0.1.0)

### 06.09.2026

| Von | Bis | Dauer | Schritt | Ergebnis | Commit |
|---|---|---|---|---|---|
| 22:06 | 22:12 | 0:06 | Planung | Phase-1-Plan und Drizzle-Schema zur Freigabe vorgelegt; fünf Entscheidungsfragen geklärt (Cent statt Float, Migrator statt drizzle-kit im Image, Bilder öffentlich / PDFs geschützt, Token gehasht, Branch pro Phase) | – |
| 22:12 | 22:20 | 0:08 | Scaffold | pnpm installiert, Next 15.5.25 + Tailwind 4 + shadcn/ui (radix-nova) mit 20 Komponenten, Touch-Größen auf 44 px angehoben | `0de49a9` |
| 22:20 | 22:25 | 0:05 | Datenmodell | 19 Tabellen in Drizzle, CHECK-Constraints, Unique-Index `(wishlist_id, set_id)`, Migration erzeugt und angewendet, WAL verifiziert | `06268bc` |
| 22:25 | 22:26 | 0:01 | Dokumentation | CLAUDE.md, Roadmap, Changelog, Devlog | `b74cecb` |
| 22:26 | 22:40 | 0:14 | Auth und App-Shell | better-auth mit Passwort und Passkeys, erster Nutzer wird Admin, Rate-Limit in der Datenbank, Konto-Seite, Bottom-Navigation, `/api/health` | `4c78c56` |
| 22:40 | 22:46 | 0:06 | Stammdaten | CRUD für Hersteller, Themen und Standorte über eine gemeinsame CrudSection; zod-Schemata, ActionResult, Slug, Geld- und Datumshelfer | `af0ae03` |
| 22:46 | 22:59 | 0:13 | Katalog | Kachelliste mit Suche und vier Filtern, Besitzlogik in `ownership.ts`, Set-Formular, Detailseite, Upload-Pipeline mit Magic-Byte-Prüfung, pdf.js-Viewer, Seed-Skript | `856800b` |
| 22:59 | 23:06 | 0:07 | Wunschlisten und Sammlung | Mehrfachauswahl mit Dubletten-Skip, Wunschlisten-Verwaltung, Teilen, Überraschungsmodus, öffentliche Ansicht mit Reservierung und Storno, Sammlungsübersicht mit Statistik | `79b0133` |
| 23:06 | 23:31 | 0:25 | Tests | 50 Vitest-Unit-Tests, Playwright-Smoke-Test über den ganzen Weg bis zur Reservierung durch einen Besucher ohne Konto | `b0152b8` |

### 07.09.2026

| Von | Bis | Dauer | Schritt | Ergebnis | Commit |
|---|---|---|---|---|---|
| 23:31 | 00:09 | 0:38 | Docker | Multi-Stage-Build, Entrypoint mit Rechteprüfung und Migration, Compose-Stack, Healthcheck, `update.sh` mit Rollback; Image gebaut und Container verifiziert | `61b1249` |
| 00:09 | 00:50 | 0:41 | Dokumentation und Screenshots | README, QUICKSTART mit Nginx-Proxy-Manager-Konfiguration, bebilderte Anleitung, 16 automatisiert erzeugte Screenshots, Changelog 0.1.0 | folgt |

**Summe Phase 1: 2:44**

---

## Notizen und Entscheidungen

### Umgebung

- **pnpm**: `corepack enable` scheitert auf diesem Rechner an fehlenden
  Schreibrechten in `C:\Program Files\nodejs`. Stattdessen
  `npm install -g pnpm@10`; pnpm liegt unter `%APPDATA%\npm` und ist im PATH.
- **Port 3000** ist auf dem Entwicklungsrechner von einer anderen Anwendung
  belegt. Der Dev-Server läuft deshalb lokal auf 3100, die Testläufe auf
  3210 und 3220.
- **`pnpm build` unter Windows** scheitert mit `EPERM … symlink`: Der
  Standalone-Output legt Symlinks in `.next/standalone` an, wofür Windows den
  Entwicklermodus oder administrative Rechte braucht. Der Docker-Build unter
  Linux ist davon nicht betroffen; lokal prüft man mit
  `docker build -t bricktrack:test .`.

### Bibliotheken

- **shadcn-CLI 4.21** arbeitet mit Presets (`-p nova`) und Base-Libraries
  (`-b radix`) statt der früheren Style-Auswahl. Sie zieht `cn` und `radix-ui`
  als Pakete; `clsx` und `tailwind-merge` werden dadurch nicht mehr direkt
  gebraucht und wurden wieder entfernt. Die Voreinstellungen sind auf
  Desktop-Dichte ausgelegt (Buttons `h-8`) – für die Bedienung am Handy auf
  44 px angehoben.
- **better-auth 1.7.3**: Das Passkey-Plugin liegt nicht mehr unter
  `better-auth/plugins/passkey`, sondern im eigenen Paket
  `@better-auth/passkey`. Der Drizzle-Adapter löst Modelle über die
  TypeScript-Property-Namen auf, nicht über die Spaltennamen – deshalb können
  auch die Auth-Tabellen durchgehend `snake_case` verwenden.
- **Drizzle**: Selbstbezügliche Fremdschlüssel (`parent_theme_id`) brauchen
  `AnySQLiteColumn` als Rückgabetyp, nicht `AnyColumn`.
- **pdf.js** wird lokal gebündelt, inklusive Worker. Kein CDN, damit der
  Browser des Nutzers keine fremden Server kontaktiert.

### Stolpersteine

- **CRLF im Entrypoint**: Eine unter Windows geschriebene `entrypoint.sh` mit
  CRLF scheitert im Container mit dem irreführenden
  `exec /app/entrypoint.sh: no such file or directory` – der Kernel sucht
  dann `/bin/sh\r`. Behoben mit einer `.gitattributes`, die für Shell-Skripte
  LF erzwingt.
- **Migrations-Bundle**: Der mit esbuild als ESM gebündelte Migrations-Runner
  scheiterte an `Dynamic require of "fs" is not supported` – mitgebündelte
  CJS-Abhängigkeiten (dotenv) rufen `require()` für Node-Builtins auf. Als
  CommonJS gebündelt läuft es.
- **Playwright und Reihenfolge**: Playwright startet den Web-Server **vor**
  dem `globalSetup`. Das Löschen des Testdatenverzeichnisses im globalSetup
  scheiterte deshalb unter Windows an der bereits geöffneten SQLite-Datei;
  das Aufräumen läuft jetzt im npm-Skript davor.
- **Screenshots gegen den Dev-Server** waren nicht reproduzierbar: unter Last
  brach der Stream mit `ChunkLoadError` beziehungsweise
  `Unexpected end of JSON input` ab. Die Bilder entstehen jetzt gegen das
  Produktions-Image im Container – verlässlich und zugleich näher an dem, was
  Nutzer wirklich sehen.

### Beim Testen gefunden und behoben

- Eine spontan aus dem Katalog angelegte Wunschliste war **nicht teilbar**:
  Das Feld `isPublic` kommt aus einer Checkbox und fiel beim programmatischen
  Anlegen auf `false`. Die Schnellanlage setzt es jetzt ausdrücklich.
- Das Sternchen an Pflichtfeldern gehörte zum zugänglichen Namen des Feldes
  („Name *"). Jetzt `aria-hidden` – der Pflichtstatus steckt ohnehin im
  `required` des Eingabefeldes.
- In der Mehrfachauswahl verdeckte die Aktionsleiste die letzte Kachelreihe;
  das Raster bekommt im Auswahlmodus zusätzliches Polster nach unten.
