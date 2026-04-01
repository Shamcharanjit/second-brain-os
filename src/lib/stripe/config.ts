/**
 * Stripe configuration — dormant mode.
 *
 * Reads VITE_STRIPE_PUBLISHABLE_KEY from env.
 * When not set, all Stripe features gracefully degrade to "coming soon".
 *
 * No Stripe SDK is loaded client-side — checkout/portal use server-side
 * edge functions that create sessions and return URLs.
 */

export const STRIPE_PUBLISHABLE_KEY: string | undefined =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || undefined;

/** True when Stripe keys are configured and billing is live. */
export const isStripeEnabled: boolean = Boolean(STRIPE_PUBLISHABLE_KEY);
