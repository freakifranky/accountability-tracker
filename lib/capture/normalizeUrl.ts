// Normalizes a captured URL into a stable dedup key: strips protocol, "www.",
// trailing slash, and common tracking params, so the same page open in two
// tabs (or reached via a different ad/social link with tracking params
// appended) doesn't create duplicate captured tasks across poll runs.
const TRACKING_PARAMS = [
  "si", "feature", // YouTube
  "gclid", "gbraid", "wbraid", "dclid", // Google Ads / DoubleClick click ids
  "fbclid", // Facebook
  "msclkid", // Microsoft/Bing
  "twclid", "ttclid", "igshid", // Twitter/X, TikTok, Instagram
  "mc_cid", "mc_eid", // Mailchimp
  "_ga", "_gl", // Google Analytics linker params
  "ref", "ref_src", // generic referral
  "yclid", // Yandex
];
// Prefix match covers every utm_* variant (utm_source, utm_id, ...) and every
// gad_* Google Ads param (gad_source, gad_campaignid, ...) without needing to
// enumerate each one — this is what the Hostinger URL slipped through on
// originally (utm_id and gad_source/gad_campaignid weren't in the fixed list).
const TRACKING_PARAM_PREFIXES = ["utm_", "gad_"];

export function normalizeUrlForDedup(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    Array.from(url.searchParams.keys()).forEach((key) => {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.includes(lower) || TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))) {
        url.searchParams.delete(key);
      }
    });
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    const query = url.searchParams.toString();
    return `${host}${path}${query ? "?" + query : ""}`.toLowerCase();
  } catch {
    return rawUrl.toLowerCase().trim();
  }
}
