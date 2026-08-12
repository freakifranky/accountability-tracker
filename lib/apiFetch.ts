export const API_ERROR_EVENT = "api-fetch-error";

export interface ApiFetchOptions extends RequestInit {
  // Set true for genuinely optional background calls (e.g. an app-icon badge
  // count) where failure shouldn't interrupt the user with a toast. Still
  // throws, so callers must still catch — it just skips the global toast.
  silent?: boolean;
}

// Client-side fetch wrapper that attaches the shared-secret auth header.
// Use this instead of raw fetch() for any call to this app's own /api/* routes.
//
// Throws on a non-ok response (and dispatches a global "api-fetch-error" event
// with a readable message, caught by <ErrorToast /> in the root layout) instead
// of silently returning a failed Response like the old callers assumed. Every
// interactive action in this app used to call fetch().then(() => router.refresh())
// with no res.ok check — a failed request looked identical to a successful one,
// which is exactly what happened in production when NEXT_PUBLIC_API_SHARED_SECRET
// was missing: every write silently 500'd and nothing appeared to happen.
export async function apiFetch(input: string, init: ApiFetchOptions = {}): Promise<Response> {
  const { silent, ...requestInit } = init;
  const secret = process.env.NEXT_PUBLIC_API_SHARED_SECRET;
  const headers = new Headers(requestInit.headers);
  if (secret) headers.set("Authorization", `Bearer ${secret}`);

  let res: Response;
  try {
    res = await fetch(input, { ...requestInit, headers });
  } catch (err) {
    const message = "Couldn't reach the server. Check your connection and try again.";
    if (!silent) dispatchApiError(message);
    throw err instanceof Error ? err : new Error(message);
  }

  if (!res.ok) {
    const message = await readableErrorMessage(res);
    if (!silent) dispatchApiError(message);
    throw new Error(message);
  }

  return res;
}

async function readableErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // response wasn't JSON — fall through to the generic message
  }
  if (res.status === 401) return "Not authorized — the app's API secret may be missing or wrong.";
  return `Something went wrong (${res.status}). Try again.`;
}

function dispatchApiError(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: message }));
}
