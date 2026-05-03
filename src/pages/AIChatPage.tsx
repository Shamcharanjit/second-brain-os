/**
 * AIChatPage — Conversational AI over the user's second brain.
 * Route: /ai-chat
 *
 * Sends the user's message + rolling history to the brain-chat edge function.
 * Context is built server-side from their Supabase data.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BrainCircuit, Send, Loader2, Bot, User, Sparkles, Trash2,
  MessageSquare, ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
}

const STARTER_QUESTIONS = [
  "What were my goals this week?",
  "Any tasks related to fundraising?",
  "What ideas did I capture recently?",
  "Which projects need attention?",
  "Summarise what I captured today",
  "What's on my plate for work right now?",
];

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!user || !isSupabaseEnabled) {
      toast.error("Sign in to use AI Chat.");
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim(), ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");

      const botMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: data.reply, ts: new Date().toISOString() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err.message || "Could not get a response.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, user, messages]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-h-[780px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Brain Chat</h1>
            <p className="text-xs text-muted-foreground">Ask anything about your captures, projects, and memories</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => setMessages([])}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto">
                <BrainCircuit className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold">Your second brain is listening</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Ask questions across your captures, projects, memories, and ideas. I'll search through your actual data.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left rounded-xl border bg-card px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-50" />
                  {q}
                </button>
              ))}
            </div>
            {!user && (
              <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">Sign in to use AI Chat — your data needs to be synced for context-aware responses.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary" : "bg-muted border"}`}>
                  {m.role === "user"
                    ? <User className="h-3.5 w-3.5 text-primary-foreground" />
                    : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className={`max-w-[80%] space-y-1 ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border rounded-tl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1">{formatTime(m.ts)}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted border">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-card border px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your brain anything…"
            disabled={loading}
            className="flex-1 h-10"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-10 w-10 p-0 shrink-0" disabled={!input.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
          Powered by Gemini · Reads your synced captures, projects, and memories
        </p>
      </div>
    </div>
  );
}
