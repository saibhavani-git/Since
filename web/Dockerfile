# syntax=docker/dockerfile:1.7
# Multi-stage: build with dev deps, ship only the standalone server bundle.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
# NEXT_PUBLIC_* values are inlined at build time. The browser calls the API
# directly, so this must be a URL the *host* can reach — not a compose name.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S since && adduser -S since -G since
COPY --from=build --chown=since:since /app/.next/standalone ./
COPY --from=build --chown=since:since /app/.next/static ./.next/static
COPY --from=build --chown=since:since /app/public ./public
USER since
EXPOSE 3001
CMD ["node", "server.js"]
