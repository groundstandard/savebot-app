import { supabase } from './supabase';
import { useSubscriptionStore } from '../store/subscription';

/**
 * Free-tier limits + feature gates + the paywall (Sprint 6, payments).
 *
 * Rules mirror PRD §6 "Monetization & Tier Structure". PAYWALL_ENABLED is the
 * master switch and stays FALSE until launch — so every gate below is inert
 * (nobody is ever blocked) while we test and while the RevenueCat purchase flow
 * is still being wired. At launch, flip it to true; by then
 * useSubscriptionStore.isPro is fed by RevenueCat (and users.subscription_tier),
 * so free users get the caps and Pro users get everything.
 */
export const PAYWALL_ENABLED = false;

// PRD §6 — Free tier caps.
export const FREE_SAVE_LIMIT = 5; // 5 saves per month
export const FREE_PLATFORMS = ['instagram']; // single-platform (Instagram only)
// Also Pro-only on the free tier: manual content addition + subcategories.
// (Structured extraction is server-side; semantic search / social / watermarks
// aren't built yet — those gates land with those features.)

/** Gating is active only when the paywall is on AND the user isn't Pro. */
function gatingActive(isPro: boolean): boolean {
  return PAYWALL_ENABLED && !isPro;
}
function isProNow(): boolean {
  return useSubscriptionStore.getState().isPro;
}

// ── Feature gates (booleans, for UI + guards) ───────────────────────────────
/** Manual content addition (Add screen) — Pro only on the free tier. */
export function canManualAdd(isPro: boolean): boolean {
  return !gatingActive(isPro);
}
/** Subcategories — Pro only (free tier is top-level categories only). */
export function canUseSubcategories(isPro: boolean): boolean {
  return !gatingActive(isPro);
}
/** Saving from a platform — free tier is Instagram-only. */
export function canSaveFromPlatform(platform: string | null | undefined, isPro: boolean): boolean {
  if (!gatingActive(isPro)) return true;
  return !!platform && FREE_PLATFORMS.includes(platform);
}

/** Thrown by the save flow when a free user hits a gate; caller routes to /upgrade. */
export class PaywallRequiredError extends Error {
  constructor() {
    super('SaveBot Pro required');
    this.name = 'PaywallRequiredError';
  }
}

/** How many items the user has saved in the current (UTC) calendar month. */
export async function getSavesThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from('saved_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart);
  return count ?? 0;
}

/**
 * Gate a save. No-op unless the paywall is on AND the user is free-tier — then
 * it enforces PRD §6: Instagram-only + the 5-saves/month cap. Throws
 * PaywallRequiredError so the caller can route to /upgrade. Omit `platform` to
 * skip the platform check (e.g. a manual image, which the Add screen already
 * gates behind Pro).
 */
export async function assertCanSave(userId: string, platform?: string | null): Promise<void> {
  if (!gatingActive(isProNow())) return;
  if (platform !== undefined && !FREE_PLATFORMS.includes(platform ?? '')) throw new PaywallRequiredError();
  const used = await getSavesThisMonth(userId);
  if (used >= FREE_SAVE_LIMIT) throw new PaywallRequiredError();
}
