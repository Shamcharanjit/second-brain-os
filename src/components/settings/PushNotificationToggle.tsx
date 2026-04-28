/**
 * PushNotificationToggle
 *
 * Settings panel section that lets authenticated users enable / disable
 * browser push notifications for daily review reminders.
 *
 * States handled:
 *   unsupported  — browser doesn't support Push API (hidden)
 *   loading      — checking subscription state (spinner)
 *   unsubscribed — CTA to enable
 *   subscribed   — green checkmark + disable button
 *   denied       — link to browser settings with explanation
 */

import { Bell, BellOff, BellRing, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function PushNotificationToggle() {
  const { user } = useAuth();
  const { state, subscribe, unsubscribe } = usePushNotifications();

  // Hide on unsupported browsers or non-logged-in users
  if (state === "unsupported" || !user) return null;

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) toast.success("Review reminders enabled!");
    else if (Notification.permission === "denied")
      toast.error("Notifications are blocked — update your browser settings.");
    else
      toast.error("Couldn't enable notifications. Please try again.");
  };

  const handleDisable = async () => {
    await unsubscribe();
    toast.success("Push notifications disabled.");
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 mt-0.5 ${
          state === "subscribed" ? "bg-primary/10" : "bg-muted"
        }`}>
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : state === "subscribed" ? (
            <BellRing className="h-4 w-4 text-primary" />
          ) : state === "denied" ? (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Daily Review Reminders</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {state === "subscribed"
              ? "You'll receive a push notification when your daily review is due (after 2pm)."
              : state === "denied"
              ? "Notifications are blocked in your browser."
              : "Get a push notification each afternoon when your daily review is ready."}
          </p>
          {state === "denied" && (
            <a
              href="https://support.google.com/chrome/answer/3220216"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
            >
              How to unblock notifications <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {state === "loading" ? null : state === "subscribed" ? (
          <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleDisable}>
            <BellOff className="h-3 w-3" /> Disable
          </Button>
        ) : state === "denied" ? null : (
          <Button size="sm" className="text-xs h-8 gap-1.5" onClick={handleEnable}>
            <Bell className="h-3 w-3" /> Enable
          </Button>
        )}
      </div>
    </div>
  );
}
