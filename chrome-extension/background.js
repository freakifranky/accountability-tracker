const SCAN_ALARM = "tab-capture-scan";
const SCAN_INTERVAL_MINUTES = 60 * 6; // every 6 hours

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create(SCAN_ALARM, { periodInMinutes: SCAN_INTERVAL_MINUTES });
  // Cursor-based capture only looks forward from here — set it once, on the
  // very first install/update after this code shipped, so the existing history
  // backlog never gets swept in as a single flood. Guarded so re-running this
  // listener on a later update doesn't reset an already-advancing cursor.
  const { lastScanCursor } = await chrome.storage.local.get("lastScanCursor");
  if (!lastScanCursor) {
    await chrome.storage.local.set({ lastScanCursor: Date.now() });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) scanHistory();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "scan-now") scanHistory();
});

// Mirrors lib/capture/normalizeUrl.ts closely enough for local dedup
// bookkeeping. The server does the authoritative dedup by sourceId — this is
// just to avoid re-POSTing the same page every 6-hour scan.
const TRACKING_PARAMS = [
  "si", "feature",
  "gclid", "gbraid", "wbraid", "dclid",
  "fbclid",
  "msclkid",
  "twclid", "ttclid", "igshid",
  "mc_cid", "mc_eid",
  "_ga", "_gl",
  "ref", "ref_src",
  "yclid",
];
const TRACKING_PARAM_PREFIXES = ["utm_", "gad_"];

