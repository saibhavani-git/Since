import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

/**
 * The OpenAPI document is generated from the same Zod schemas that validate
 * and serialise every route, served at /openapi.json. The web app
 * renders it on /developers; partners can feed it to any generator.
 */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Since API",
        version: "1.0.0",
        description:
          "What changed in a watchlist since a moment in time — ranked by how much it matters to the person watching. " +
          "Session endpoints power the Since app; `/v1/partner/*` exposes the same engine to partner apps with an API key.",
      },
      tags: [
        { name: "auth", description: "Phone + password sessions" },
        { name: "market", description: "Instruments, quotes, candles, market status" },
        { name: "watchlists", description: "Watchlists, items and theses" },
        { name: "digest", description: "The since‑you‑left digest" },
        { name: "partner", description: "Same engine, your users, API‑key auth" },
      ],
      components: {
        securitySchemes: {
          session: { type: "apiKey", in: "cookie", name: "since_access" },
          apiKey: { type: "http", scheme: "bearer", description: "Partner key, `sk_…`" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());
}
