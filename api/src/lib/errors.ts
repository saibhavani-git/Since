/**
 * Domain errors carry an HTTP status and a stable machine code so the HTTP
 * layer can map them without `instanceof` chains, and clients can branch on
 * `code` rather than parsing messages.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super("validation_error", message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in") {
    super("unauthorized", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You can't do that") {
    super("forbidden", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super("not_found", `${what} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("conflict", message, 409);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many attempts. Try again in a bit.") {
    super("rate_limited", message, 429);
  }
}

/** An optional capability (voice, LLM polish) is switched off on this deployment. */
export class NotConfiguredError extends AppError {
  constructor(capability: string) {
    super("not_configured", `${capability} is not configured on this server`, 501);
  }
}

export class UpstreamError extends AppError {
  constructor(message = "A data provider is unavailable", details?: unknown) {
    super("upstream_unavailable", message, 503, details);
  }
}
