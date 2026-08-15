const SCAN_ALARM = "tab-capture-scan";
const HISTORY_WINDOW_DAYS = 14; // how far back to look for visits at all
const REVISIT_SPAN_MS = 3 * 24 * 60 * 60 * 1000; // first-to-last visit must span 3+ days, matches the original open-tab threshold
const MIN_VISIT_COUNT = 2; // a single click-through doesn't count as "still nagging you"
const SCAN_INTERVAL_MINUTES = 60 * 6; // every 6 hours

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SCAN_ALARM, { periodInMinutes: SCAN_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) scanHistory();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "scan-now") scanHistory();
});

// A page counts as "still nagging you" if you've come back to it 2+ times,
// spread across at least REVISIT_SPAN_MS — reading something once and moving
// on doesn't qualify, only genuine repeat engagement without ever finishing it.
async function isRevisitedAcrossSpan(url) {
  const visits = await chrome.history.getVisits({ url });
  if (visits.length < MIN_VISIT_COUNT) return false;
  const times = visits.map((v) => v.visitTime).sort((a, b) => a - b);
  return times[times.length - 1] - times[0] >= REVISIT_SPAN_MS;
}

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

  const now = Date.now();
  const items = await chrome.history.search({
    text: "",
    startTime: now - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    maxResults: 1000,
  });

  const candidates = [];
  for (const item of items) {
    if (!item.url || !item.title) continue;
    if (!item.url.startsWith("http")) continue; // skip chrome://, extension pages, etc.
    if ((item.visitCount ?? 0) < MIN_VISIT_COUNT) continue; // cheap filter before the getVisits() call below

    const sourceId = normalizeUrlLocally(item.url);
    if (submitted.has(sourceId)) continue; // already sent — don't resend the same page every scan

    if (!(await isRevisitedAcrossSpan(item.url))) continue;

    candidates.push({ title: item.title, url: item.url });
    submitted.add(sourceId);
  }

  if (candidates.length === 0) {
    await chrome.storage.local.set({ lastScanAt: now, lastScanResult: "Nothing new to capture." });
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
        lastScanResult: `Captured ${data.created} item${data.created === 1 ? "" : "s"} (${data.matched} matched a goal, ${data.unsorted} unsorted, ${data.duplicates} already captured).`,
      });
    } else {
      await chrome.storage.local.set({
        lastScanAt: now,
        lastScanResult: `Capture failed: ${res.status} ${res.statusText}. Check your secret in Settings.`,
      });
      // Don't persist submittedSourceIds on failure — retry these on the next scan.
    }
  } catch (err) {
    await chrome.storage.local.set({
      lastScanAt: now,
      lastScanResult: `Network error reaching the tracker: ${err.message}`,
    });
  }
}
