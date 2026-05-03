/**
 * Capture sharing helpers.
 *
 * Creates a public read-only share link for any capture or idea.
 * Uses the shared_captures Supabase table.
 */

import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import type { Capture } from "@/types/brain";
import type { AIProcessedData } from "@/types/brain";

export interface ShareResult {
  token: string;
  url: string;
}

/** Generate a short random URL-safe token */
function makeToken(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Share a capture — inserts into shared_captures and returns the public URL.
 * Falls back to clipboard copy of raw text if Supabase is unavailable.
 */
export async function shareCapture(capture: Capture): Promise<ShareResult | null> {
  if (!isSupabaseEnabled) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ai = capture.ai_data as AIProcessedData | null;
  const title = ai?.title || capture.raw_input.slice(0, 80);
  const token = makeToken();

  const { error } = await supabase.from("shared_captures").insert({
    token,
    user_id: user.id,
    capture_json: capture as unknown as Record<string, unknown>,
    title,
  });

  if (error) throw new Error(error.message);

  const url = `${window.location.origin}/share/${token}`;
  return { token, url };
}

/** Revoke all shares for a given capture (delete by token list) */
export async function revokeShare(token: string): Promise<void> {
  if (!isSupabaseEnabled) return;
  await supabase.from("shared_captures").delete().eq("token", token);
}

/** Look up a shared capture by its token (public, no auth required) */
export async function getSharedCapture(token: string): Promise<{ capture: Capture; title: string } | null> {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from("shared_captures")
    .select("capture_json, title")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return {
    capture: data.capture_json as unknown as Capture,
    title: data.title ?? "",
  };
}