function normalizeUrlLocally(rawUrl) {
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

// Built-in noise filter — pages that are structurally never worth capturing
// regardless of topic, because they're transient auth/login flows, not
// content. Title match catches most providers without needing to enumerate
// every possible auth domain; the host list covers the handful of common
// ones where the title alone might not be distinctive enough.
const AUTH_TITLE_PATTERNS = [
  "sign in", "log in", "login", "authenticate", "authentication",
  "verify your", "two-factor", "2-step verification", "one-time passcode",
  "enter your password", "reset your password", "forgot password",
];
const AUTH_HOSTS = [
  "accounts.google.com",
  "login.microsoftonline.com",
  "appleid.apple.com",
  "login.live.com",
  "auth0.com",
  "okta.com",
];

function isAuthNoise(title, url) {
  const t = title.toLowerCase();
  if (AUTH_TITLE_PATTERNS.some((p) => t.includes(p))) return true;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return AUTH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// User-maintained exclude list (Settings) — for habit-tabs no algorithm could
// guess (your email inbox, calendar, banking, whatever you personally check
// reflexively). Matched as a case-insensitive substring against both the
// title and the host, so one entry like "gmail" or "mail.google.com" works
// either way without the user needing to know which field to target.
function buildExcludeChecker(excludePatterns) {
  const patterns = excludePatterns.map((p) => p.toLowerCase().trim()).filter(Boolean);
  if (patterns.length === 0) return () => false;
  return (title, url) => {
    const t = title.toLowerCase();
    let host = "";
    try { host = new URL(url).hostname.toLowerCase(); } catch { /* leave host empty */ }
    return patterns.some((p) => t.includes(p) || host.includes(p));
  };
}

// Positive "worth keeping" signal — replaces "capture everything" with
// "capture things that look like an article, video, or thread you'd
// actually use as a reference." Job postings, product/tool pages, and
// YouTube videos with no reference-style title all fall through as noise,
// same as the auth/exclude filters — just based on what the content
// structurally looks like rather than where it's hosted.
const REFERENCE_TITLE_KEYWORDS = [
  "how to", "tutorial", "course", "guide", "explained", "masterclass",
  "walkthrough", "lecture", "learn",
];
// "5 Types of...", "The 3 Ways to...", "10 Tips for..." — explainer/listicle
// phrasing that doesn't use any of the keywords above but is just as clearly
// reference material (this is what "The 2 Types of Stuckness for Product
// Managers" needed — none of the keywords matched it).
const EXPLAINER_TITLE_PATTERN = /\b\d+\s+(types?|ways?|steps?|tips?|reasons?|things?|mistakes?|rules?|lessons?|habits?|principles?)\b/i;

function looksLikeReferenceTitle(title) {
  const t = title.toLowerCase();
  if (REFERENCE_TITLE_KEYWORDS.some((k) => t.includes(k))) return true;
  return EXPLAINER_TITLE_PATTERN.test(title);
}

// Deep-link URL shapes that only occur when viewing one specific
// post/thread, not general browsing — precise enough on their own without
// needing a title check too.
const THREAD_URL_PATTERNS = [
  /\/status\/\d+/i, // X / Twitter
  /\/r\/[^/]+\/comments\//i, // Reddit
  /news\.ycombinator\.com\/item/i, // Hacker News
];
// Deliberately narrow — "/post/" and "/p/" were left out because they also
// show up in job boards and social platforms (e.g. a job posting's URL can
// contain "/post/"), which would wrongly let noise back in.
const ARTICLE_PATH_SEGMENTS = ["/article/", "/articles/", "/blog/"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isThreadUrl(url) {
  return THREAD_URL_PATTERNS.some((re) => re.test(url));
}

function isArticlePathUrl(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return ARTICLE_PATH_SEGMENTS.some((seg) => path.includes(seg));
  } catch {
    return false;
  }
}

// Domain-agnostic fallback for sites we've never seen before — a fixed path
// list or a user-maintained allowlist only helps for domains someone already
// knows to add. Most article/blog platforms use a descriptive, hyphenated
// slug as the last URL segment regardless of which site it is (e.g.
// "product-manager-role"), so this catches unknown sites automatically
// instead of requiring them to be enumerated in advance.
//
// Explicitly rejects UUID-shaped segments (job posting IDs, etc.) — those
// are hyphenated too, but they're identifiers, not readable words, and
// "mostly-alphabetic words" is what actually separates a slug from an ID.
function looksLikeContentSlug(url) {
  let segments;
  try {
    segments = new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return false;
  }
  if (segments.length === 0) return false;

  const last = segments[segments.length - 1];
  if (UUID_PATTERN.test(last)) return false;

  const words = last.split("-").filter(Boolean);
  if (words.length < 3) return false;

  const alphabeticCount = words.filter((w) => /^[a-z]+$/i.test(w)).length;
  return alphabeticCount >= words.length - 1; // allow at most one non-word part, e.g. a year
}

// The overall "is this worth keeping" decision. Note there's no special case
// for YouTube here — a video URL with no reference-style title just falls
// through to looksLikeReferenceTitle() and fails it, which is exactly the
// entertainment-vs-tutorial filter, achieved for free rather than as a
// separate branch.
function looksWorthKeeping(title, url) {
  return isThreadUrl(url) || isArticlePathUrl(url) || looksLikeContentSlug(url) || looksLikeReferenceTitle(title);
}

async function scanHistory() {
  const { apiBaseUrl, apiSecret } = await chrome.storage.local.get(["apiBaseUrl", "apiSecret"]);
  if (!apiBaseUrl || !apiSecret) {
    await chrome.storage.local.set({
      lastScanAt: Date.now(),
      lastScanResult: "Not configured — open Settings and add your tracker URL + secret.",
    });
    return;
  }

  const { submittedSourceIds = [] } = await chrome.storage.local.get("submittedSourceIds");
  const submitted = new Set(submittedSourceIds);

  const { excludePatterns = [] } = await chrome.storage.local.get("excludePatterns");
  const isUserExcluded = buildExcludeChecker(excludePatterns);

  const now = Date.now();
  // lastScanCursor is the forward-only high-water mark: only visits after it
  // get considered, so a page you visit even once shows up, but the existing
  // history backlog from before this cursor existed never floods in at once.
  const { lastScanCursor = now } = await chrome.storage.local.get("lastScanCursor");

  const items = await chrome.history.search({
    text: "",
    startTime: lastScanCursor,
    maxResults: 1000,
  });

  const candidates = [];
  let skippedNoise = 0;
  for (const item of items) {
    if (!item.url || !item.title) continue;
    if (!item.url.startsWith("http")) continue; // skip chrome://, extension pages, etc.
    if (isAuthNoise(item.title, item.url) || isUserExcluded(item.title, item.url)) {
      skippedNoise++;
      continue;
    }
    if (!looksWorthKeeping(item.title, item.url)) {
      skippedNoise++;
      continue;
    }

    const sourceId = normalizeUrlLocally(item.url);
    if (submitted.has(sourceId)) continue; // already sent — don't resend the same page every scan

    candidates.push({ title: item.title, url: item.url });
    submitted.add(sourceId);
  }

  if (candidates.length === 0) {
    const suffix = skippedNoise > 0 ? ` (${skippedNoise} filtered as noise)` : "";
    await chrome.storage.local.set({
      lastScanAt: now,
      lastScanCursor: now,
      lastScanResult: `Nothing new to capture.${suffix}`,
    });
    return;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({ items: candidates }),
    });

    if (res.ok) {
      const data = await res.json();
      await chrome.storage.local.set({
        submittedSourceIds: Array.from(submitted),
        lastScanAt: now,
        lastScanCursor: now,
        lastScanResult: `Captured ${data.created} item${data.created === 1 ? "" : "s"} (${data.matched} matched a goal, ${data.unsorted} unsorted, ${data.duplicates} already captured, ${skippedNoise} filtered as noise).`,
      });
    } else {
      await chrome.storage.local.set({
        lastScanAt: now,
        lastScanResult: `Capture failed: ${res.status} ${res.statusText}. Check your secret in Settings.`,
      });
      // Don't advance lastScanCursor or persist submittedSourceIds on failure — retry the same window next time.
    }
  } catch (err) {
    await chrome.storage.local.set({
      lastScanAt: now,
      lastScanResult: `Network error reaching the tracker: ${err.message}`,
    });
  }
}
