# Roadmap

Legende: `[ ]` offen · `[~]` in Arbeit · `[x]` fertig

## Phase 1 - MVP (v0.1.0, abgeschlossen am 07.09.2026)

Laeuft vollstaendig im Docker-Stack.

- [x] Projekt-Scaffold (Next 15, Tailwind 4, shadcn/ui, pnpm)
- [x] Datenmodell in Drizzle, initiale Migration
- [x] Projektdokumentation (CLAUDE.md, Roadmap, Changelog, Devlog)
- [x] Auth: Registrierung des ersten Users (wird Admin), Login mit
      Passwort, Passkey anlegen und damit einloggen (Conditional UI),
      Passkey-Verwaltung unter "Konto", Rate-Limit auf Login
- [x] Mobile-first Layout-Shell mit Bottom-Navigation
- [x] Stammdaten: Hersteller, Themen (mit Unterthemen), Standorte
- [x] Set-Katalog: Kachelliste, Suche, Filter (Hersteller, Thema, Jahr,
      Besitzstatus), Anlegen und Bearbeiten
- [x] Upload-Pipeline (PDF/JPEG/PNG/WebP, Magic-Byte-Pruefung,
      serverseitige Dateinamen, Thumbnails)
- [x] Set-Detailseite: Metadaten, Bild, Anleitungen mit pdf.js-Viewer,
      Fotos, Sammlungseintraege
- [x] Sammlung: Uebersicht, Filter, Statistik-Kacheln
- [x] Fehlende Sets (`/katalog?besitz=fehlt`) mit Mehrfachauswahl und
      Bulk-Aktion "Zur Wunschliste hinzufuegen"
- [x] Wunschlisten: Verwaltung, Prioritaet, Sortierung, Teilen,
      Ueberraschungsmodus, automatisches "erfuellt"
- [x] Oeffentliche Wunschliste `/w/[shareToken]` mit Reservierung ohne
      Anmeldung und Storno-Link
- [x] Seed-Skript (3 Hersteller, 10 Sets, 4 in Sammlung, 1 Wunschliste)
- [x] Unit-Tests (Besitzstatus, Bulk-Add inkl. Dubletten, Reservierung,
      Token-Erzeugung) und Playwright-Smoke-Test
- [x] Docker: Multi-Stage-Build, Compose-Stack, Healthcheck, Entrypoint
- [x] Dokumentation: README, QUICKSTART, bebilderte Anleitung,
      update.sh, Nginx-Proxy-Manager-Konfiguration

## Phase 2 - Komfort (v0.2.0, abgeschlossen am 07.09.2026)

- [x] Rebrickable-Import: Setnummer eingeben, Metadaten und Bild
      uebernehmen, Bild lokal cachen. Ohne API-Key bleibt alles manuell.
- [x] Barcode-Scanner (EAN) per Handykamera, Suche nach EAN, bei
      Unbekanntem direkt ins Formular "Neues Set"
- [x] Fehlteile je Sammlungseintrag pflegen
- [x] Einladungslinks durch den Admin
- [x] Export/Import: gesamte Datenbank als JSON, Dateien als ZIP,
      Sammlung zusaetzlich als CSV
- [x] PWA: Manifest, Service Worker, Katalog offline lesbar

## Phase 3 - Nice to have (v0.3.0, abgeschlossen am 07.09.2026)

- [x] Mehrere Sammler mit eigener Sammlung und eigenen Wunschlisten,
      gemeinsamer Katalog
- [x] Preisbeobachtung und Wertentwicklung (manuell gepflegt).
      Der BrickLink-Preisfuehrer war als optional vermerkt und wurde
      bewusst weggelassen: er verlangt OAuth1 mit einer pro Nutzer
      registrierten Anwendung - viel Apparat fuer eine Zahl, die sich in
      zehn Sekunden eintippen laesst. Die Datenstruktur ist offen dafuer.
- [x] E-Mail-Erinnerung (SMTP), wenn ein Wunschlisten-Termin naeher
      rueckt und Eintraege unreserviert sind
- [x] Dublettenpruefung beim Anlegen von Sets

## Design und Sicherheit (v0.4.0, abgeschlossen am 25.10.2026)

- [x] Abhängigkeiten mit bekannten Sicherheitslücken aktualisiert

- [x] Designauswahl pro Gerät, sechs Designs, Standard „Klemmbaustein"
- [x] Platzhalter für Sets ohne Bild, neues Logo, Schriften lokal
- [x] Startseite als Überblick mit Steinreihe und nächstem Termin

## Alltag (v0.5.0, abgeschlossen am 26.10.2026)

- [x] Set aus einem Link übernehmen, für alle Hersteller
- [x] ＋-Stein mittig in der unteren Navigation mit allen Wegen zu einem
      neuen Set (ersetzt den geplanten Scan-Button)
- [x] Seite „Mehr“ statt Konto-Menü und Verwaltungsreitern
- [x] „Für wen?“ in der Kopfzeile bei mehreren Sammlern
- [x] Mailserver in der App einrichten
- [x] `pnpm pruefe:umgebung` prüft die Umgebung vor dem Start

## Katalog-Reiter (v0.6.0, abgeschlossen am 27.10.2026)

- [x] Filter im Katalog als Reiter statt Auswahlfelder (aus 0.4.0
      nachgeholt): Besitzstatus und Hersteller als Reiter, Thema und Jahr
      bleiben Auswahlfelder

## Fotos, Suche und Verlauf (v0.7.0, abgeschlossen am 27.10.2026)

- [x] Mehrere Fotos je Sammlungseintrag (bisher nur je Set)
- [x] Anleitungen im PDF-Viewer durchsuchen, dazu Sprung auf eine Seitenzahl
- [x] Statistik über die Zeit: was kam wann dazu (Sammlung → Verlauf)

## Danach

Phase 1 bis 3 sind umgesetzt. Was noch offen ist, steht hier - ohne Termin
und ohne Anspruch auf Vollstaendigkeit:

- [ ] BrickLink-Preisfuehrer anbinden, falls der Aufwand sich doch lohnt
