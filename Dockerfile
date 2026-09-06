# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Bricktrack - Multi-Stage-Build
#
# Ergebnis ist ein schlankes Runtime-Image mit Next.js im Standalone-Modus,
# das als Nutzer "node" laeuft. Alle Daten liegen ausserhalb des Images unter
# /data, damit ein Update nichts anfasst, was dir gehoert.
# ---------------------------------------------------------------------------

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# --- Abhaengigkeiten -------------------------------------------------------
# better-sqlite3 und sharp bringen Prebuilds mit; die Build-Werkzeuge sind der
# Rueckfallweg, falls fuer die Plattform keines existiert.
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build -----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Platzhalter nur fuer den Build: src/env.ts validiert beim Import, und die
# echten Werte kommen zur Laufzeit aus der .env. Keiner dieser Werte landet im
# Image-Zustand, weil keine Seite vorgerendert wird.
ENV NODE_ENV=production
ENV BASE_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=build-platzhalter-0123456789-abcdefghij
ENV DATA_DIR=/tmp/build-data

RUN pnpm build

# Der Migrations-Runner wird zu einer einzelnen Datei gebuendelt. So braucht
# das Runtime-Image kein drizzle-kit und kein tsx - nur das native
# better-sqlite3, das ohnehin dabei ist. Das Buendel ist CommonJS, weil
# mitgebuendelte CJS-Abhaengigkeiten sonst am require() der Node-Builtins
# scheitern.
RUN pnpm exec esbuild scripts/migrate.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --target=node22 \
    --external:better-sqlite3 \
    --outfile=dist/migrate.cjs

# --- Laufzeit --------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
ENV MIGRATIONS_DIR=/app/drizzle

# Standalone bringt seine eigenen node_modules mit - kein pnpm install noetig.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/dist/migrate.cjs ./migrate.cjs
COPY --chown=node:node docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Anlaufstelle fuer Datenbank und Uploads. Wird per Bind-Mount ueberdeckt;
# das Anlegen hier sorgt nur dafuer, dass der Pfad auch ohne Mount existiert.
RUN mkdir -p /data/db /data/files && chown -R node:node /data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
