#!/bin/sh
# Startet den Container: Verzeichnisse pruefen, Migrationen anwenden, App starten.
set -e

DATA_DIR="${DATA_DIR:-/data}"

echo "[bricktrack] Datenverzeichnis: $DATA_DIR"

if ! mkdir -p "$DATA_DIR/db" "$DATA_DIR/files" 2>/dev/null; then
  echo ""
  echo "  FEHLER: In $DATA_DIR darf nicht geschrieben werden."
  echo ""
  echo "  Der Container laeuft als Nutzer 'node' (UID 1000). Das gemountete"
  echo "  Verzeichnis muss ihm gehoeren. Auf dem Host einmalig:"
  echo ""
  echo "      mkdir -p ./data && sudo chown -R 1000:1000 ./data"
  echo ""
  exit 1
fi

if [ ! -w "$DATA_DIR/db" ]; then
  echo "  FEHLER: $DATA_DIR/db ist nicht beschreibbar (sudo chown -R 1000:1000 ./data)."
  exit 1
fi

echo "[bricktrack] Migrationen werden angewendet …"
node /app/migrate.cjs

echo "[bricktrack] Start auf Port ${PORT:-3000}"
exec "$@"
