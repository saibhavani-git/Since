import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The API's error envelope, thrown as a typed error so UI can branch on `code`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
  static async from(res: Response): Promise<ApiError> {
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
      return new ApiError(res.status, body.error?.code ?? "unknown", body.error?.message ?? res.statusText, body.error?.details);
    } catch {
      return new ApiError(res.status, "unknown", res.statusText);
    }
  }
}

/**
 * Sessions live in httpOnly cookies set by the API. When an access token
 * expires we refresh once and replay the request; if that fails the caller
 * gets the 401 and the app shell sends the user to sign in.
 */
let refreshing: Promise<boolean> | null = null;
const refreshSession = (): Promise<boolean> => {
  refreshing ??= fetch(`${API_URL}/v1/auth/refresh`, { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

const auth: Middleware = {
  async onResponse({ request, response }) {
    const path = new URL(request.url).pathname;
    // `/auth/me` is the first request after a tab has been idle, so it must
    // be allowed to refresh. Only requests that issue/validate credentials
    // are excluded to prevent a failed login from refreshing an old session.
    const cannotRefresh = new Set(["/v1/auth/refresh", "/v1/auth/login", "/v1/auth/signup", "/v1/auth/otp/verify", "/v1/auth/otp/resend"]).has(path);
    if (response.status !== 401 || cannotRefresh) return response;
    if (!(await refreshSession())) return response;
    return fetch(request.clone());
  },
};

export const api = createClient<paths>({ baseUrl: API_URL, credentials: "include" });
api.use(auth);

/** Unwrap openapi-fetch's `{ data, error, response }` into data-or-throw, the shape TanStack Query wants. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, response } = await p;
  if (!response.ok) throw await ApiError.from(response);
  return data as T;
}
