# History Capture (personal use only)

Scans your browsing history every 6 hours, sends every page you visit into your accountability tracker as a task, and lets you triage from there — check it off once you've dealt with it, delete it if it wasn't worth tracking. Only visits from after you install/update this extension are captured; the existing history backlog is never swept in. Not published to the Chrome Web Store — install unpacked, for your own use only.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**, select this `chrome-extension/` folder
4. Click the extension icon in your toolbar → **Settings**
5. Enter your tracker's URL (e.g. `https://accountability-tracker-mu.vercel.app`) and the same secret you set as `NEXT_PUBLIC_API_SHARED_SECRET` on the tracker
6. Optionally, list domains/keywords under **Never capture** — one per line, matched against both the page title and the URL (see "Noise filtering" below)
7. Click **Save**

## How it works

- Runs a scan every 6 hours (`chrome.alarms`), plus you can trigger one manually from the popup ("Scan now")
- Tracks a forward-only cursor (`lastScanCursor`), set once on install/update — each scan only looks at `chrome.history` entries visited after that cursor, then advances it, so nothing before the cursor is ever captured and nothing gets captured twice
- Sends `{ title, url }` for every qualifying page to `POST {tracker URL}/api/capture` with your secret as a Bearer token
- The tracker classifies each item against your active goals (keyword match) — a match auto-attaches it to that goal, no match still creates the task, just standalone in the dashboard's "Unsorted" section for you to sort or delete
- Tracks which URLs it's already sent locally, so it won't resend the same page on every scan

## Noise filtering

- **Built-in**: login/sign-in/auth pages are always skipped — matched by title (e.g. "Sign in", "Verify your...") and a short list of common auth hosts (`accounts.google.com`, etc.) — since these are never real content regardless of topic.
- **Your list**: the Settings "Never capture" field is for habit-tabs no algorithm could guess — your email inbox, calendar, banking, or anything else you check reflexively but never treat as content to revisit. Each line is a substring matched case-insensitively against both title and host.
- What neither filter can catch: a page you opened once, glanced at, and moved on from — that looks identical to genuine content from the outside. That's what deleting it from Unsorted is for.

## What it does NOT do

- Doesn't read page content, only title + URL
- Doesn't touch anything from before you installed/updated this version — no history backlog flood
- Doesn't publish anywhere — this is a personal, unpacked install only
