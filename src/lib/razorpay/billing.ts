/**
 * Razorpay billing helpers — dormant mode.
 *
 * All functions guard on isRazorpayEnabled.
 * When Razorpay is not configured, they return null / throw friendly errors.
 *
 * When Razorpay IS configured, these call edge functions that handle
 * server-side Razorpay SDK operations (subscription, portal, etc.).
 */

import { isRazorpayEnabled } from "./config";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";

export interface RazorpayCheckoutResult {
  subscriptionId: string;
  shortUrl?: string;
}

/**
 * Create a Razorpay subscription for upgrading to Pro (India region).
 * Returns the subscription details, or null if Razorpay is not configured.
 */
export async function createRazorpaySubscription(): Promise<RazorpayCheckoutResult | null> {
  if (!isRazorpayEnabled || !isSupabaseEnabled) return null;

  const { data, error } = await supabase.functions.invoke("razorpay-checkout", {
    body: {
      returnUrl: `${window.location.origin}/upgrade?checkout=success`,
    },
  });

  if (error) throw new Error(error.message || "Failed to create Razorpay subscription");
  return data as RazorpayCheckoutResult;
}
