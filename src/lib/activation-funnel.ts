/**
 * Activation Funnel Event Logger
 * 
 * Idempotent event logging for the activation funnel.
 * Events are fire-and-forget — failures are logged but never block the UI.
 */
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";

export type FunnelEventType =
  | "waitlist_signed_up"
  | "waitlist_email_sent"
  | "approval_email_sent"
  | "invite_link_opened"
  | "invite_token_validated"
  | "password_set"
  | "activation_completed"
  | "first_login"
  | "first_capture_created"
  | "first_project_created"
  | "first_memory_created"
  | "second_session_returned"
  | "day2_retained"
  | "day7_retained";

// Events that should only be logged once per user
const ONCE_PER_USER_EVENTS: Set<FunnelEventType> = new Set([
  "first_login",
  "first_capture_created",
  "first_project_created",
  "first_memory_created",
  "second_session_returned",
  "day2_retained",
  "day7_retained",
]);

// In-memory dedup for the current session to avoid redundant DB calls
const loggedThisSession = new Set<string>();

function dedupKey(userId: string | null, email: string | null, event: FunnelEventType): string {
  return `${userId || ""}:${email || ""}:${event}`;
}

/**
 * Log an activation funnel event. Fire-and-forget.
 * For ONCE_PER_USER events, uses ON CONFLICT to ensure idempotency.
 */
export async function logFunnelEvent(
  eventType: FunnelEventType,
  opts: {
    userId?: string | null;
    email?: string | null;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  if (!isSupabaseEnabled) return;

  const { userId = null, email = null, source = null, metadata = {} } = opts;
  const key = dedupKey(userId, email, eventType);

  // Session-level dedup for once-per-user events
  if (ONCE_PER_USER_EVENTS.has(eventType) && loggedThisSession.has(key)) {
    return;
  }

  try {
    const row: Record<string, unknown> = {
      event_type: eventType,
      event_source: source,
      metadata,
    };
    if (userId) row.user_id = userId;
    if (email) row.waitlist_signup_email = email;

    // For once-per-user events, check existence first to avoid unique constraint errors
    if (ONCE_PER_USER_EVENTS.has(eventType) && userId) {
      const { data: existing } = await supabase
        .from("activation_funnel_events" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("event_type", eventType)
        .limit(1);
      if (existing && existing.length > 0) {
        loggedThisSession.add(key);
        return;
      }
    }

    const { error } = await supabase
      .from("activation_funnel_events" as any)
      .insert(row as any);

    if (error) {
      // Unique constraint violation = already logged, that's fine
      if (error.code === "23505") {
        loggedThisSession.add(key);
        return;
      }
      console.error(`[funnel] Failed to log ${eventType}:`, error.message);
    } else {
      loggedThisSession.add(key);
    }
  } catch (err) {
    console.error(`[funnel] Exception logging ${eventType}:`, err);
  }
}

/**
 * Log an event from an edge function (service role context).
 * This is a helper for copy-pasting into edge functions.
 */
export function buildFunnelInsertSQL(
  eventType: FunnelEventType,
  userId: string | null,
  email: string | null,
  source: string
): string {
  const userClause = userId ? `'${userId}'` : "NULL";
  const emailClause = email ? `'${email}'` : "NULL";
  return `INSERT INTO public.activation_funnel_events (event_type, user_id, waitlist_signup_email, event_source) VALUES ('${eventType}', ${userClause}, ${emailClause}, '${source}') ON CONFLICT DO NOTHING;`;
}
