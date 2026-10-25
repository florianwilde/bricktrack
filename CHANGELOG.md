# Changelog

Alle nennenswerten Aenderungen an Bricktrack werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

Ein neues Gesicht: Bricktrack sieht jetzt aus wie das, was es verwaltet.

### Hinzugefügt

- **Designauswahl** unter Konto → Design: Klemmbaustein (neuer Standard),
  Warm, Nachtblau (dunkel), Bonbon, Bauklotz und Schlicht (der bisherige
  Look). Die Wahl gilt pro Gerät und wirkt sofort.
- **Platzhalter für Sets ohne Bild**: Farbe des Herstellers, gezeichneter
  Stein und Setnummer statt eines grauen „Bild fehlt".
- **Startseite als Überblick**: Steinreihe für den Fortschritt (bei mehreren
  Sammlern in deren Farben), Teile, Wert, nächster Wunschlisten-Termin mit
  Countdown und Abkürzungen.
- Neues Logo als Baustein, Schriften lokal gebündelt (kein CDN).

### Geändert

- Karten, Buttons und Badges tragen im Standard-Design Konturen, eine feste
  Unterkante und Noppen. In der Sammlung und auf der öffentlichen
  Wunschliste zeigen die Noppen den Sammler bzw. ob ein Wunsch reserviert ist.
- Die öffentliche Wunschliste hat einen farbigen Kopf mit Anlass und Datum.
- Screenshots der Anleitung zeigen die feste Navigation nicht mehr mitten
  im Bild.

## [0.3.0] - 2026-09-07

Phase 3: mehrere Kinder, Wertentwicklung, Erinnerungen und ein Schutz vor
doppelten Katalogeintraegen.

### Hinzugefuegt

**Mehrere Sammler**
- Der Katalog bleibt gemeinsam, Sammlung und Wunschlisten gehoeren je einem
  Sammler. "Hat er das schon?" beantwortet damit die Frage fuer *ihn*: ein Set,
  das nur die Schwester besitzt, faellt fuer den Bruder unter "fehlt noch".
- Umschalter in Katalog und Sammlung, Farbmarkierung je Sammler, Zuordnung im
  Sammlungseintrag und je Wunschliste.
- Solange es nur einen Sammler gibt, ist davon nichts zu sehen - die App
  bleibt genauso einfach wie vorher.

**Preisbeobachtung**
- Notierte Preise je Set mit Betrag, Zustand, Datum, Quelle und Notiz.
- Wertentwicklung gegen die UVP, in der Sammlung als Kachel "Aktueller Wert".

**Erinnerungen**
- E-Mail an den Besitzer, wenn der Termin einer Wunschliste naeher rueckt und
  noch Wuensche offen sind - standardmaessig 14 Tage vorher, hoechstens einmal
  pro Woche je Liste.
- Verwaltungsseite mit Verbindungstest, Testnachricht und sofortiger Pruefung.
- Ohne SMTP-Konfiguration bleibt die Funktion vollstaendig aus.

**Dublettenpruefung**
- Vor dem Anlegen eines Sets warnt die App vor gleicher Setnummer beim
  gleichen Hersteller, sehr aehnlichem Namen und gleicher Nummer bei einem
  anderen Hersteller - mit Link zum Verdaechtigen und der Moeglichkeit,
  trotzdem anzulegen.

### Geaendert

- Die Migration legt einen Sammler "Sammlung" an und ordnet ihm alle
  vorhandenen Sammlungseintraege und Wunschlisten zu. Umbenennen unter
  Verwaltung -> Sammler.
- Der Smoke-Test laeuft gegen das Docker-Image statt gegen den Dev-Server.

### Nicht umgesetzt

- Der BrickLink-Preisfuehrer war im Plan als optional vermerkt und wurde
  bewusst weggelassen: OAuth1 mit einer pro Nutzer registrierten Anwendung ist
  viel Apparat fuer eine Zahl, die sich in zehn Sekunden eintippen laesst. Das
  Feld "Wo" nimmt jede Quelle auf, die Datenstruktur bleibt offen.

## [0.2.0] - 2026-09-07

Phase 2: die Handgriffe, die den Alltag schneller machen.

### Hinzugefuegt

