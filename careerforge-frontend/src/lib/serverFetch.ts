import { redirect } from "next/navigation";

interface ServerFetchOptions extends RequestInit {
  /** Skip the automatic JWT refresh-retry on 401. Defaults to false. */
  skipRefresh?: boolean;
}

class ServerFetchError extends Error {
  statusCode: number;
  errorSources?: { path: string; message: string }[];

  constructor(message: string, statusCode: number, errorSources?: { path: string; message: string }[]) {
    super(message);
    this.name = "ServerFetchError";
    this.statusCode = statusCode;
    this.errorSources = errorSources;
  }
}

let redirectingToLogin = false;

const redirectToLogin = () => {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  if (typeof window !== "undefined") {
    redirect("/login")
  }
};

/**
 * THE single fetch wrapper for all API calls.
 *
 * Rules:
 * - Attaches credentials (httpOnly cookies) automatically for same-origin.
 * - On a 401, calls POST /api/auth/refresh once, retries the original request.
 * - Redirects to /login only if refresh also fails.
 */
export async function serverFetch<T = unknown>(
  path: string,
  options: ServerFetchOptions = {}
): Promise<T> {
  const { skipRefresh = false, headers, ...rest } = options;

  const makeRequest = (): Promise<Response> => {
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    const url = pathWithSlash.startsWith("/api")
      ? pathWithSlash
      : `/api${pathWithSlash}`;

    return fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  };

  let response = await makeRequest();

  if (!response.ok && response.status === 401 && !skipRefresh) {
    // Refresh tokens once and retry
    try {
      const refreshResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        response = await makeRequest();
      }
    } catch {
      // Refresh failed; fall through to the 401 handling below
    }
  }

  if (!response.ok) {
    let message = "Request failed";
    let errorSources: { path: string; message: string }[] | undefined;

    try {
      const body = await response.json();
      message = body?.message || message;
      errorSources = body?.errorSources;
    } catch {
      // Response was not JSON; keep default message
    }

    if (response.status === 401) {
      redirectToLogin();
    }

    throw new ServerFetchError(message, response.status, errorSources);
  }

  // Handle 204 No Content (no body)
  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json();
  // Backend wraps responses in { success, data, message }
  return (body?.data ?? body) as T;
}
