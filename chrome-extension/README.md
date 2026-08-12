# Tab Capture (personal use only)

Scans your open Chrome tabs every 6 hours, flags anything open 3+ days, classifies it against your active goals, and sends matches to your accountability tracker. Not published to the Chrome Web Store — install unpacked, for your own use only.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**, select this `chrome-extension/` folder
4. Click the extension icon in your toolbar → **Settings**
5. Enter your tracker's URL (e.g. `https://accountability-tracker-mu.vercel.app`) and the same secret you set as `NEXT_PUBLIC_API_SHARED_SECRET` on the tracker
6. Click **Save**

## How it works

- Runs a scan every 6 hours (`chrome.alarms`), plus you can trigger one manually from the popup ("Scan now")
- Tracks when each tab was first seen (Chrome doesn't expose this natively) so it can tell which tabs have been open 3+ days
- Sends `{ title, url }` for qualifying tabs to `POST {tracker URL}/api/capture` with your secret as a Bearer token
- The tracker classifies each item against your active goals (keyword match) and discards anything that doesn't match — nothing gets captured just because a tab sat open
- Tracks which URLs it's already sent locally, so it won't resend the same still-open tab on every scan

## What it does NOT do

- Doesn't read tab content, only title + URL
- Doesn't touch tabs open less than 3 days
- Doesn't publish anywhere — this is a personal, unpacked install only
