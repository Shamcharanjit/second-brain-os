import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldX, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-invite-token", {
          body: { token },
        });
        if (error || !data?.valid || !data?.email) {
          setStatus("invalid");
          return;
        }
        // Valid token — redirect to auth with prefilled email
        navigate(`/auth?email=${encodeURIComponent(data.email)}&invite=true`, { replace: true });
      } catch {
        setStatus("invalid");
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Brain className="h-10 w-10 text-primary mx-auto" />
        {status === "loading" ? (
          <>
            <h1 className="text-xl font-bold tracking-tight">Verifying your invite…</h1>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          </>
        ) : (
          <>
            <ShieldX className="h-8 w-8 text-destructive mx-auto" />
            <h1 className="text-xl font-bold tracking-tight">Invalid Invite Link</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has expired.
              Join the waitlist to request access.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/waitlist")}>Join the Waitlist</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs text-muted-foreground">
                Back to home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
