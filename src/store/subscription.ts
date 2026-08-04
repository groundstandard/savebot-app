import { create } from 'zustand';

/**
 * Subscription / entitlement state (Sprint 6, payments).
 *
 * `isPro` is a placeholder until the RevenueCat purchase flow is wired — that
 * flow will set it from the customer's entitlements (and Restore Purchases).
 * Everything that gates on it stays inert while PAYWALL_ENABLED is false — see
 * src/lib/subscription.ts.
 */
interface SubscriptionState {
  isPro: boolean;
  setPro: (isPro: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPro: false,
  setPro: (isPro) => set({ isPro }),
}));
