const SCAN_ALARM = "tab-capture-scan";
const OPEN_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, matches the design doc's threshold
const SCAN_INTERVAL_MINUTES = 60 * 6; // every 6 hours

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SCAN_ALARM, { periodInMinutes: SCAN_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) scanTabs();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "scan-now") scanTabs();
});

// chrome.tabs doesn't expose "how long has this tab been open" directly —
// track first-seen timestamps ourselves so the 3-day threshold is measurable.
async function trackOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const { firstSeen = {} } = await chrome.storage.local.get("firstSeen");
  const now = Date.now();
  let changed = false;
  const seenTabIds = new Set();

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    seenTabIds.add(String(tab.id));
    if (!firstSeen[tab.id]) {
      firstSeen[tab.id] = now;
      changed = true;
    }
  }

  // Prune tabs that no longer exist so the map doesn't grow forever.
  for (const tabId of Object.keys(firstSeen)) {
    if (!seenTabIds.has(tabId)) {
      delete firstSeen[tabId];
      changed = true;
    }
  }

  if (changed) await chrome.storage.local.set({ firstSeen });
  return firstSeen;
}

// Mirrors lib/capture/normalizeUrl.ts closely enough for local dedup
// bookkeeping. The server does the authoritative dedup by sourceId — this is
// just to avoid re-POSTing the same still-open tab on every 6-hour scan.
function normalizeUrlLocally(rawUrl) {
  try {
    const url = new URL(rawUrl);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "si", "feature"].forEach((p) =>
      url.searchParams.delete(p)
    );
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    const query = url.searchParams.toString();
    return `${host}${path}${query ? "?" + query : ""}`.toLowerCase();
  } catch {
    return rawUrl.toLowerCase().trim();
  }
}

async function scanTabs() {
  const { apiBaseUrl, apiSecret } = await chrome.storage.local.get(["apiBaseUrl", "apiSecret"]);
  if (!apiBaseUrl || !apiSecret) {
    await chrome.storage.local.set({
      lastScanAt: Date.now(),
      lastScanResult: "Not configured — open Settings and add your tracker URL + secret.",
    });
    return;
  }

  const firstSeen = await trackOpenTabs();
  const { submittedSourceIds = [] } = await chrome.storage.local.get("submittedSourceIds");
  const submitted = new Set(submittedSourceIds);

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const candidates = [];

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !tab.title) continue;
    if (!tab.url.startsWith("http")) continue; // skip chrome://, extension pages, etc.

    const age = now - (firstSeen[tab.id] ?? now);
    if (age < OPEN_THRESHOLD_MS) continue;

    const sourceId = normalizeUrlLocally(tab.url);
    if (submitted.has(sourceId)) continue; // already sent — don't resend every scan while the tab stays open

    candidates.push({ title: tab.title, url: tab.url });
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
        lastScanResult: `Captured ${data.created} item${data.created === 1 ? "" : "s"} (${data.discarded} didn't match a goal, ${data.duplicates} already captured).`,
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
