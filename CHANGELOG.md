# Changelog

Alle nennenswerten Aenderungen an Bricktrack werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefügt

- **Fehlteile-Einkaufsliste** (Sammlung → Fehlteile): alle offenen Fehlteile
  aus allen Exemplaren, zusammengefasst je Teil und Farbe. Download als
  BrickLink-Wunschliste (XML für „Wanted → Upload", gängige Farbnamen werden
  in BrickLink-Farbnummern übersetzt) und als CSV. Eine Zeile abhaken erledigt
  das Teil in allen Sets. Hinweise bei vermutlichen Element-Nummern und
  unbekannten Farben. Verkaufte Exemplare zählen nicht, der gewählte Sammler
  gilt.

## [0.7.0] - 2026-10-27

Mehr Erinnerung an jedes Stück: Fotos je Exemplar, eine Zeitleiste, was wann
dazukam, und Anleitungen, in denen sich eine Teilenummer finden lässt.

### Hinzugefügt

- **Verlauf der Sammlung** (Sammlung → Verlauf): Was kam wann dazu, nach
  Jahren oder für die letzten 24 Monate. Je Zeitraum Anzahl, Teile, Ausgaben,
  Geschenke und der Stand insgesamt; aufklappbar mit den Sets. Grundlage ist
  „Im Besitz seit", Exemplare ohne Datum stehen getrennt. Gilt für den
  gewählten Sammler, verkaufte Sets zählen nicht mit.
- **Suche in Anleitungen**: Im PDF-Viewer nach Text suchen, etwa nach einer
  Teilenummer. Treffer werden auf der Seite markiert, Pfeile und Enter
  springen zur nächsten Fundstelle, darüber stehen die Seiten mit Treffern.
  Groß- und Kleinschreibung, Umlaute und Leerzeichen zählen nicht. Enthält
  ein PDF nur Bilder, sagt der Viewer das. Dazu ein Feld, um direkt zu einer
  Seitenzahl zu springen. Alles läuft im Browser, nichts verlässt das Gerät.
- **Fotos je Sammlungseintrag**: Jedes Exemplar hat eine eigene Kamera-Schaltfläche
  und eigene Fotos – etwa vom Zustand der Box oder vom Platz im Regal. Bis zu
  vier erscheinen als Vorschau unter dem Eintrag. Die Fotos liegen wie die
  Set-Fotos unter `files/photos/` und sind nur mit Anmeldung abrufbar. Wird
  ein Exemplar oder das ganze Set gelöscht, verschwinden auch die Dateien.

## [0.6.0] - 2026-10-27

Der Katalog lässt sich mit einem Tipp filtern: Besitzstatus und Hersteller
stehen als Reiter über den Sets.

### Geändert

- **Katalogfilter als Reiter**: Besitzstatus und Hersteller stehen als Reiter
  über den Sets statt in Auswahlfeldern – alle Möglichkeiten sichtbar, ein
  Tipp zum Wechseln, auf dem Handy seitlich wischbar. Thema und Jahr bleiben
  Auswahlfelder, weil es davon schnell Dutzende gibt. In „Aus fehlenden Sets
  hinzufügen" auf einer Wunschliste fehlt der Besitzstatus jetzt ganz: Dort
  stehen ohnehin nur fehlende Sets, die Auswahl hatte keine Wirkung.

## [0.5.0] - 2026-10-26

Weniger Wege im Alltag: ein Set aus einem Link anlegen, alles Neue hinter
einem ＋, die Verwaltung unter „Mehr“ und den Mailserver direkt in der App.

### Hinzugefügt

- **Mailserver in der App einrichten**: Unter Mehr → Erinnerungen → Mailserver
  lassen sich Server, Port, Verschlüsselung, Zugang und Absender eintragen –
  ohne `.env` und ohne Neustart. Das Passwort wird verschlüsselt gespeichert
  (AES-256-GCM, Schlüssel aus `BETTER_AUTH_SECRET`), nie wieder angezeigt und
  nicht exportiert. Steht der Server in der `.env`, hat sie weiter Vorrang.
