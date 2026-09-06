#!/usr/bin/env bash
#
# Bricktrack aktualisieren.
#
#   ./update.sh              Update auf den aktuellen Stand von origin/main
#   ./update.sh --no-pull    Nur neu bauen und starten, ohne git pull
#   ./update.sh --no-backup  Ohne Sicherung (nicht empfohlen)
#
# Ablauf: sichern -> holen -> bauen -> starten -> Healthcheck.
# Schlaegt der Healthcheck fehl, wird automatisch auf den vorherigen Stand
# zurueckgerollt und die Sicherung bleibt liegen.

set -euo pipefail

cd "$(dirname "$0")"

BACKUP_DIR="./backups"
KEEP_BACKUPS=10
HEALTH_TIMEOUT=180
DO_PULL=1
DO_BACKUP=1

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --no-backup) DO_BACKUP=0 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
  esac
done

info()  { printf '\033[1;34m[bricktrack]\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m[bricktrack]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[bricktrack]\033[0m %s\n' "$*" >&2; }

# --- Vorbedingungen --------------------------------------------------------

if ! docker compose version >/dev/null 2>&1; then
  error "Docker Compose (Plugin) wurde nicht gefunden."
  exit 1
fi

if [ ! -f .env ]; then
  error "Es gibt keine .env. Lege sie an: cp .env.example .env"
  exit 1
fi

PREVIOUS_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"

# --- Sichern ---------------------------------------------------------------

BACKUP_FILE=""
if [ "$DO_BACKUP" -eq 1 ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/bricktrack-$(date +%Y%m%d-%H%M%S).tar.gz"

  info "Sicherung wird angelegt: $BACKUP_FILE"
  # Der Container wird kurz angehalten, damit die SQLite-Datei nicht mitten in
  # einem Schreibvorgang eingepackt wird.
  docker compose stop app >/dev/null 2>&1 || true
  tar czf "$BACKUP_FILE" data .env 2>/dev/null || {
    error "Die Sicherung ist fehlgeschlagen. Abbruch."
    docker compose start app >/dev/null 2>&1 || true
    exit 1
  }
  info "Sicherung fertig ($(du -h "$BACKUP_FILE" | cut -f1))."

  # Alte Sicherungen aufraeumen, die juengsten bleiben.
  ls -1t "$BACKUP_DIR"/bricktrack-*.tar.gz 2>/dev/null \
    | tail -n +$((KEEP_BACKUPS + 1)) \
    | xargs -r rm --
fi

# --- Holen -----------------------------------------------------------------

if [ "$DO_PULL" -eq 1 ]; then
  if [ -n "$(git status --porcelain)" ]; then
    error "Es gibt lokale Aenderungen im Arbeitsverzeichnis:"
    git status --short >&2
    error "Bitte erst aufraeumen oder mit --no-pull starten."
    exit 1
  fi

  info "Neue Version wird geholt …"
  git pull --ff-only
  NEW_COMMIT="$(git rev-parse HEAD)"

  if [ "$NEW_COMMIT" = "$PREVIOUS_COMMIT" ]; then
    info "Es gibt nichts Neues. Der Container wird trotzdem neu gestartet."
  else
    info "Neuer Stand: $(git log -1 --pretty='%h %s')"
  fi
fi

# --- Bauen und starten -----------------------------------------------------

info "Image wird gebaut …"
docker compose build app

info "Container wird gestartet …"
docker compose up -d app

# --- Healthcheck -----------------------------------------------------------

info "Warte auf den Healthcheck (max. ${HEALTH_TIMEOUT}s) …"
elapsed=0
healthy=0

while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' bricktrack 2>/dev/null || echo 'missing')"

  case "$status" in
    healthy) healthy=1; break ;;
    unhealthy) break ;;
    missing) error "Der Container bricktrack laeuft nicht."; break ;;
  esac

  sleep 3
  elapsed=$((elapsed + 3))
  printf '.'
done
printf '\n'

if [ "$healthy" -eq 1 ]; then
  info "Bricktrack laeuft."
  docker compose ps app
  exit 0
fi

# --- Rueckabwicklung -------------------------------------------------------

error "Die neue Version ist nicht gesund geworden. Die letzten Logzeilen:"
docker compose logs --tail 50 app >&2

if [ "$DO_PULL" -eq 1 ] && [ -n "$PREVIOUS_COMMIT" ]; then
  warn "Rollback auf $PREVIOUS_COMMIT …"
  git reset --hard "$PREVIOUS_COMMIT"
  docker compose build app
  docker compose up -d app
  warn "Der vorherige Stand laeuft wieder."
fi

if [ -n "$BACKUP_FILE" ]; then
  warn "Die Daten liegen unveraendert in $BACKUP_FILE."
  warn "Zurueckspielen falls noetig:"
  warn "  docker compose down && tar xzf $BACKUP_FILE && sudo chown -R 1000:1000 ./data && docker compose up -d"
fi

exit 1
