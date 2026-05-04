/**
 * useSemanticSearch
 *
 * Hook for semantic / AI-powered memory search.
 *
 * Flow:
 *   1. Client calls the generate-embedding edge function to get a query vector.
 *   2. Calls the search_memories_semantic RPC with that vector.
 *   3. Returns results ranked by cosine similarity.
 *
 * Falls back to empty results (no error) when:
 *   - User is not logged in
 *   - GEMINI_API_KEY is not set in the edge function
 *   - pgvector extension not enabled yet
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SemanticResult {
  id: string;
  title: string;
  raw_text: string;
  summary: string | null;
  memory_type: string;
  importance_score: number;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  similarity: number;
}

interface UseSemanticSearchReturn {
  results: SemanticResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

const EDGE_FN = "generate-embedding";

export function useSemanticSearch(): UseSemanticSearchReturn {
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce: cancel stale searches
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }

    // Cancel any in-flight search
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // 1. Get the current session token for the edge function call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 2. Generate query embedding via edge function
      // We pass a throwaway memory_id — the edge function only uses the text
      // for embedding and doesn't actually update any row when memory_id = "query"
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "generate-embedding-query",
        {
          body: { text: q },
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (fnError || !fnData?.embedding) {
        // Silently fail — maybe edge function not deployed yet
        setResults([]);
        setLoading(false);
        return;
      }

      const embedding: number[] = fnData.embedding;

      // 3. Run semantic search RPC
      const { data: rows, error: rpcError } = await supabase.rpc("search_memories_semantic", {
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 20,
        similarity_threshold: 0.35,
      });

      if (rpcError) {
        // Likely pgvector not enabled yet — fail gracefully
        console.warn("Semantic search RPC error:", rpcError.message);
        setResults([]);
      } else {
        setResults((rows as SemanticResult[]) ?? []);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Semantic search unavailable");
        console.warn("useSemanticSearch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    abortRef.current?.abort();
  }, []);

  return { results, loading, error, search, clear };
}
