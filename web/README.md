# since — web

The Next.js app: marketing site, sign-in, watchlist, and the catch-up. It holds no business logic — everything it shows comes from the API.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3001 — expects the API on :4000
```

## How it talks to the API

The client is generated from the API's OpenAPI document:

```bash
pnpm gen:api    # refresh src/lib/api/schema.d.ts from a running API
```

If the contract changes, the app fails to compile instead of failing in front of a user.

## Layout

```
src/app/         routes: (marketing), (auth), (app)
src/features/    one folder per product area: auth, digest, market, stock, watchlist, marketing
src/components/  shared UI: buttons, cards, charts, shell
src/lib/         API client, formatting, utilities
```
