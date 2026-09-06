# Devlog

Zeiterfassung und Nachvollziehbarkeit der Entwicklung. Eine Zeile je
abgeschlossenem Arbeitsschritt, Zeiten in `HH:mm` (Europe/Berlin).

## Phase 1 - MVP

### 2026-09-06

| Von | Bis | Dauer | Schritt | Ergebnis | Commit |
|---|---|---|---|---|---|
| 22:06 | 22:12 | 0:06 | Planung | Phase-1-Plan und Drizzle-Schema zur Freigabe vorgelegt; 5 Entscheidungsfragen geklaert (Cent statt Float, Migrator statt drizzle-kit im Image, Bilder oeffentlich / PDFs geschuetzt, Token gehasht, Branch pro Phase) | - |
| 22:12 | 22:20 | 0:08 | Scaffold | pnpm via npm global installiert (corepack scheiterte an Rechten in `C:\Program Files\nodejs`), Next 15.5.25 + Tailwind 4 + shadcn/ui (radix-nova) mit 20 Komponenten | `0de49a9` |
| 22:20 | 22:26 | 0:06 | Datenmodell | 19 Tabellen in Drizzle, CHECK-Constraints fuer `instruction`, `photo` und `priority`, Unique-Index `(wishlist_id, set_id)`, Migration erzeugt und angewendet, WAL verifiziert | `06268bc` |
| 22:26 | 22:34 | 0:08 | Dokumentation | CLAUDE.md (Stack, Konventionen, Datenmodell, Sicherheitsregeln), Roadmap, Changelog, Devlog | `folgt` |

**Summe Phase 1 bisher: 0:28**

## Notizen und Entscheidungen

- **pnpm**: `corepack enable` scheitert auf diesem Rechner an fehlenden
  Schreibrechten in `C:\Program Files\nodejs`. Stattdessen
  `npm install -g pnpm@10`; pnpm liegt unter
  `%APPDATA%\npm\pnpm.ps1` und ist im PATH.
- **shadcn-CLI**: Die aktuelle Version (4.21) arbeitet mit Presets
  (`-p nova`) und Base-Libraries (`-b radix`) statt der frueheren
  Style-Auswahl. Sie zieht `cn` und `radix-ui` als Pakete; `clsx` und
  `tailwind-merge` werden dadurch nicht mehr direkt gebraucht.
- **better-auth 1.7.3**: Das Passkey-Plugin liegt nicht mehr unter
  `better-auth/plugins/passkey`, sondern im eigenen Paket
  `@better-auth/passkey` (Exports `.` und `./client`). Das erwartete
  Schema deckt sich exakt mit der Tabelle `passkey`.
