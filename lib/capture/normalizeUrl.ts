// Normalizes a captured URL into a stable dedup key: strips protocol, "www.",
// trailing slash, and common tracking params, so the same page open in two
// tabs (or with a different ?utm_source=... / YouTube ?si=... appended) doesn't
// create duplicate captured tasks across poll runs.
const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "si", "feature"];

export function normalizeUrlForDedup(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    TRACKING_PARAMS.forEach((p) => url.searchParams.delete(p));
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    const query = url.searchParams.toString();
    return `${host}${path}${query ? "?" + query : ""}`.toLowerCase();
  } catch {
    return rawUrl.toLowerCase().trim();
  }
}
