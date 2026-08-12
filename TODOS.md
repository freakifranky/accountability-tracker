# TODOs

Captured during `/plan-eng-review` on 2026-08-12, reviewing the "Second Brain — Consolidated Honest-Coach Hub" design doc.

## ~~Google OAuth production verification~~ (OBSOLETE — 2026-08-12)
Originally tracked because a standalone YouTube Data API poller would have hit Google's 7-day refresh-token expiry in "Testing" mode. Franky corrected the capture assumption: he doesn't use YouTube's "Watch Later," he abandons YouTube videos in open browser tabs — which Chrome-tab capture already catches with no separate Google auth needed. The YouTube Data API integration was dropped entirely, so this TODO no longer applies. (Google Calendar API still needs its own auth for the push side, but that's a separate, already-tracked spike in the design doc, not a token-expiry risk on the capture path.)

## Upgrade classifier from keyword matching to LLM
**What:** Replace the Phase 1 keyword-matching classifier (matches captured item titles against Goal names/keywords) with an LLM call for better accuracy on ambiguous titles.
**Why:** The eng review chose keyword matching over the original design doc's LLM-classifier plan, to avoid a new paid API dependency and an extra failure mode in Phase 1, and because keyword matching is exhaustively unit-testable in a way LLM output isn't.
**Pros:** Better classification on edge cases an LLM would catch and a keyword list would miss (e.g. "why I sold my Nvidia calls" reads as stocks to an LLM, might not match any of your stock keywords).
**Cons:** New paid API dependency, prompt tuning work, another failure mode (API down/rate-limited) to handle.
**Context:** Only worth it if keyword matching's accuracy actually turns out to be a real problem in practice — i.e. you notice miscategorized items often enough that the coach callout stops feeling trustworthy.
**Depends on / blocked by:** Phase 1 shipped, some real usage data on keyword-matching accuracy.
