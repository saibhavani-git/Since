# since.

**What changed while you were away.** A watchlist that helps you check less.

Open the app, and instead of fifteen rows of green and red you get one question answered: *what happened since I last looked?* Three things ranked by how much they matter to you, nine things quiet, forty‑eight seconds of narrated cards if you want them. Then it lets you go.

Since is also an engine. Our web app is its first customer; any broker can call the same API and get the same ranked digest for their own users.

## Repository layout

Two independent projects, one repo. Nothing is shared at build time, so each folder can be moved to its own repository without changes.

```
api/   Node service (Fastify + Postgres). Auth, watchlists, market data, the digest engine, partner API
web/   Next.js app. Marketing site, sign‑in, dashboard, catch‑up
```

The API is the contract. It publishes an OpenAPI document at `/openapi.json`; the web app and partners consume that.

## Run it

One command brings up everything — Postgres, Redis, the API, the background worker, and the web app:

```bash
docker compose --profile app up -d --build
```

The product is on [http://localhost:3001](http://localhost:3001) and the API on [http://localhost:4000](http://localhost:4000). Sign up with any Indian mobile number; the development OTP is `246810`.

### Local development

For day‑to‑day work, run only the infrastructure in containers and the apps on your machine with hot reload:

```bash
docker compose up -d          # postgres + redis

# terminal 1 — API on :4000
cd api && pnpm install && pnpm dev

# terminal 2 — web on :3001
cd web && pnpm install && pnpm dev
```

Requirements: Node 22+, pnpm 9+.

## Deploy

`deploy/` holds the production overlay: Caddy terminates HTTPS (automatic Let's Encrypt) on one hostname and path-routes `/v1/*`, `/health` and `/openapi.json` to the API, everything else to the web app — so session cookies stay first-party and CORS never comes up. On a box with Docker:

```bash
docker compose --profile app -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build
```

It expects a `.env` beside `docker-compose.yml` with `SITE_ADDRESS` and `NEXT_PUBLIC_API_URL`, and a production `api/.env` (`NODE_ENV=production`, a real `JWT_SECRET`, `COOKIE_SECURE=true`).

## Where to read next

- [`/architecture`](http://localhost:3001/architecture) on the site — the diagram, why each piece was chosen, and what we would change at scale.
- [`/developers`](http://localhost:3001/developers) — the partner API: auth, endpoints, and a complete integration flow.
