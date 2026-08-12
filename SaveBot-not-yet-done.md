# SaveBot — Not Yet Done (checked against the PRD)

_What's still left to build, cross-checked with `SaveBot_PRD.txt`. Sprints 1–5 are built; Sprint 6 (payments / launch) is in progress. Payments detail lives in `SaveBot-payments-phase-notes.md`._

## New / requested by Bobby (2026-08)
1. **Connect ideas across your saves** — link related saved ideas together, beyond the basic "related items" (same subcategory) that already exists. Maps to **semantic search (pgvector)**, which IS in the PRD (Search + Pro tier) but is **not built yet**.
2. **Show other places online to learn more** about a saved idea — surface outside resources/links related to a save. **New — beyond the original PRD.** (Today SaveBot only keeps a link back to the original post and extracts any tools/resources mentioned *inside* the post; it doesn't recommend outside places to learn more.)
3. **iPhone version (TestFlight)** — the app isn't built for iPhone yet; needs Bobby's Apple account to make the TestFlight build. (The Android test build is done.)

## PRD features not yet built
- **Semantic / natural-language search** (pgvector) — e.g. "that pasta dish with the creamy sauce I saved last week." (Same as #1 above.)
- **Full media pipeline** — save every carousel image and download the video for transcription. Right now only the main thumbnail is saved.
- **Instagram / Facebook content fetch** — those platforms lock their posts down; needs a Facebook app token or a paid scraper (Bobby's call on cost). TikTok / YouTube pull in fine.
- **All platforms** — full Facebook, X, and YouTube support.
- **Social features** — sharing (share card + web link + deep link), public profiles, following, community templates.
- **Export** — PDF / CSV / send to Notion.

## Payments (Sprint 6) — see `SaveBot-payments-phase-notes.md`
- Free-tier limits + paywall screen: **done** (switched off until launch).
- Actual purchase flow, restore purchases, subscription management: **not built** — needs Bobby's RevenueCat + store accounts + final pricing.

## Launch prep
- iOS build + TestFlight (needs Apple account); App Store / Play Store submission (screenshots, privacy policy, review).
- Testing: sandbox purchases, crash reporting, analytics.