**Lego-Import (Rebrickable)**
- Auf "Neues Set" reicht die Setnummer von der Packung: Name, Jahr, Teile,
  Minifiguren und Thema werden uebernommen, das Bild lokal gespeichert.
- Hersteller und Thema werden bei Bedarf angelegt, ein Oberthema inklusive.
- Alle Aufrufe laufen serverseitig. Ohne `REBRICKABLE_API_KEY` bleibt der
  Import sichtbar, aber abgeschaltet - von Hand anlegen geht unveraendert.

**Barcode-Scanner**
- Knopf im Katalog: Strichcode mit der Handykamera scannen. Ist das Set
  bekannt, oeffnet es sich; sonst das Formular mit ausgefuellter EAN.
- Jeder Code wird gegen seine Pruefziffer geprueft; dekodiert wird im
  Browser, nichts verlaesst das Geraet.

**Fehlteile**
- Fehlende Teile je Sammlungseintrag mit Teilenummer, Farbe, Anzahl und
  Notiz, abhakbar wenn nachgekauft.
- Die Vollstaendigkeit pflegt sich daraus selbst: der erste offene Eintrag
  setzt "Teile fehlen", der letzte erledigte zurueck auf "vollstaendig".

**Einladungen**
- Der Admin erzeugt Registrierungslinks, die genau einmal funktionieren,
  optional an eine E-Mail-Adresse gebunden, mit waehlbarer Rolle und
  Gueltigkeit. In der Datenbank liegt nur der Hash des Tokens.

**Export und Import**
- Alles als ZIP (Daten plus hochgeladene Dateien), nur die Daten als JSON,
  die Sammlung als CSV mit Semikolon und BOM fuer deutsches Excel.
- Import ersetzt die Anwendungsdaten in einer Transaktion, nur fuer
  Administratoren und nur nach getipptem ERSETZEN.
- Nicht im Export: Konten, Passwoerter, Passkeys, Reservierungen und
  Teilen-Links.

**PWA**
- Manifest, Icons und Service Worker: installierbar auf dem Startbildschirm,
  mit Verknuepfungen zu "Fehlende Sets" und zur Sammlung.
- Einmal geladene Seiten bleiben ohne Verbindung lesbar; Set-Bilder und
  Build-Dateien kommen aus dem Cache. Beim Abmelden wird der Cache geraeumt.

### Geaendert

- `src/env.ts` behandelt leere Werte wie nicht gesetzt: ein `BASE_URL=` in der
  `.env` fuehrte bisher zum Start-Abbruch statt zum Standardwert.
- Unit-Tests koennen jetzt auch Server-Module laden (`server-only` wird in der
  Testumgebung durch ein leeres Modul ersetzt).

### Bekannte Einschraenkungen

- Rebrickable liefert keine Anleitungsdateien. Der Import legt stattdessen
  einen Link auf die LEGO-Serviceseite zur Setnummer an.
- Der Barcode-Scanner braucht wie Passkeys HTTPS.
- Beim Import wandern Wunschlisten an den importierenden Admin und sind
  zunaechst nicht geteilt.

## [0.1.0] - 2026-09-07

Erste lauffaehige Fassung: Phase 1 vollstaendig, im Docker-Stack verifiziert.

### Hinzugefuegt

**Anmeldung**
- Registrierung des ersten Nutzers, der damit Administrator wird; danach ist
  die Registrierung geschlossen.
- Anmeldung per E-Mail und Passwort oder per Passkey (WebAuthn), inklusive
  Conditional UI, wo der Browser sie unterstuetzt.
- Passkey-Verwaltung unter "Konto": beliebig viele Geraete, umbenennen,
  loeschen.
- Rate-Limiting auf den Login-Endpunkten, in der Datenbank abgelegt und damit
  neustartfest.

**Katalog**
- Set-Katalog mit Kachelansicht, Suche ueber Setnummer, Name und EAN sowie
  Filtern nach Hersteller, Thema, Jahr und Besitzstatus.
- Sets anlegen und bearbeiten, mit Bild-Upload oder Bild-URL.
- Set-Detailseite mit Metadaten, Anleitungen, Fotos und Sammlungseintraegen.
- Anleitungen als PDF-Upload mit eingebautem pdf.js-Viewer oder als externer
  Link; mehrere Anleitungen je Set.
