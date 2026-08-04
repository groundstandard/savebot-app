# SaveBot — Last Phase Notes: Payments (Sprint 6)

_Snapshot for when we resume. Last major phase is Sprint 6. The non-blocked half is now built; the remaining work is the **RevenueCat purchase wiring**, which is blocked on Bobby._

## Where we are
- **Sprints 1–5 built** and running (auth incl. Google + Apple, onboarding + personalized categories, library, share-sheet saving + AI ingestion on Railway n8n, structured cards + Original View, search, manual add, recipe Cook Mode, polish).
- **Sprint 6 = Payments, basic sharing, testing, launch prep.**

## ✅ Done on our side (2026-08-04) — all inert behind `PAYWALL_ENABLED = false`
Mirrors **PRD §6**. Nothing blocks anyone today; flip the flag at launch.
- **Paywall UI** — `app/upgrade.tsx` (Pro features, Monthly $4.99 / Annual $39.99 = PRD pricing, 7-day trial CTA, "coming soon" modal until IAP is live).
- **Subscription store** — `src/store/subscription.ts` (`isPro` placeholder, to be fed by RevenueCat).
- **Free-tier gates** — `src/lib/subscription.ts`:
  - 5 saves / month cap.
  - Instagram-only saves for free (platform gate in `createSaveFromShare`).
  - Manual content addition (Add screen) = Pro.
  - Subcategories = Pro (free = top-level categories only).
  - Each gated action routes to `/upgrade`.
- Commits: `338f14e` (save cap + paywall routing), `257462b` (platform / manual-add / subcategory gates).

## ⛔ Remaining — RevenueCat wiring (blocked on Bobby)
- **RevenueCat account**, connected to App Store Connect + Play Console.
- **Apple Developer** (exists — Tempura Brand LLC) + **Google Play Developer** accounts — to create the subscription products.
- **Final pricing** confirmed (PRD suggests $4.99/mo, $39.99/yr, 7-day trial; validate).
- Then, our side:
  - Integrate **RevenueCat SDK**: purchase flow (wire `upgrade.tsx` CTA), **restore purchases**, **subscription management** (current plan / cancel).
  - Feed **`isPro`** from RevenueCat entitlements. Per PRD §7, also add `users.subscription_tier` (enum free/pro) + `subscription_expires_at` (migration) and keep them in sync via a **RevenueCat webhook → Supabase Edge Function**.
  - RevenueCat keys → **EAS env vars** (production + development EAS environments still have NO vars — set those before any store build).
  - **Flip `PAYWALL_ENABLED = true`** in `src/lib/subscription.ts`.

## Rest of Sprint 6 (after payments)
- **Basic sharing** — share card image + shareable web link + deep link back into the app. (Free tier: watermarked share cards, per PRD.)
- **Testing** — real-device end-to-end, sandbox purchases, edge cases, crash reporting (Sentry/Bugsnag), analytics (Mixpanel/PostHog).
- **Store submission** — screenshots, descriptions, privacy policy + ToS, App Review notes, TestFlight/closed beta → production (both stores).

## First step when we resume
1. Confirm Bobby's RevenueCat + store accounts + final pricing.
2. Wire the RevenueCat SDK (purchase + restore + entitlement → `isPro`), add the `users.subscription_tier` column + webhook sync.
3. Add RevenueCat keys to the EAS environments, flip `PAYWALL_ENABLED = true`, then a fresh build to test sandbox purchases on-device.

_Full detail: Sprint 6 in `SaveBot_sprint.txt`; tier rules in PRD §6. Nothing left on our side needs code until Bobby's accounts + pricing are ready._
