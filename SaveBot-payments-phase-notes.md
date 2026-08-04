# SaveBot — Last Phase Notes: Payments (Sprint 6)

_Snapshot for when we resume. The last major phase is Sprint 6; the core remaining dev work is **payments (RevenueCat)**._

## Where we are
- **Sprints 1–5 built** and running (auth incl. Google + Apple, onboarding + personalized categories, library, share-sheet saving + AI ingestion on Railway n8n, structured cards + Original View, search, manual add, recipe Cook Mode, polish).
- **Sprint 6 = Payments, basic sharing, testing, launch prep.** Payments is the piece that touches the whole app (it gates free vs paid), so it goes first.

## Payments scope (RevenueCat)
- Configure subscription products in **App Store Connect** + **Google Play Console** (monthly + annual).
- Integrate the **RevenueCat SDK** in the app.
- **Paywall screen** — shown when a free user hits the limit or opens a Pro feature.
- **Subscription management** screen — current plan, upgrade, cancel.
- **Server-side entitlement check** — Supabase Edge Function + RevenueCat webhooks (source of truth for who's Pro).
- **Free-tier enforcement** — 5 saves/month + feature gating.
- **7-day free trial.**
- **Restore purchases** flow.

## Blocked on Bobby (can't start until these exist)
- **RevenueCat account**, connected to App Store Connect + Play Console.
- **Apple Developer** account (exists — Tempura Brand LLC) + **Google Play Developer** account — needed to create the subscription products.
- **Subscription pricing decided** (monthly + annual amounts, trial length confirmed).
- RevenueCat API keys → then set as **EAS env vars** (currently empty; production + development EAS environments still have no vars at all — set those before any store build).

## Rest of Sprint 6 (after payments)
- **Basic sharing** — share card image + shareable web link + deep link back into the app.
- **Testing** — real-device end-to-end, sandbox purchases, edge cases, crash reporting (Sentry/Bugsnag), analytics (Mixpanel/PostHog).
- **Store submission** — screenshots, descriptions, privacy policy + ToS, App Review notes, TestFlight/closed beta → production (both stores).

## First step when we resume
1. Confirm Bobby's RevenueCat + store accounts + final pricing.
2. Wire the **RevenueCat SDK + paywall + free-tier gating** first (it affects the whole app), then subscription management + restore + trial.
3. Add RevenueCat keys to the EAS production/development environments, then a fresh build to test sandbox purchases on-device.

_Full detail: Sprint 6 in `SaveBot_sprint.txt`. Nothing here needs code until Bobby's accounts + pricing are ready._
