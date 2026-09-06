# Changelog

Alle nennenswerten Aenderungen an Bricktrack werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

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

[Unreleased]: https://git.wilde-server.de/florian.wilde/bricktrack/compare/v0.1.0...HEAD
[0.1.0]: https://git.wilde-server.de/florian.wilde/bricktrack/releases/tag/v0.1.0