- Eigene Fotos je Set, am Handy direkt aus der Kamera.

**Sammlung**
- Uebersicht aller besessenen Sets mit Filtern nach Status, Vollstaendigkeit,
  Standort und Hersteller.
- Statistik-Kacheln: Anzahl Sets, Teile gesamt, Wert nach UVP, fehlende Sets,
  sowie die Aufteilung nach Hersteller.
- Sammlungseintraege mit Status, Zustand, Standort, Kaufdatum, Kaufpreis und
  "geschenkt von".

**Wunschlisten**
- Ansicht "Fehlende Sets" mit Mehrfachauswahl: langes Druecken startet die
  Auswahl, die Aktionsleiste uebernimmt sie in eine bestehende oder neue
  Wunschliste. Dubletten und bereits besessene Sets werden uebersprungen und
  im Ergebnis benannt.
- Wunschlisten mit Prioritaet, Reihenfolge, Anlass, Termin und Hinweistext.
- Bereich "Aus fehlenden Sets hinzufuegen" auf der Wunschlisten-Seite,
  vorgefiltert auf Sets, die noch nicht drauf sind.
- Oeffentliche Ansicht unter /w/[shareToken] ohne Anmeldung; Besucher
  reservieren mit ihrem Namen und erhalten einen Storno-Link.
- Ueberraschungsmodus: der Besitzer sieht nur "reserviert", nicht von wem.
- Erfuellte Wuensche werden automatisch markiert, sobald das Set in der
  Sammlung landet, und verschwinden aus der oeffentlichen Ansicht.
- Share-Token laesst sich neu erzeugen; der alte Link ist danach tot.

**Stammdaten**
- Hersteller, Themen (mit Unterthemen) und Standorte (schachtelbar) verwalten.

**Betrieb**
- Docker-Stack: Multi-Stage-Build mit standalone-Output, non-root Nutzer,
  Healthcheck unter /api/health, ein Service und ein Bind-Mount auf ./data.
- Migrationen laufen bei jedem Containerstart automatisch.
- update.sh mit Sicherung, Build, Healthcheck und automatischem Rollback.
- Seed-Skript mit 3 Herstellern, 6 Themen, 10 Sets, 4 Sammlungseintraegen und
  einer Wunschliste.
- Dokumentation: Schnellstart inklusive Nginx-Proxy-Manager-Konfiguration,
  bebilderte Anleitung, README, Roadmap und Devlog.

### Sicherheit

- Serverseitige Validierung aller Eingaben mit zod.
- Uploads auf PDF, JPEG, PNG und WebP begrenzt, geprueft an den Magic Bytes
  statt am gemeldeten MIME-Typ; Dateinamen erzeugt immer der Server.
- Oeffentliche Wunschlisten-Routen nutzen ausschliesslich den Share-Token und
  geben nichts ausserhalb der Wunschliste preis; die Seite ist noindex.
- Storno- und Einladungs-Token liegen nur als SHA-256-Hash in der Datenbank.
- Session-Cookies httpOnly, sameSite=lax und im Betrieb secure.
- Anleitungs-PDFs und eigene Fotos sind nur mit Session abrufbar; oeffentlich
  sind allein die Set-Bilder, die die geteilte Wunschliste braucht.

### Bekannte Einschraenkungen

- Der Katalog enthaelt nur, was von Hand angelegt wurde. Der Import ueber
  Rebrickable kommt in 0.2.0.
- Weitere Konten sind noch nicht moeglich; Einladungslinks kommen in 0.2.0.
- Unter Windows scheitert `pnpm build` an fehlenden Symlink-Rechten. Der
  Docker-Build unter Linux ist davon nicht betroffen.

[Unreleased]: https://git.wilde-server.de/florian.wilde/bricktrack/compare/v0.3.0...HEAD
[0.3.0]: https://git.wilde-server.de/florian.wilde/bricktrack/releases/tag/v0.3.0
[0.2.0]: https://git.wilde-server.de/florian.wilde/bricktrack/releases/tag/v0.2.0
[0.1.0]: https://git.wilde-server.de/florian.wilde/bricktrack/releases/tag/v0.1.0
