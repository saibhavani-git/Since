# syntax=docker/dockerfile:1.7
# Multi-stage: build with dev deps, ship only compiled JS + prod deps.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S since && adduser -S since -G since
COPY --from=build --chown=since:since /app/node_modules ./node_modules
COPY --from=build --chown=since:since /app/dist ./dist
COPY --chown=since:since migrations ./migrations
COPY --chown=since:since package.json ./
USER since
EXPOSE 4000
CMD ["node", "dist/main.js"]