- **Set aus einem Link übernehmen**, für alle Hersteller: Amazon, idealo,
  geizhals, Hersteller-Shops, Brickfact oder Merlins Bricks. Bricktrack liest
  Produktdaten (schema.org, Open Graph, bei Amazon die Produktseite) und, wenn
  die Seite blockt, den Link selbst. Lego wird über Rebrickable ergänzt,
  BlueBrixx und Cobi über Merlins Bricks. Das Ergebnis füllt das Formular vor,
  das Bild wird beim Speichern lokal abgelegt.
- **`pnpm pruefe:umgebung`**: prüft vor dem Start Node- und pnpm-Version, ob
  SQLite lädt, die `.env` (mit derselben Validierung wie die App), den
  Beispiel-Secret, HTTPS für Passkeys, ob `DATA_DIR` beschreibbar ist und ob
  die SMTP-Angaben zusammenpassen. Bei Fehlern endet es mit Exit-Code 1.

### Geändert

- Das Repository liegt jetzt auf GitHub: https://github.com/florianwilde/bricktrack.
  Ein bestehender Klon zieht um mit
  `git remote set-url origin https://github.com/florianwilde/bricktrack.git`.
- Der Zeitplan für Erinnerungen läuft immer und prüft bei jedem Durchlauf, ob
  ein Mailserver eingerichtet ist. Vorher wurde er nur gestartet, wenn SMTP
  schon beim Containerstart in der `.env` stand.
- **Neue Navigation**: unten Start, Katalog, Sammlung, Wünsche und in der
  Mitte ein ＋-Stein mit allen Wegen zu einem neuen Set (Scannen, aus Link,
  Lego-Nummer, von Hand).
- **„Mehr" statt Konto-Menü und Verwaltungsreitern**: Konto, Design,
  Sammler, Einladungen, Erinnerungen, Hersteller, Themen, Standorte und
  Export/Import als Kacheln in Gruppen, hinter dem Button „Mehr" oben rechts.
- **„Für wen?" in der Kopfzeile**: Bei mehreren Sammlern wird das Kind einmal
  oben gewählt und gilt für Startseite, Katalog und Sammlung. Jedes Gerät
  merkt sich die Wahl; ein `?sammler=` im Link hat weiterhin Vorrang.

### Behoben

- Mitglieder (nicht Admin) kamen nicht an Sammler, Hersteller, Themen und
  Standorte heran, obwohl sie diese pflegen dürfen: Der Eintrag
  „Verwaltung" stand nur im Menü des Administrators.

### Sicherheit

- Abrufe im Auftrag eines Nutzers gehen nur an öffentliche Adressen: Jede
  Adresse wird vor dem Verbindungsaufbau geprüft, Weiterleitungen ebenso,
  Größe und Zeit sind begrenzt.

## [0.4.0] - 2026-10-25

Ein neues Gesicht: Bricktrack sieht jetzt aus wie das, was es verwaltet.
Dazu alle bekannten Sicherheitslücken in den Abhängigkeiten geschlossen.

### Sicherheit

- Next.js 15.5.28: schließt unter anderem eine Denial-of-Service-Lücke über
  Server Actions und Cache-Poisoning bei selbst gehosteten Instanzen. Die
  kritische Lücke in der Bildoptimierung war hier nicht ausnutzbar
  (`images.unoptimized`), ist aber ebenfalls behoben.
- nodemailer 10.2: mehrere Fehler im Adressparser (Erinnerungs-Mails).
- better-auth 1.7.12, sharp 0.35.5 (librsvg), zod 4.6.7 (Speicherverbrauch
  bei übergroßen Eingaben), drizzle-orm 0.45.4.
- Entwicklungswerkzeuge: vitest, vite, postcss, Playwright und die
  shadcn-CLI aktualisiert, transitive Pakete per `pnpm.overrides` angehoben.
  Übrig bleibt ein mittlerer Fund in einem alten esbuild, das drizzle-kit
  intern mitbringt - nur beim Entwickeln, nicht im Image.

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

[Unreleased]: https://github.com/florianwilde/bricktrack/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.7.0
[0.6.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.6.0
[0.5.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.5.0
[0.4.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.4.0
[0.3.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.3.0
[0.2.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.2.0
[0.1.0]: https://github.com/florianwilde/bricktrack/releases/tag/v0.1.0
