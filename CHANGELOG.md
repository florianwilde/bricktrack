# Changelog

Alle nennenswerten Aenderungen an Bricktrack werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefuegt

- Projekt-Scaffold: Next.js 15 (App Router, TypeScript strict),
  Tailwind CSS 4, shadcn/ui, pnpm.
- Vollstaendiges Datenmodell in Drizzle ORM mit initialer Migration:
  Katalog, Besitz, Wunschlisten und die Auth-Tabellen von better-auth.
- SQLite-Anbindung mit WAL-Modus, aktivierten Fremdschluesseln und
  Migrations-Runner (`pnpm db:migrate`).
- Projektdokumentation: CLAUDE.md, Roadmap, Changelog, Devlog.

[Unreleased]: https://git.wilde-server.de/florian.wilde/bricktrack/compare/main...HEAD
