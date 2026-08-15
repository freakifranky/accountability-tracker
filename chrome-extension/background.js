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
  for (const item of items) {
    if (!item.url || !item.title) continue;
    if (!item.url.startsWith("http")) continue; // skip chrome://, extension pages, etc.

    const sourceId = normalizeUrlLocally(item.url);
    if (submitted.has(sourceId)) continue; // already sent — don't resend the same page every scan

    candidates.push({ title: item.title, url: item.url });
    submitted.add(sourceId);
  }

  if (candidates.length === 0) {
    await chrome.storage.local.set({ lastScanAt: now, lastScanCursor: now, lastScanResult: "Nothing new to capture." });
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
        lastScanResult: `Captured ${data.created} item${data.created === 1 ? "" : "s"} (${data.matched} matched a goal, ${data.unsorted} unsorted, ${data.duplicates} already captured).`,
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
