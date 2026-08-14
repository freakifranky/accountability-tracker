# History Capture (personal use only)

Scans your browsing history every 6 hours, flags pages you've revisited 2+ times spanning 3+ days, classifies them against your active goals, and sends matches to your accountability tracker. Not published to the Chrome Web Store — install unpacked, for your own use only.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**, select this `chrome-extension/` folder
4. Click the extension icon in your toolbar → **Settings**
5. Enter your tracker's URL (e.g. `https://accountability-tracker-mu.vercel.app`) and the same secret you set as `NEXT_PUBLIC_API_SHARED_SECRET` on the tracker
6. Click **Save**

## How it works

- Runs a scan every 6 hours (`chrome.alarms`), plus you can trigger one manually from the popup ("Scan now")
- Searches `chrome.history` for pages visited in the last 14 days, then checks each candidate's full visit timeline (`chrome.history.getVisits`) for at least 2 visits spanning 3+ days — a page you read once and moved on from doesn't qualify, only genuine repeat engagement
- Sends `{ title, url }` for qualifying pages to `POST {tracker URL}/api/capture` with your secret as a Bearer token
- The tracker classifies each item against your active goals (keyword match) and discards anything that doesn't match — nothing gets captured just because you revisited a page
- Tracks which URLs it's already sent locally, so it won't resend the same page on every scan

## What it does NOT do

- Doesn't read page content, only title + URL
- Doesn't touch pages visited once, or pages first-to-last visited within 3 days
- Doesn't publish anywhere — this is a personal, unpacked install only
