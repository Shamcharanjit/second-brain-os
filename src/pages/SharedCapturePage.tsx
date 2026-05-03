/**
 * SharedCapturePage — Public read-only view of a shared capture.
 * Route: /share/:token  (no auth required)
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSharedCapture } from "@/lib/sharing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import type { Capture } from "@/types/brain";
import type { AIProcessedData } from "@/types/brain";
import {
  BrainCircuit, Tag, Clock, ArrowRight, AlertTriangle,
  Loader2, ExternalLink,
} from "lucide-react";

export default function SharedCapturePage() {
  const { token } = useParams<{ token: string }>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    getSharedCapture(token).then((result) => {
      if (!result) { setNotFound(true); }
      else { setCapture(result.capture); setTitle(result.title); }
      setLoading(false);
    });
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <InsightHaloLogo size="sm" />
          </Link>
          <Link to="/auth">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Start capturing
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/20" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Share link not found</p>
              <p className="text-sm text-muted-foreground">This link may have expired or been revoked.</p>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">Go to InsightHalo</Button>
            </Link>
          </div>
        )}

        {!loading && capture && (() => {
          const ai = capture.ai_data as AIProcessedData | null;
          return (
            <div className="space-y-6">
              {/* Card */}
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                {/* Top accent strip */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-[hsl(var(--brain-teal))] to-[hsl(var(--brain-purple))]" />

                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl font-bold tracking-tight leading-snug">
                        {title || ai?.title || "Shared capture"}
                      </h1>
                      {ai?.why_it_matters && (
                        <p className="text-sm text-muted-foreground mt-1 italic">{ai.why_it_matters}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {ai?.category && (
                      <Badge variant="secondary" className="text-xs capitalize">{ai.category}</Badge>
                    )}
                    {ai?.urgency && (
                      <Badge variant="outline" className="text-xs capitalize">{ai.urgency} urgency</Badge>
                    )}
                    {ai?.priority_score != null && (
                      <Badge variant="outline" className="text-xs">Priority {ai.priority_score}/100</Badge>
                    )}
                  </div>

                  {/* Raw input */}
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{capture.raw_input}</p>
                  </div>

                  {/* Next action */}
                  {ai?.next_action && (
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <ArrowRight className="h-4 w-4 shrink-0" />
                      <span>{ai.next_action}</span>
                    </div>
                  )}

                  {/* Due date */}
                  {ai?.due_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Due: {ai.due_date}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {ai?.tags && ai.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      {ai.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-[10px] text-muted-foreground/60">
                    Captured {new Date(capture.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center space-y-3">
                <p className="text-sm font-medium">Build your own second brain</p>
                <p className="text-xs text-muted-foreground">InsightHalo helps you capture, organise, and act on your ideas with AI.</p>
                <Link to="/auth">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <BrainCircuit className="h-3.5 w-3.5" /> Start for free
                  </Button>
                </Link>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
