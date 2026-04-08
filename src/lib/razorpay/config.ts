/**
 * Razorpay configuration — dormant mode.
 *
 * Reads VITE_RAZORPAY_KEY_ID from env.
 * When not set, Razorpay features gracefully degrade.
 *
 * Razorpay handles India billing region.
 * Stripe handles international billing region.
 */

export const RAZORPAY_KEY_ID: string | undefined =
  import.meta.env.VITE_RAZORPAY_KEY_ID || undefined;

/** True when Razorpay keys are configured and billing is live. */
export const isRazorpayEnabled: boolean = Boolean(RAZORPAY_KEY_ID);
