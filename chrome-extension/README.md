# History Capture (personal use only)

Scans your browsing history every 6 hours, sends pages that look like articles, videos, or threads worth referencing into your accountability tracker as a task, and lets you triage from there — check it off once you've dealt with it, delete it if it wasn't worth tracking. Only visits from after you install/update this extension are captured; the existing history backlog is never swept in. Not published to the Chrome Web Store — install unpacked, for your own use only.

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

## What counts as "worth keeping"

Instead of capturing everything and filtering noise out, a page has to positively look like an article, video, or thread before it's captured at all:

- **Threads** — deep-link URL shapes that only occur on one specific post: X/Twitter `/status/`, Reddit `/comments/`, Hacker News `/item`.
- **Articles** — either a known blog path segment (`/article/`, `/articles/`, `/blog/`), or a domain-agnostic fallback: the last URL segment looks like a real content slug (3+ hyphenated, mostly-alphabetic words, e.g. `product-manager-role`) rather than an ID (a UUID-shaped segment is explicitly rejected, so a job posting's `/post/5707c314-...` doesn't slip through). This is what catches sites that were never explicitly listed anywhere — the shape of the URL is the signal, not which site it's on.
- **Videos** — any video URL (YouTube, Vimeo) whose title also reads as reference material: keywords like "how to," "tutorial," "course," "guide," "explained," or explainer/listicle phrasing like "5 Types of..." / "3 Ways to...". A video URL alone isn't enough — this is what separates a tutorial from entertainment, since there's no URL-shape difference between the two.

On top of that, two more filters:
- **Built-in**: login/sign-in/auth pages are always skipped — matched by title (e.g. "Sign in", "Verify your...") and a short list of common auth hosts (`accounts.google.com`, etc.) — these are never real content regardless of topic, so they're excluded even if a title happened to match one of the patterns above.
- **Your list**: the Settings "Never capture" field is for habit-tabs no algorithm could guess — your email inbox, calendar, banking, or a specific tool you use functionally (LinkedIn, Upwork, etc.) but never treat as content to revisit. Each line is a substring matched case-insensitively against both title and host.

What none of this can catch: a page that matches one of the shapes above but you only opened once, glanced at, and moved on from — that looks identical to genuine content from the outside, since intent isn't observable from browsing metadata. That's what deleting it from Unsorted is for.

## What it does NOT do

- Doesn't read page content, only title + URL
- Doesn't touch anything from before you installed/updated this version — no history backlog flood
- Doesn't publish anywhere — this is a personal, unpacked install only
