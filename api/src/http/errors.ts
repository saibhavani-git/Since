import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";
import { AppError } from "../lib/errors.js";

/**
 * One place turns anything thrown into the `{ error: { code, message } }`
 * envelope from the contract. Unknown errors are logged with a stack and
 * returned as a bare 500 — never their message.
 */
export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof AppError) {
    reply.status(error.status).send({
      error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) },
    });
    return;
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    reply.status(400).send({
      error: {
        code: "validation_error",
        message: error.validation[0]?.message ?? "Invalid request",
        details: error.validation.map((v) => ({ path: v.instancePath, message: v.message })),
      },
    });
    return;
  }

  if (isResponseSerializationError(error)) {
    request.log.error({ err: error, issues: error.cause.issues }, "response failed contract");
    reply.status(500).send({ error: { code: "internal_error", message: "Something went wrong on our side" } });
    return;
  }

  const status = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  if (status === 429) {
    reply.status(429).send({ error: { code: "rate_limited", message: "Too many requests. Try again in a bit." } });
    return;
  }
  if (status >= 500) {
    request.log.error({ err: error }, "unhandled error");
    reply.status(500).send({ error: { code: "internal_error", message: "Something went wrong on our side" } });
    return;
  }
  reply.status(status).send({ error: { code: "request_error", message: error.message } });
}
