// Client-side fetch wrapper that attaches the shared-secret auth header.
// Use this instead of raw fetch() for any call to this app's own /api/* routes.
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const secret = process.env.NEXT_PUBLIC_API_SHARED_SECRET;
  const headers = new Headers(init.headers);
  if (secret) headers.set("Authorization", `Bearer ${secret}`);
  return fetch(input, { ...init, headers });
}
