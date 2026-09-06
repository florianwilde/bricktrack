# Roadmap

Legende: `[ ]` offen · `[~]` in Arbeit · `[x]` fertig

## Phase 1 - MVP (Ziel: v0.1.0)

Alles laeuft vollstaendig im Docker-Stack.

- [x] Projekt-Scaffold (Next 15, Tailwind 4, shadcn/ui, pnpm)
- [x] Datenmodell in Drizzle, initiale Migration
- [x] Projektdokumentation (CLAUDE.md, Roadmap, Changelog, Devlog)
- [ ] Auth: Registrierung des ersten Users (wird Admin), Login mit
      Passwort, Passkey anlegen und damit einloggen (Conditional UI),
      Passkey-Verwaltung unter "Konto", Rate-Limit auf Login
- [ ] Mobile-first Layout-Shell mit Bottom-Navigation
- [ ] Stammdaten: Hersteller, Themen (mit Unterthemen), Standorte
- [ ] Set-Katalog: Kachelliste, Suche, Filter (Hersteller, Thema, Jahr,
      Besitzstatus), Anlegen und Bearbeiten
- [ ] Upload-Pipeline (PDF/JPEG/PNG/WebP, Magic-Byte-Pruefung,
      serverseitige Dateinamen, Thumbnails)
- [ ] Set-Detailseite: Metadaten, Bild, Anleitungen mit pdf.js-Viewer,
      Fotos, Sammlungseintraege
- [ ] Sammlung: Uebersicht, Filter, Statistik-Kacheln
- [ ] Fehlende Sets (`/katalog?besitz=fehlt`) mit Mehrfachauswahl und
      Bulk-Aktion "Zur Wunschliste hinzufuegen"
- [ ] Wunschlisten: Verwaltung, Prioritaet, Sortierung, Teilen,
      Ueberraschungsmodus, automatisches "erfuellt"
- [ ] Oeffentliche Wunschliste `/w/[shareToken]` mit Reservierung ohne
      Anmeldung und Storno-Link
- [ ] Seed-Skript (3 Hersteller, 10 Sets, 4 in Sammlung, 1 Wunschliste)
- [ ] Unit-Tests (Besitzstatus, Bulk-Add inkl. Dubletten, Reservierung,
      Token-Erzeugung) und Playwright-Smoke-Test
- [ ] Docker: Multi-Stage-Build, Compose-Stack, Healthcheck, Entrypoint
- [ ] Dokumentation: README, QUICKSTART, bebilderte Anleitung,
      update.sh, Nginx-Proxy-Manager-Konfiguration

## Phase 2 - Komfort (Ziel: v0.2.0)

- [ ] Rebrickable-Import: Setnummer eingeben, Metadaten und Bild
      uebernehmen, Bild lokal cachen. Ohne API-Key bleibt alles manuell.
- [ ] Barcode-Scanner (EAN) per Handykamera, Suche nach EAN, bei
      Unbekanntem direkt ins Formular "Neues Set"
- [ ] Fehlteile je Sammlungseintrag pflegen
- [ ] Einladungslinks durch den Admin
- [ ] Export/Import: gesamte Datenbank als JSON, Dateien als ZIP,
      Sammlung zusaetzlich als CSV
- [ ] PWA: Manifest, Service Worker, Katalog offline lesbar

## Phase 3 - Nice to have (Ziel: v0.3.0)

- [ ] Mehrere Sammler mit eigener Sammlung und eigenen Wunschlisten,
      gemeinsamer Katalog
- [ ] Preisbeobachtung und Wertentwicklung (manuell gepflegt,
      optional BrickLink-Preisfuehrer)
- [ ] E-Mail-Erinnerung (SMTP), wenn ein Wunschlisten-Termin naeher
      rueckt und Eintraege unreserviert sind
- [ ] Dublettenpruefung beim Anlegen von Sets
