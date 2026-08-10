# syntax=docker/dockerfile:1
#
# Build depuis la RACINE du monorepo (context: . dans docker-compose.yml), pas
# depuis apps/api/ : le projet est en npm workspaces, `npm ci` a besoin du
# package.json + package-lock.json racine pour résoudre les dépendances.
#
# Cible avec `--target dev` (hot-reload, code monté en volume) ou
# `--target prod` (image de production autonome). Voir docker-compose.yml.

ARG NODE_VERSION=22-alpine

# -----------------------------------------------------------------------------
# deps — installe les dépendances une seule fois, réutilisé par dev/build/prod
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Uniquement les package.json des workspaces réellement utilisés par l'API
# (api + shared) — apps/mobile est volontairement exclu : Expo ne tourne
# jamais en conteneur (accès aux appareils/émulateurs), voir ARCHITECTURE.md.
# npm workspaces utilise un lockfile unique pour tout le monorepo : `npm ci`
# installera aussi les dépendances déclarées ailleurs dans package-lock.json
# même sans le dossier apps/mobile présent (limitation connue de npm
# workspaces, contrairement à pnpm --filter). L'image est donc plus lourde
# que le strict nécessaire pour l'API seule — acceptable en dev, pas
# bloquant en prod.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=api --include-workspace-root

# -----------------------------------------------------------------------------
# dev — hot-reload ; le code source est monté en volume par docker-compose.yml,
# ce stage ne contient donc que les dépendances et attend le bind mount.
# -----------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start:dev", "--workspace=api"]

# -----------------------------------------------------------------------------
# build — compile NestJS (apps/api/dist)
# -----------------------------------------------------------------------------
FROM deps AS build
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=api

# -----------------------------------------------------------------------------
# prod — image d'exécution minimale, dépendances de prod uniquement,
# utilisateur non-root
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=api --include-workspace-root --omit=dev \
    && npm cache clean --force

COPY --from=build /app/apps/api/dist apps/api/dist
COPY packages/shared packages/shared

RUN addgroup -S planai && adduser -S planai -G planai \
    && mkdir -p apps/api/uploads \
    && chown -R planai:planai /app
USER planai

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
