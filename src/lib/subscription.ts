import { supabase } from './supabase';
import { useSubscriptionStore } from '../store/subscription';

/**
 * Free-tier limits + the paywall gate (Sprint 6, payments).
 *
 * PAYWALL_ENABLED is the master switch and stays FALSE until launch — so the
 * counting/gating below is completely inert (no one is ever blocked) while we
 * test and while the RevenueCat purchase flow is still being wired up. At
 * launch, flip it to true; by then `useSubscriptionStore.isPro` is fed by
 * RevenueCat, so free users get the 5/month cap and Pro users are unlimited.
 */
export const FREE_SAVE_LIMIT = 5;
export const PAYWALL_ENABLED = false;

/** Thrown by the save flow when a free user is over their monthly limit. */
export class PaywallRequiredError extends Error {
  constructor() {
    super('Free save limit reached');
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
 * Gate a save. No-op unless the paywall is enabled AND the user is on the free
 * tier AND they've hit the monthly limit — in which case it throws
 * PaywallRequiredError so the caller can route to the paywall (/upgrade).
 */
export async function assertCanSave(userId: string): Promise<void> {
  if (!PAYWALL_ENABLED) return;
  if (useSubscriptionStore.getState().isPro) return;
  const used = await getSavesThisMonth(userId);
  if (used >= FREE_SAVE_LIMIT) throw new PaywallRequiredError();
}
