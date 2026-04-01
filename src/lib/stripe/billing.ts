/**
 * Stripe billing helpers — dormant mode.
 *
 * All functions guard on isStripeEnabled.
 * When Stripe is not configured, they return null / throw friendly errors.
 *
 * When Stripe IS configured, these call edge functions that handle
 * server-side Stripe SDK operations (checkout, portal, etc.).
 */

import { isStripeEnabled } from "./config";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";

export interface CheckoutResult {
  url: string;
}

export interface PortalResult {
  url: string;
}

/**
 * Create a Stripe Checkout session for upgrading to Pro.
 * Returns the checkout URL, or null if Stripe is not configured.
 */
export async function createCheckoutSession(): Promise<CheckoutResult | null> {
  if (!isStripeEnabled || !isSupabaseEnabled) return null;

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      returnUrl: `${window.location.origin}/upgrade?checkout=success`,
      cancelUrl: `${window.location.origin}/upgrade?checkout=canceled`,
    },
  });

  if (error) throw new Error(error.message || "Failed to create checkout session");
  return data as CheckoutResult;
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 * Returns the portal URL, or null if Stripe is not configured.
 */
export async function createPortalSession(): Promise<PortalResult | null> {
  if (!isStripeEnabled || !isSupabaseEnabled) return null;

  const { data, error } = await supabase.functions.invoke("stripe-portal", {
    body: {
      returnUrl: `${window.location.origin}/settings`,
    },
  });

  if (error) throw new Error(error.message || "Failed to create portal session");
  return data as PortalResult;
}
